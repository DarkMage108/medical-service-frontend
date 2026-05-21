import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { dosesApi, patientsApi, treatmentsApi, protocolsApi, dismissedLogsApi, settingsApi, diagnosesApi } from '../services/api';
import { Syringe, Loader2, AlertCircle, MessageSquare, ChevronRight, X, Clock, Send, BellOff } from 'lucide-react';
import { Dose, DoseStatus, PaymentStatus, PatientFull, Treatment, Protocol, MessageTemplateTrigger, DismissedLog, TreatmentStatus, ProtocolCategory } from '../types';
import { formatDate, diffInDays, addDays, DOSE_STATUS_LABELS, PAYMENT_STATUS_LABELS, getDiagnosisColor } from '../constants';
import MessagePopup from '../components/ui/MessagePopup';

const buildContactId = (doseId: string, trigger: MessageTemplateTrigger) =>
  `dose_${doseId}_${trigger.toLowerCase()}`;

type AdherenceLevel = 'BOA' | 'PARCIAL' | 'RUIM' | 'ABANDONO';

function classifyAdherence(
  treatment: Treatment,
  treatmentDoses: Dose[],
  protocol: Protocol | undefined,
  today: Date,
  settings: Record<string, number>
): AdherenceLevel {
  // X = atraso max para BOA, Y = max doses atrasadas para PARCIAL,
  // Z = atraso min para RUIM, W = dias sem aplicação para ABANDONO
  const X = settings.adherence_max_delay_good || 7;
  const Y = settings.adherence_max_late_doses_partial || 3;
  const Z = settings.adherence_min_delay_bad || 7;
  const W = settings.adherence_abandonment_days || 30;

  const frequencyDays = protocol?.frequencyDays || 28;
  const startDate = addDays(treatment.startDate, 0);
  const planned = treatment.plannedDosesBeforeConsult || 1;

  // ABANDONO: ultima dose do plano não aplicada e excedeu W dias
  const lastScheduledDate = addDays(startDate, frequencyDays * (planned - 1));
  const daysSinceLastScheduled = diffInDays(today, lastScheduledDate);
  const appliedCount = treatmentDoses.filter(
    d => d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE
  ).length;
  if (daysSinceLastScheduled > W && appliedCount < planned) {
    return 'ABANDONO';
  }

  // Contar doses com atraso > X e > Z (dose 1 não entra no calculo)
  let lateDosesOverX = 0;
  let lateDosesOverZ = 0;
  for (let i = 1; i < planned; i++) {
    const cycleNumber = i + 1;
    const scheduledDate = addDays(startDate, frequencyDays * i);
    const daysPastSchedule = diffInDays(today, scheduledDate);
    if (daysPastSchedule < 0) continue;

    const applied = treatmentDoses.find(d =>
      d.cycleNumber === cycleNumber &&
      (d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE)
    );

    let delay = 0;
    if (applied && applied.applicationDate) {
      delay = diffInDays(new Date(applied.applicationDate), scheduledDate);
    } else {
      delay = daysPastSchedule;
    }

    if (delay > X) lateDosesOverX++;
    if (delay > Z) lateDosesOverZ++;
  }

  // RUIM: mais de Y doses com atraso superior a Z dias
  if (lateDosesOverZ > Y) return 'RUIM';
  // PARCIAL: de 2 a Y doses com atraso superior a X dias
  if (lateDosesOverX >= 2) return 'PARCIAL';
  // BOA: todas as doses com atraso < X dias
  return 'BOA';
}

const ADHERENCE_STYLES: Record<AdherenceLevel, string> = {
  BOA: 'bg-green-100 text-green-700',
  PARCIAL: 'bg-yellow-100 text-yellow-700',
  RUIM: 'bg-orange-100 text-orange-700',
  ABANDONO: 'bg-red-100 text-red-700',
};

