import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dosesApi, patientsApi, treatmentsApi, protocolsApi } from '../services/api';
import { Loader2, AlertCircle, TrendingUp, Star, MessageSquare, Clock, CheckCircle2, Users, ThumbsUp, ThumbsDown, Minus, Send, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dose, DoseStatus, SurveyStatus, PatientFull, Treatment, Protocol } from '../types';
import { getAuthToken } from '../services/api';
import { formatDate, SURVEY_STATUS_LABELS } from '../constants';

const SurveyPage: React.FC = () => {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [answeredPage, setAnsweredPage] = useState(1);
  const ANSWERS_PER_PAGE = 15;

  const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

  const handleResend = async (doseId: string) => {
    if (!confirm('Reenviar pesquisa de satisfação via WhatsApp?')) return;
    setActionLoading(doseId);
    try {
      const res = await fetch(`${API}/nursing/resend-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ doseId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro'); }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao reenviar');
    }
    setActionLoading(null);
  };

  const handleMarkNotAnswered = async (doseId: string) => {
    if (!confirm('Marcar como não respondeu?')) return;
    setActionLoading(doseId);
    try {
      const res = await fetch(`${API}/nursing/mark-not-answered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ doseId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro'); }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar');
    }
    setActionLoading(null);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dosesRes, patientsRes, treatmentsRes, protocolsRes] = await Promise.all([
        dosesApi.getAll({ limit: 1000 }),
        patientsApi.getAll({ limit: 1000 }),
        treatmentsApi.getAll({ limit: 1000 }),
        protocolsApi.getAll(),
      ]);
      setDoses(dosesRes.data || []);
      setPatients(patientsRes.data || []);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const nurseDoses = useMemo(() => doses.filter(d => d.nurse === true && d.purchased === true && (d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE)), [doses]);

  const answered = useMemo(() =>
    nurseDoses.filter(d => d.surveyStatus === SurveyStatus.ANSWERED && d.surveyScore != null)
      .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()),
    [nurseDoses]
  );

  const pending = useMemo(() =>
    nurseDoses.filter(d =>
      d.surveyStatus === SurveyStatus.WAITING ||
      d.surveyStatus === SurveyStatus.SENT ||
      d.surveyStatus === SurveyStatus.NOT_SENT
    ).sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()),
    [nurseDoses]
  );

  const notAnswered = useMemo(() =>
    nurseDoses.filter(d => d.surveyStatus === SurveyStatus.NOT_ANSWERED),
    [nurseDoses]
  );

  // NPS: Promoters (9-10), Passives (7-8), Detractors (0-6)
  const npsData = useMemo(() => {
    if (answered.length === 0) return { nps: 0, promoters: 0, passives: 0, detractors: 0, total: 0 };
    let promoters = 0, passives = 0, detractors = 0;
    for (const d of answered) {
      const s = d.surveyScore!;
      if (s >= 9) promoters++;
      else if (s >= 7) passives++;
      else detractors++;
    }
    const total = answered.length;
    const nps = Math.round(((promoters - detractors) / total) * 100);
    return { nps, promoters, passives, detractors, total };
  }, [answered]);

  const avgScore = useMemo(() => {
    if (answered.length === 0) return 0;
    const sum = answered.reduce((acc, d) => acc + (d.surveyScore || 0), 0);
    return Number((sum / answered.length).toFixed(1));
  }, [answered]);

  const responseRate = useMemo(() => {
    const totalSent = answered.length + notAnswered.length;
    if (totalSent === 0) return 0;
    return Math.round((answered.length / totalSent) * 100);
  }, [answered, notAnswered]);

  const getPatient = (treatmentId: string) => {
    const t = treatments.find(tr => tr.id === treatmentId);
    return t ? patients.find(p => p.id === t.patientId) : null;
  };

  const getProtocol = (treatmentId: string) => {
    const t = treatments.find(tr => tr.id === treatmentId);
    return t ? protocols.find(p => p.id === t.protocolId) : null;
  };

  const getNpsColor = (nps: number) => {
    if (nps >= 75) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Excelente' };
    if (nps >= 50) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Muito bom' };
    if (nps >= 0) return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Bom' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Precisa melhorar' };
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'bg-emerald-500';
    if (score >= 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 9) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (score >= 7) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  };

  // Score distribution for bar chart
  const distribution = useMemo(() => {
    const dist = Array(11).fill(0);
    for (const d of answered) {
      if (d.surveyScore != null) dist[d.surveyScore]++;
    }
    const max = Math.max(...dist, 1);
    return dist.map((count, score) => ({ score, count, pct: (count / max) * 100 }));
  }, [answered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando pesquisas...</span>
      </div>
    );
  }

  const npsStyle = getNpsColor(npsData.nps);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <TrendingUp size={28} className="mr-3 text-pink-600" />
          Satisfacao — Enfermagem
        </h1>
        <p className="text-slate-500 mt-1">
          Painel de satisfação dos atendimentos de enfermagem domiciliar.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NPS */}
        <div className={`rounded-xl border-2 ${npsStyle.border} ${npsStyle.bg} p-5`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">NPS</span>
            <TrendingUp size={16} className={npsStyle.text} />
          </div>
          <div className={`text-3xl font-black ${npsStyle.text}`}>{npsData.total > 0 ? npsData.nps : '—'}</div>
          <div className={`text-xs font-medium mt-1 ${npsStyle.text}`}>{npsData.total > 0 ? npsStyle.label : 'Sem dados'}</div>
        </div>

        {/* Average Score */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Media</span>
            <Star size={16} className="text-yellow-500" />
          </div>
          <div className="text-3xl font-black text-slate-800">{answered.length > 0 ? avgScore : '—'}</div>
          <div className="text-xs text-slate-400 mt-1">de 10</div>
        </div>

        {/* Response Rate */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taxa Resposta</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-800">{(answered.length + notAnswered.length) > 0 ? responseRate + '%' : '—'}</div>
          <div className="text-xs text-slate-400 mt-1">{answered.length} de {answered.length + notAnswered.length}</div>
        </div>

        {/* Pending */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aguardando</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-800">{pending.length}</div>
          <div className="text-xs text-slate-400 mt-1">pesquisas pendentes</div>
        </div>
      </div>

      {/* NPS Breakdown + Distribution */}
      {npsData.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* NPS Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Composicao NPS</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ThumbsUp size={16} className="text-emerald-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-600">Promotores (9-10)</span>
                    <span className="text-sm font-bold text-emerald-600">{npsData.promoters}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${npsData.total > 0 ? (npsData.promoters / npsData.total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Minus size={16} className="text-yellow-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-600">Neutros (7-8)</span>
                    <span className="text-sm font-bold text-yellow-600">{npsData.passives}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${npsData.total > 0 ? (npsData.passives / npsData.total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThumbsDown size={16} className="text-red-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-600">Detratores (0-6)</span>
                    <span className="text-sm font-bold text-red-600">{npsData.detractors}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${npsData.total > 0 ? (npsData.detractors / npsData.total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Score Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Distribuicao de Notas</h3>
            <div className="flex items-end gap-1.5 h-32">
              {distribution.map(({ score, count, pct }) => (
                <div key={score} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-500">{count > 0 ? count : ''}</span>
                  <div
                    className={`w-full rounded-t ${count > 0 ? getScoreColor(score) : 'bg-slate-100'} transition-all`}
                    style={{ height: `${Math.max(pct, count > 0 ? 8 : 2)}%`, opacity: count > 0 ? 1 : 0.4 }}
                  />
                  <span className="text-xs text-slate-400">{score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending List */}
      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Clock size={18} className="text-slate-400" />
              Aguardando Resposta ({pending.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pending.map(dose => {
              const patient = getPatient(dose.treatmentId);
              const protocol = getProtocol(dose.treatmentId);
              return (
                <div key={dose.id} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Clock size={16} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700 text-sm">
                      {patient ? (
                        <Link to={`/pacientes/${patient.id}`} className="hover:text-pink-600 transition-colors">{patient.fullName}</Link>
                      ) : '—'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatDate(dose.applicationDate)} {protocol ? `· ${protocol.name}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                      {SURVEY_STATUS_LABELS[dose.surveyStatus]}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResend(dose.id); }}
                      disabled={actionLoading === dose.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === dose.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Reenviar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkNotAnswered(dose.id); }}
                      disabled={actionLoading === dose.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={12} />
                      Nao respondeu
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback List - Answered */}
      {answered.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              Avaliacoes Recebidas ({answered.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {answered.slice((answeredPage - 1) * ANSWERS_PER_PAGE, answeredPage * ANSWERS_PER_PAGE).map(dose => {
              const patient = getPatient(dose.treatmentId);
              const protocol = getProtocol(dose.treatmentId);
              const badge = getScoreBadge(dose.surveyScore!);
              return (
                <div key={dose.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Score circle */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getScoreColor(dose.surveyScore!)} text-white font-black text-lg`}>
                      {dose.surveyScore}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {patient ? (
                          <Link to={`/pacientes/${patient.id}`} className="font-semibold text-slate-800 hover:text-pink-600 transition-colors">
                            {patient.fullName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-800">Paciente</span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {dose.surveyScore! >= 9 ? 'Promotor' : dose.surveyScore! >= 7 ? 'Neutro' : 'Detrator'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>{formatDate(dose.applicationDate)}</span>
                        {protocol && <span>{protocol.name}</span>}
                      </div>
                      {dose.surveyComment && (
                        <div className="mt-2 flex items-start gap-2">
                          <MessageSquare size={14} className="text-slate-300 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-600 italic leading-relaxed">"{dose.surveyComment}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          {answered.length > ANSWERS_PER_PAGE && (
            <div className="flex items-center justify-center gap-3 py-3 border-t border-slate-100">
              <button
                onClick={() => setAnsweredPage(p => Math.max(1, p - 1))}
                disabled={answeredPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <span className="text-xs text-slate-500">
                {answeredPage} de {Math.ceil(answered.length / ANSWERS_PER_PAGE)}
              </span>
              <button
                onClick={() => setAnsweredPage(p => Math.min(Math.ceil(answered.length / ANSWERS_PER_PAGE), p + 1))}
                disabled={answeredPage >= Math.ceil(answered.length / ANSWERS_PER_PAGE)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Proxima
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {answered.length === 0 && pending.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Star size={40} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhuma pesquisa registrada</h3>
          <p className="text-slate-400 text-sm">
            As pesquisas de satisfação serão enviadas automaticamente 24h após a enfermeira confirmar a aplicação.
          </p>
        </div>
      )}
    </div>
  );
};

export default SurveyPage;
