import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { dosesApi, patientsApi, treatmentsApi, protocolsApi, dismissedLogsApi } from '../services/api';
import { Syringe, Loader2, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { Dose, DoseStatus, PaymentStatus, PatientFull, Treatment, Protocol, MessageTemplateTrigger, DismissedLog } from '../types';
import { formatDate, diffInDays, DOSE_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../constants';
import MessagePopup from '../components/ui/MessagePopup';

// March 2026 — extracted from main Dashboard. Sidebar page combining "Doses em Atraso" + "Próximas Doses" + filters.
// Stable contactId per dose+trigger so dismissed rows stay hidden across refreshes.
const buildContactId = (doseId: string, trigger: MessageTemplateTrigger) =>
  `dose_${doseId}_${trigger.toLowerCase()}`;

const DosesPage: React.FC = () => {
  const location = useLocation();
  const initialFilter = (location.state as any)?.filter as string | undefined;

  const [doses, setDoses] = useState<Dose[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [dismissedSet, setDismissedSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'overdue' | 'upcoming' | 'to-deliver' | 'to-pay' | 'all'>(
    (initialFilter as any) || 'overdue'
  );

  // Popup state
  const [popupPatient, setPopupPatient] = useState<PatientFull | null>(null);
  const [popupTreatmentId, setPopupTreatmentId] = useState<string | null>(null);
  const [popupDoseId, setPopupDoseId] = useState<string | undefined>(undefined);
  const [popupTrigger, setPopupTrigger] = useState<MessageTemplateTrigger>(MessageTemplateTrigger.NEXT_DOSE);
  const [popupContactId, setPopupContactId] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dosesRes, patientsRes, treatmentsRes, protocolsRes, dismissedRes] = await Promise.all([
        dosesApi.getAll({ limit: 1000 }),
        patientsApi.getAll({ limit: 1000 }),
        treatmentsApi.getAll({ limit: 1000 }),
        protocolsApi.getAll(),
        dismissedLogsApi.getAll(),
      ]);
      setDoses(dosesRes.data || []);
      setPatients(patientsRes.data || []);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
      const ids = (dismissedRes.data as DismissedLog[] || []).map(d => d.contactId);
      setDismissedSet(new Set(ids));
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

  const filteredDoses = useMemo(() => {
    let list = doses;
    let trigger: MessageTemplateTrigger = MessageTemplateTrigger.NEXT_DOSE;
    switch (filter) {
      case 'overdue':
        list = doses.filter(d => d.status === DoseStatus.PENDING && new Date(d.applicationDate) < today);
        trigger = MessageTemplateTrigger.LATE_DOSE;
        break;
      case 'upcoming':
        list = doses.filter(d => d.status === DoseStatus.PENDING && new Date(d.applicationDate) >= today);
        trigger = MessageTemplateTrigger.NEXT_DOSE;
        break;
      case 'to-deliver':
        list = doses.filter(d => d.paymentStatus === PaymentStatus.PAID && d.deliveryStatus === 'waiting');
        trigger = MessageTemplateTrigger.GENERAL;
        break;
      case 'to-pay':
        list = doses.filter(d => [
          PaymentStatus.WAITING_PIX,
          PaymentStatus.WAITING_CARD,
          PaymentStatus.WAITING_BOLETO,
        ].includes(d.paymentStatus));
        trigger = MessageTemplateTrigger.GENERAL;
        break;
    }
    // Hide rows already marked as concluído for this dose+trigger combo
    return list
      .filter(d => !dismissedSet.has(buildContactId(d.id, trigger)))
      .sort((a, b) => new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime());
  }, [doses, filter, today, dismissedSet]);

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

  const FILTERS: { key: typeof filter; label: string; color: string }[] = [
    { key: 'overdue', label: 'Em Atraso', color: 'red' },
    { key: 'upcoming', label: 'Próximas', color: 'teal' },
    { key: 'to-deliver', label: 'A Entregar', color: 'orange' },
    { key: 'to-pay', label: 'A Pagar', color: 'amber' },
    { key: 'all', label: 'Todas', color: 'slate' },
  ];

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

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
              filter === f.key
                ? `bg-${f.color}-50 border-${f.color}-300 text-${f.color}-700`
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
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
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Paciente</th>
                <th className="px-6 py-3">Telefone</th>
                <th className="px-6 py-3">Protocolo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Pagamento</th>
                <th className="px-6 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDoses.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Nenhuma dose nesta categoria.</td></tr>
              ) : filteredDoses.map(dose => {
                const patient = getPatient(dose.treatmentId);
                const protocol = getProtocol(dose.treatmentId);
                const overdueDays = dose.status === DoseStatus.PENDING
                  ? Math.max(0, diffInDays(today, dose.applicationDate))
                  : 0;
                const trigger = filter === 'overdue'
                  ? MessageTemplateTrigger.LATE_DOSE
                  : (filter === 'upcoming' ? MessageTemplateTrigger.NEXT_DOSE : MessageTemplateTrigger.GENERAL);
                return (
                  <tr key={dose.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-700">
                      {formatDate(dose.applicationDate)}
                      {overdueDays > 0 && (
                        <span className="ml-1 text-xs text-red-600 font-bold">({overdueDays}d atraso)</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {patient ? (
                        <Link to={`/pacientes/${patient.id}`} className="text-pink-600 hover:underline">
                          {patient.fullName}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{patient?.guardian?.phonePrimary || '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{protocol?.name || '—'}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium">{DOSE_STATUS_LABELS[dose.status as DoseStatus] || dose.status}</span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-600">{PAYMENT_STATUS_LABELS[dose.paymentStatus]}</td>
                    <td className="px-6 py-3 text-right">
                      {patient && (
                        <button
                          onClick={() => openPopup(dose, trigger)}
                          className="text-pink-600 hover:text-pink-800 font-medium text-xs flex items-center justify-end ml-auto"
                        >
                          <MessageSquare size={12} className="mr-1" />
                          Enviar Mensagem
                          <ChevronRight size={14} className="ml-0.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
