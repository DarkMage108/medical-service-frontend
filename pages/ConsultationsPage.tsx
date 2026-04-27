import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { treatmentsApi, patientsApi, protocolsApi, dismissedLogsApi } from '../services/api';
import { Calendar, Loader2, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { Treatment, PatientFull, Protocol, MessageTemplateTrigger, DismissedLog } from '../types';
import { formatDate, formatConsultationPeriod } from '../constants';
import MessagePopup from '../components/ui/MessagePopup';

// March 2026 — sidebar page for upcoming consultation dates (extracted from Dashboard).
// Stable contactId per treatment+forecast-month so dismissed rows stay hidden across refreshes.
const buildContactId = (treatmentId: string, month?: number | null, year?: number | null) =>
  `consult_${treatmentId}_${year ?? 0}_${month ?? 0}`;

const ConsultationsPage: React.FC = () => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [dismissedSet, setDismissedSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [popupPatient, setPopupPatient] = useState<PatientFull | null>(null);
  const [popupTreatmentId, setPopupTreatmentId] = useState<string | null>(null);
  const [popupContactId, setPopupContactId] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [treatmentsRes, patientsRes, protocolsRes, dismissedRes] = await Promise.all([
        treatmentsApi.getAll({ limit: 1000, status: 'ONGOING' }),
        patientsApi.getAll({ limit: 1000 }),
        protocolsApi.getAll(),
        dismissedLogsApi.getAll(),
      ]);
      setTreatments(treatmentsRes.data || []);
      setPatients(patientsRes.data || []);
      setProtocols(protocolsRes.data || []);
      const ids = (dismissedRes.data as DismissedLog[] || []).map(d => d.contactId);
      setDismissedSet(new Set(ids));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Treatments with a forecast (Quinzena or exact date), filtered by dismissed logs, sorted chronologically.
  const consultationItems = useMemo(() => {
    return treatments
      .filter(t => t.nextConsultationDate || (t.nextConsultationMonth && t.nextConsultationYear && t.nextConsultationFortnight))
      .map(t => {
        const patient = patients.find(p => p.id === t.patientId);
        const protocol = protocols.find(p => p.id === t.protocolId);
        // Sort key: prefer exact date; otherwise approximate from Quinzena (day 8 or 23 mid-quinzena)
        let sortDate: Date;
        let monthKey: number | null = null;
        let yearKey: number | null = null;
        if (t.nextConsultationDate) {
          const d = new Date(t.nextConsultationDate);
          sortDate = d;
          monthKey = d.getMonth() + 1;
          yearKey = d.getFullYear();
        } else {
          const day = t.nextConsultationFortnight === 1 ? 8 : 23;
          sortDate = new Date(t.nextConsultationYear!, (t.nextConsultationMonth! - 1), day);
          monthKey = t.nextConsultationMonth!;
          yearKey = t.nextConsultationYear!;
        }
        const contactId = buildContactId(t.id, monthKey, yearKey);
        return { treatment: t, patient, protocol, sortDate, contactId };
      })
      // Hide rows already marked as concluído for this forecast month
      .filter(item => !dismissedSet.has(item.contactId))
      .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
  }, [treatments, patients, protocols, dismissedSet]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando consultas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <Calendar size={28} className="mr-3 text-purple-600" />
          Datas de Consultas
        </h1>
        <p className="text-slate-500 mt-1">
          Tratamentos com previsão de próxima consulta — agende e organize a agenda da equipe.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-purple-50/30">
          <h3 className="font-bold text-slate-700">
            Próximas Consultas ({consultationItems.length})
          </h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
            <tr>
              <th className="px-6 py-3">Quando</th>
              <th className="px-6 py-3">Paciente</th>
              <th className="px-6 py-3">Responsável</th>
              <th className="px-6 py-3">Telefone</th>
              <th className="px-6 py-3">Protocolo</th>
              <th className="px-6 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {consultationItems.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Nenhuma consulta prevista.</td></tr>
            ) : consultationItems.map(({ treatment, patient, protocol, contactId }) => (
              <tr key={contactId} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-700">
                  {treatment.nextConsultationMonth && treatment.nextConsultationYear && treatment.nextConsultationFortnight
                    ? formatConsultationPeriod(treatment.nextConsultationMonth, treatment.nextConsultationYear, treatment.nextConsultationFortnight)
                    : treatment.nextConsultationDate ? formatDate(treatment.nextConsultationDate) : '—'}
                </td>
                <td className="px-6 py-3">
                  {patient ? (
                    <Link to={`/pacientes/${patient.id}`} className="text-pink-600 hover:underline">{patient.fullName}</Link>
                  ) : '—'}
                </td>
                <td className="px-6 py-3 text-slate-600">{patient?.guardian?.fullName || '—'}</td>
                <td className="px-6 py-3 text-slate-600">{patient?.guardian?.phonePrimary || '—'}</td>
                <td className="px-6 py-3 text-slate-600">{protocol?.name || '—'}</td>
                <td className="px-6 py-3 text-right">
                  {patient && (
                    <button
                      onClick={() => {
                        setPopupPatient(patient);
                        setPopupTreatmentId(treatment.id);
                        setPopupContactId(contactId);
                      }}
                      className="text-purple-600 hover:text-purple-800 font-medium text-xs flex items-center justify-end ml-auto"
                    >
                      <MessageSquare size={12} className="mr-1" />
                      Agendar
                      <ChevronRight size={14} className="ml-0.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {popupPatient && popupTreatmentId && popupContactId && (
        <MessagePopup
          open
          onClose={() => { setPopupPatient(null); setPopupTreatmentId(null); setPopupContactId(''); }}
          treatmentId={popupTreatmentId}
          patientId={popupPatient.id}
          patientName={popupPatient.fullName}
          guardianName={popupPatient.guardian?.fullName}
          guardianPhone={popupPatient.guardian?.phonePrimary}
          defaultTrigger={MessageTemplateTrigger.SCHEDULE_CONSULTATION}
          title="Agendar Consulta"
          treatmentLink={`/tratamento/${popupTreatmentId}`}
          contactId={popupContactId}
          onMarkSent={loadData}
        />
      )}
    </div>
  );
};

export default ConsultationsPage;