const DosesPage: React.FC = () => {
  const location = useLocation();
  const initialFilter = (location.state as any)?.filter as string | undefined;

  const [doses, setDoses] = useState<Dose[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [dismissedSet, setDismissedSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'overdue' | 'upcoming' | 'to-deliver' | 'to-pay' | 'unanswered' | 'all'>(
    (initialFilter as any) || 'overdue'
  );
  const [adherenceSettings, setAdherenceSettings] = useState<Record<string, number>>({});

  const [popupPatient, setPopupPatient] = useState<PatientFull | null>(null);
  const [popupTreatmentId, setPopupTreatmentId] = useState<string | null>(null);
  const [popupDoseId, setPopupDoseId] = useState<string | undefined>(undefined);
  const [popupTrigger, setPopupTrigger] = useState<MessageTemplateTrigger>(MessageTemplateTrigger.NEXT_DOSE);
  const [popupContactId, setPopupContactId] = useState<string>('');

  const [dismissTarget, setDismissTarget] = useState<{ contactId: string; patientName: string } | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    if (!dismissTarget) return;
    setIsDismissing(true);
    try {
      await dismissedLogsApi.dismiss(dismissTarget.contactId);
      setDismissedSet(prev => new Set([...prev, dismissTarget.contactId]));
      setDismissTarget(null);
    } catch (err: any) {
      alert('Erro ao remover: ' + (err.message || 'tente novamente'));
    } finally {
      setIsDismissing(false);
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dosesRes, patientsRes, treatmentsRes, protocolsRes, dismissedRes, settingsRes, diagnosesRes] = await Promise.all([
        dosesApi.getAll({ limit: 1000 }),
        patientsApi.getAll({ limit: 1000 }),
        treatmentsApi.getAll({ limit: 1000 }),
        protocolsApi.getAll(),
        dismissedLogsApi.getAll(),
        settingsApi.getAll(),
        diagnosesApi.getAll(),
      ]);
      setDoses(dosesRes.data || []);
      setPatients(patientsRes.data || []);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setDiagnoses(diagnosesRes.data || []);
      const ids = (dismissedRes.data as DismissedLog[] || []).map(d => d.contactId);
      setDismissedSet(new Set(ids));

      const sMap: Record<string, number> = {};
      (settingsRes.data || []).forEach((s: any) => {
        if (s.key && s.value) sMap[s.key] = parseInt(s.value, 10);
      });
      setAdherenceSettings(sMap);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar doses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const allOverdueDoses = useMemo(() => {
    const activeTreatmentIds = new Set(
      treatments.filter(t => t.status === TreatmentStatus.ONGOING).map(t => t.id)
    );

    const result = doses.filter(d => {
      if (!activeTreatmentIds.has(d.treatmentId)) return false;
      if (d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE) return false;
      const overdueDays = diffInDays(today, d.scheduledDate);
      const minOverdue = d.cycleNumber === 1 ? 10 : 1;
      return overdueDays >= minOverdue;
    });

    const seen = new Set<string>();
    const deduped = result
      .sort((a, b) => a.cycleNumber - b.cycleNumber)
      .filter(d => {
        if (seen.has(d.treatmentId)) return false;
        seen.add(d.treatmentId);
        return true;
      });

    return deduped.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  }, [doses, treatments, today]);

  const overdueDoses = useMemo(() => {
    return allOverdueDoses
      .filter(d => d.confirmationStatus !== 'SENT_2' && d.confirmationStatus !== 'OPTED_OUT')
      .filter(d => !dismissedSet.has(buildContactId(d.id, MessageTemplateTrigger.LATE_DOSE)));
  }, [allOverdueDoses, dismissedSet]);

  const unansweredDoses = useMemo(() => {
    return allOverdueDoses
      .filter(d => d.confirmationStatus === 'SENT_2' && d.confirmationStatus !== 'OPTED_OUT')
      .filter(d => !dismissedSet.has(buildContactId(d.id, MessageTemplateTrigger.LATE_DOSE)));
  }, [allOverdueDoses, dismissedSet]);

  const getAdherenceForDose = useCallback((dose: Dose) => {
    const treatment = treatments.find(t => t.id === dose.treatmentId);
    if (!treatment) return null;
    const protocol = protocols.find(p => p.id === treatment.protocolId);
    const treatmentDoses = doses.filter(d => d.treatmentId === treatment.id);
    return classifyAdherence(treatment, treatmentDoses, protocol, today, adherenceSettings);
  }, [treatments, protocols, doses, today, adherenceSettings]);

  const filteredDoses = useMemo(() => {
    let list = doses;
    let trigger: MessageTemplateTrigger = MessageTemplateTrigger.NEXT_DOSE;
    switch (filter) {
      case 'overdue':
        return overdueDoses;
      case 'unanswered':
        return unansweredDoses;
      case 'upcoming':
        list = doses.filter(d => d.status === DoseStatus.PENDING && new Date(d.applicationDate) >= today);
        trigger = MessageTemplateTrigger.NEXT_DOSE;
        break;
      case 'to-deliver':
        list = doses.filter(d => d.paymentStatus === PaymentStatus.PAID && (d as any).deliveryStatus === 'waiting');
        trigger = MessageTemplateTrigger.GENERAL;
        break;
      case 'to-pay':
        list = doses.filter(d => d.paymentStatus != null && [
          PaymentStatus.WAITING_PIX,
          PaymentStatus.WAITING_CARD,
          PaymentStatus.WAITING_BOLETO,
        ].includes(d.paymentStatus));
        trigger = MessageTemplateTrigger.GENERAL;
        break;
    }
    return list
      .filter(d => !dismissedSet.has(buildContactId(d.id, trigger)))
      .sort((a, b) => new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime());
  }, [doses, filter, today, dismissedSet, overdueDoses, unansweredDoses]);

  const getPatient = (treatmentId: string) => {
    const t = treatments.find(tr => tr.id === treatmentId);
    return t ? patients.find(p => p.id === t.patientId) : null;
  };
  const getProtocol = (treatmentId: string) => {
    const t = treatments.find(tr => tr.id === treatmentId);
    return t ? protocols.find(p => p.id === t.protocolId) : null;
  };

  const openPopup = (dose: Dose, trigger: MessageTemplateTrigger) => {
    const p = getPatient(dose.treatmentId);
    if (!p) return;
    setPopupPatient(p);
    setPopupTreatmentId(dose.treatmentId);
    setPopupDoseId(dose.id);
    setPopupTrigger(trigger);
    setPopupContactId(buildContactId(dose.id, trigger));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando doses...</span>
      </div>
    );
  }

  const FILTER_ACTIVE_STYLES: Record<string, string> = {
    red: 'bg-red-50 border-red-300 text-red-700',
    teal: 'bg-teal-50 border-teal-300 text-teal-700',
    orange: 'bg-orange-50 border-orange-300 text-orange-700',
    amber: 'bg-amber-50 border-amber-300 text-amber-700',
    slate: 'bg-slate-50 border-slate-300 text-slate-700',
    rose: 'bg-rose-50 border-rose-300 text-rose-700',
  };

  const FILTERS: { key: typeof filter; label: string; color: string; count?: number }[] = [
    { key: 'overdue', label: 'Em Atraso', color: 'red' },
    { key: 'unanswered', label: 'Não Respondidos', color: 'rose', count: unansweredDoses.length },
    { key: 'upcoming', label: 'Próximas', color: 'teal' },
    { key: 'to-deliver', label: 'A Entregar', color: 'orange' },
    { key: 'to-pay', label: 'A Pagar', color: 'amber' },
    { key: 'all', label: 'Todas', color: 'slate' },
  ];

  const showAdherence = filter === 'unanswered';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <Syringe size={28} className="mr-3 text-pink-600" />
          Gestão de Doses
        </h1>
        <p className="text-slate-500 mt-1">Acompanhamento operacional de doses por situação.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
              filter === f.key
                ? FILTER_ACTIVE_STYLES[f.color]
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-rose-200 text-rose-800 font-bold">{f.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700">
            {filteredDoses.length} dose{filteredDoses.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Paciente</th>
                <th className="px-5 py-3">Protocolo</th>
                <th className="px-6 py-3">Status</th>
                {(filter === 'overdue' || filter === 'unanswered') && <th className="px-6 py-3">Confirmacao</th>}
                {showAdherence && <th className="px-6 py-3">Adesão</th>}
                <th className="px-6 py-3">Pagamento</th>
                <th className="px-6 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDoses.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-400">Nenhuma dose nesta categoria.</td></tr>
              ) : filteredDoses.map(dose => {
                const patient = getPatient(dose.treatmentId);
                const protocol = getProtocol(dose.treatmentId);
                const overdueDays = dose.status === DoseStatus.PENDING
                  ? Math.max(0, diffInDays(today, dose.scheduledDate))
                  : 0;
                const trigger = filter === 'overdue' || filter === 'unanswered'
                  ? MessageTemplateTrigger.LATE_DOSE
                  : (filter === 'upcoming' ? MessageTemplateTrigger.NEXT_DOSE : MessageTemplateTrigger.GENERAL);
                const cid = buildContactId(dose.id, trigger);
                const adherence = showAdherence ? getAdherenceForDose(dose) : null;
                return (
                  <tr key={dose.id} className={`hover:opacity-80 transition-colors ${dose.confirmationStatus === 'SENT_2' && (filter === 'overdue' || filter === 'unanswered') ? 'bg-red-50/60' : (() => { const diag = patient?.mainDiagnosis; const dc = diag ? getDiagnosisColor(diag, diagnoses.find((d: any) => d.name === diag)?.color) : ''; return dc ? dc.split(' ')[0] : ''; })()}`}>
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {formatDate(dose.applicationDate)}
                      {overdueDays > 0 && (
                        <span className="ml-1 text-xs text-red-600 font-bold">({overdueDays}d atraso)</span>
                      )}
                    </td>
                    <td className="px-5 py-3" title={patient?.guardian?.phonePrimary ? patient.guardian.phonePrimary.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : ''}>
                      {patient ? (
                        <>
                          <Link to={`/pacientes/${patient.id}`} className="text-pink-600 hover:underline text-xs font-bold">
                            {patient.fullName}
                          </Link>
                          {patient.mainDiagnosis && (() => {
                            const dc = getDiagnosisColor(patient.mainDiagnosis, diagnoses.find((d: any) => d.name === patient.mainDiagnosis)?.color);
                            return (
                              <span className={`block text-[9px] px-2 py-0.5 rounded-full border uppercase font-medium mt-0.5 w-fit ${dc}`}>
                                {patient.mainDiagnosis}
                              </span>
                            );
                          })()}
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{protocol?.name || '—'}</td>
                    <td className="px-6 py-3">
                      {dose.confirmationStatus === 'OPTED_OUT' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-pink-100 text-pink-700">
                          <BellOff size={10} /> Não quer receber
                        </span>
                      ) : (
                        <span className="text-xs font-medium">{DOSE_STATUS_LABELS[dose.status as DoseStatus] || dose.status}</span>
                      )}
                    </td>
                    {(filter === 'overdue' || filter === 'unanswered') && (
                      <td className="px-6 py-3">
                        {dose.confirmationStatus === 'OPTED_OUT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                            <BellOff size={10} /> Optou sair
                          </span>
                        ) : dose.confirmationStatus === 'ANSWERED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Respondido
                          </span>
                        ) : dose.confirmationStatus === 'SENT_2' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">
                              <Send size={10} /> 2x enviado
                            </span>
                            {dose.confirmationSentAt && (
                              <p className="text-[10px] text-red-400 mt-0.5">{formatDate(dose.confirmationSentAt)}</p>
                            )}
                          </div>
                        ) : dose.confirmationStatus === 'SENT_1' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                              <Send size={10} /> 1x enviado
                            </span>
                            {dose.confirmationSentAt && (
                              <p className="text-[10px] text-amber-400 mt-0.5">{formatDate(dose.confirmationSentAt)}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    )}
                    {showAdherence && (
                      <td className="px-6 py-3">
                        {adherence && (
                          <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${ADHERENCE_STYLES[adherence]}`}>
                            {adherence}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-3 text-xs text-slate-600">{dose.paymentStatus ? PAYMENT_STATUS_LABELS[dose.paymentStatus] : '—'}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {patient && (
                          <button
                            onClick={() => openPopup(dose, trigger)}
                            className="text-pink-600 hover:text-pink-800 font-medium text-xs flex items-center"
                          >
                            <MessageSquare size={12} className="mr-1" />
                            Enviar Mensagem
                            <ChevronRight size={14} className="ml-0.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setDismissTarget({ contactId: cid, patientName: patient?.fullName || 'esta dose' })}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                          title="Remover da lista"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {dismissTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Remover da lista?</h3>
            <p className="text-sm text-slate-600 mb-5">
              Deseja remover <strong>{dismissTarget.patientName}</strong> da lista?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDismissTarget(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                disabled={isDismissing}
              >
                Cancelar
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
                disabled={isDismissing}
              >
                {isDismissing ? 'Removendo...' : 'Sim, remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {popupPatient && popupTreatmentId && popupContactId && (
        <MessagePopup
          open
          onClose={() => {
            setPopupPatient(null);
            setPopupTreatmentId(null);
            setPopupDoseId(undefined);
            setPopupContactId('');
          }}
          treatmentId={popupTreatmentId}
          doseId={popupDoseId}
          patientId={popupPatient.id}
          patientName={popupPatient.fullName}
          guardianName={popupPatient.guardian?.fullName}
          guardianPhone={popupPatient.guardian?.phonePrimary}
          defaultTrigger={popupTrigger}
          title={popupTrigger === MessageTemplateTrigger.LATE_DOSE ? 'Dose Atrasada' : 'Próxima Dose'}
          treatmentLink={`/tratamento/${popupTreatmentId}`}
          contactId={popupContactId}
          onMarkSent={loadData}
        />
      )}
    </div>
  );
};

export default DosesPage;
