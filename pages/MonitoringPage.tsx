import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, Clock,
  ChevronDown, ChevronRight, RefreshCw, Shield,
  Server, Zap,
} from 'lucide-react';
import api from '../services/api';

interface Script {
  name: string;
  schedule: string;
  status: string;
  lines: number;
  errors: number;
  errorSamples: string[];
  icon: string;
}

interface ServiceInfo {
  name: string;
  active: boolean;
}

interface Incident {
  id: number;
  reportId: number;
  scriptName: string;
  errorMessage: string;
  occurredAt: string;
  resolved: boolean;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  preventionNotes: string | null;
}

interface Report {
  id: number;
  reportDate: string;
  generatedAt: string;
  services: ServiceInfo[];
  scripts: Script[];
  n8n: { running?: boolean; errors?: number; samples?: string[] };
  summary: { ok?: number; warn?: number; fail?: number; skip?: number };
  incidents: Incident[];
}

type TabView = 'overview' | 'incidents' | 'history';

function statusIcon(status: string) {
  if (status.includes('OK')) return <CheckCircle2 size={14} className="text-green-500" />;
  if (status.includes('erro') || status.includes('Sem confirmação')) return <XCircle size={14} className="text-red-500" />;
  if (status.includes('Sem atividade') || status.includes('Log não')) return <AlertTriangle size={14} className="text-amber-500" />;
  if (status.includes('N/A')) return <Clock size={14} className="text-slate-400" />;
  return <Clock size={14} className="text-slate-400" />;
}

function statusBg(status: string) {
  if (status.includes('OK')) return 'bg-green-50';
  if (status.includes('erro') || status.includes('Sem confirmação')) return 'bg-red-50';
  if (status.includes('Sem atividade') || status.includes('Log não')) return 'bg-amber-50';
  return '';
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

const MonitoringPage: React.FC = () => {
  const [tab, setTab] = useState<TabView>('overview');
  const [report, setReport] = useState<Report | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [preventionNotes, setPreventionNotes] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<'all' | 'open' | 'resolved'>('open');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [latestRes, incidentsRes] = await Promise.all([
        api.get('/monitoring/latest'),
        api.get('/monitoring/incidents'),
      ]);
      setReport(latestRes.data);
      setIncidents(incidentsRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar monitoramento:', err);
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/monitoring/reports?limit=30');
      setReports(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tab === 'history' && reports.length === 0) fetchHistory();
  }, [tab]);

  const handleResolve = async (id: number) => {
    try {
      await api.patch(`/monitoring/incidents/${id}/resolve`, {
        resolutionNotes,
        preventionNotes,
      });
      setResolvingId(null);
      setResolutionNotes('');
      setPreventionNotes('');
      fetchData();
    } catch (err) {
      console.error('Erro ao resolver:', err);
    }
  };

  const handleUnresolve = async (id: number) => {
    try {
      await api.patch(`/monitoring/incidents/${id}/unresolve`);
      fetchData();
    } catch (err) {
      console.error('Erro ao reabrir:', err);
    }
  };

  const filteredIncidents = useMemo(() => {
    if (incidentFilter === 'open') return incidents.filter(i => !i.resolved);
    if (incidentFilter === 'resolved') return incidents.filter(i => i.resolved);
    return incidents;
  }, [incidents, incidentFilter]);

  const openCount = incidents.filter(i => !i.resolved).length;

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Activity size={20} className="text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Monitoramento do Sistema</h1>
            <p className="text-sm text-slate-500">
              Status operacional e incidentes
              {report && <span className="ml-2 text-xs text-slate-400">· Atualizado {formatDate(report.generatedAt)}</span>}
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="OK" value={report.summary.ok || 0} color="green" icon={<CheckCircle2 size={16} />} />
          <SummaryCard label="Alertas" value={report.summary.warn || 0} color="amber" icon={<AlertTriangle size={16} />} />
          <SummaryCard label="Falhas" value={report.summary.fail || 0} color="red" icon={<XCircle size={16} />} />
          <SummaryCard label="N/A" value={report.summary.skip || 0} color="slate" icon={<Clock size={16} />} />
          <SummaryCard label="Incidentes Abertos" value={openCount} color={openCount > 0 ? 'red' : 'green'} icon={<Shield size={16} />} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['overview', 'incidents', 'history'] as TabView[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'overview' && 'Visão Geral'}
            {t === 'incidents' && `Incidentes${openCount > 0 ? ` (${openCount})` : ''}`}
            {t === 'history' && 'Histórico'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && report && (
        <div className="space-y-4">
          {/* Services */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Server size={14} /> Serviços
            </h3>
            <div className="flex flex-wrap gap-3">
              {report.services.map((svc, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  svc.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${svc.active ? 'bg-green-500' : 'bg-red-500'}`} />
                  {svc.name}
                </div>
              ))}
              {report.n8n && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  report.n8n.running !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  <Zap size={12} />
                  n8n {report.n8n.errors ? `(${report.n8n.errors} erros)` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Scripts table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">Scripts Monitorados</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase">Script</th>
                    <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase">Horário</th>
                    <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase">Status</th>
                    <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase text-right">Linhas</th>
                    <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase text-right">Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {report.scripts.map((s, i) => (
                    <React.Fragment key={i}>
                      <tr
                        className={`border-b border-slate-50 ${statusBg(s.status)} ${
                          s.errorSamples?.length ? 'cursor-pointer hover:bg-slate-50' : ''
                        }`}
                        onClick={() => s.errorSamples?.length && setExpandedScript(expandedScript === s.name ? null : s.name)}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-800 flex items-center gap-2">
                          {s.errorSamples?.length ? (
                            expandedScript === s.name ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
                          ) : <span className="w-3.5" />}
                          {s.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{s.schedule}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            {statusIcon(s.status)}
                            <span className="text-xs font-medium">{s.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{s.lines}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${s.errors > 0 ? 'text-red-600' : 'text-slate-400'}`}>{s.errors}</td>
                      </tr>
                      {expandedScript === s.name && s.errorSamples?.length > 0 && (
                        <tr className="bg-red-50">
                          <td colSpan={5} className="px-6 py-3">
                            <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap break-all">
                              {s.errorSamples.join('\n')}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['open', 'resolved', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setIncidentFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                  incidentFilter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f === 'open' && 'Abertos'}
                {f === 'resolved' && 'Resolvidos'}
                {f === 'all' && 'Todos'}
              </button>
            ))}
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <CheckCircle2 size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Nenhum incidente {incidentFilter === 'open' ? 'aberto' : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map(inc => (
                <div key={inc.id} className={`bg-white rounded-xl border p-4 ${inc.resolved ? 'border-green-200' : 'border-red-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {inc.resolved
                          ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                          : <XCircle size={14} className="text-red-500 shrink-0" />
                        }
                        <span className="text-sm font-bold text-slate-800">{inc.scriptName}</span>
                        <span className="text-xs text-slate-400">{formatDateShort(inc.occurredAt)}</span>
                      </div>
                      <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap break-all mt-1 bg-slate-50 rounded-lg p-2">
                        {inc.errorMessage}
                      </pre>
                      {inc.resolved && inc.resolutionNotes && (
                        <div className="mt-2 bg-green-50 rounded-lg p-2">
                          <p className="text-xs font-bold text-green-700 mb-0.5">Resolução:</p>
                          <p className="text-xs text-green-600">{inc.resolutionNotes}</p>
                        </div>
                      )}
                      {inc.resolved && inc.preventionNotes && (
                        <div className="mt-1 bg-blue-50 rounded-lg p-2">
                          <p className="text-xs font-bold text-blue-700 mb-0.5">Prevenção:</p>
                          <p className="text-xs text-blue-600">{inc.preventionNotes}</p>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      {inc.resolved ? (
                        <button
                          onClick={() => handleUnresolve(inc.id)}
                          className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                        >
                          Reabrir
                        </button>
                      ) : resolvingId === inc.id ? null : (
                        <button
                          onClick={() => setResolvingId(inc.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          Resolver
                        </button>
                      )}
                    </div>
                  </div>
                  {resolvingId === inc.id && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                      <div>
                        <label className="text-xs font-bold text-slate-600">O que foi feito para resolver?</label>
                        <textarea
                          value={resolutionNotes}
                          onChange={e => setResolutionNotes(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                          rows={2}
                          placeholder="Ex: Corrigido import faltante no alerta_dra.py"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600">Como prevenir no futuro?</label>
                        <textarea
                          value={preventionNotes}
                          onChange={e => setPreventionNotes(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                          rows={2}
                          placeholder="Ex: Adicionar teste de imports no CI"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(inc.id)}
                          className="px-4 py-2 text-xs font-bold bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          Confirmar Resolução
                        </button>
                        <button
                          onClick={() => { setResolvingId(null); setResolutionNotes(''); setPreventionNotes(''); }}
                          className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase">Data</th>
                <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase text-center">OK</th>
                <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase text-center">Alertas</th>
                <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase text-center">Falhas</th>
                <th className="px-4 py-2 font-semibold text-slate-500 text-xs uppercase text-center">Incidentes</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => {
                const unresolved = r.incidents.filter(i => !i.resolved).length;
                return (
                  <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 ${(r.summary.fail || 0) > 0 ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{formatDateShort(r.reportDate)}</td>
                    <td className="px-4 py-2.5 text-center text-green-600 font-medium">{r.summary.ok || 0}</td>
                    <td className="px-4 py-2.5 text-center text-amber-600 font-medium">{r.summary.warn || 0}</td>
                    <td className="px-4 py-2.5 text-center text-red-600 font-bold">{r.summary.fail || 0}</td>
                    <td className="px-4 py-2.5 text-center">
                      {unresolved > 0
                        ? <span className="text-red-600 font-bold">{unresolved} aberto{unresolved > 1 ? 's' : ''}</span>
                        : <span className="text-green-500 text-xs">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Nenhum relatório encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-600 border-green-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    slate: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.slate}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

export default MonitoringPage;
