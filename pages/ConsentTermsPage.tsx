import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { documentsApi, patientsApi, treatmentsApi, protocolsApi, diagnosesApi, dismissedLogsApi } from '../services/api';
import { FileWarning, Loader2, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { ConsentDocument, PatientFull, Treatment, Protocol, Diagnosis, DismissedLog } from '../types';
import MessagePopup from '../components/ui/MessagePopup';
import { MessageTemplateTrigger } from '../types';

// March 2026 — extracted from main Dashboard. Side-menu page listing patients with pending Termo de Consentimento.
// Stable contactId per patient so dismissed rows stay hidden across refreshes (until they get a signed doc).
const buildContactId = (patientId: string) => `consent_${patientId}`;

const ConsentTermsPage: React.FC = () => {
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [documents, setDocuments] = useState<ConsentDocument[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [dismissedSet, setDismissedSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Popup state
  const [popupTreatmentId, setPopupTreatmentId] = useState<string | null>(null);
  const [popupPatient, setPopupPatient] = useState<PatientFull | null>(null);
  const [popupContactId, setPopupContactId] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [patientsRes, docsRes, treatmentsRes, protocolsRes, diagnosesRes, dismissedRes] = await Promise.all([
        patientsApi.getAll({ limit: 1000 }),
        documentsApi.getAll(),
        treatmentsApi.getAll({ limit: 1000 }),
        protocolsApi.getAll(),
        diagnosesApi.getAll(),
        dismissedLogsApi.getAll(),
      ]);
      setPatients(patientsRes.data || []);
      setDocuments(docsRes.data || []);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setDiagnoses(diagnosesRes.data || []);
      const ids = (dismissedRes.data as DismissedLog[] || []).map(d => d.contactId);
      setDismissedSet(new Set(ids));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Patients whose diagnosis requires consent and don't have a SIGNED document yet.
  // March 2026: include both ACTIVE and INACTIVE patients per client request — secretary may need
  // to chase consent for inactive patients too. Dismissed (concluído / enviado) rows are filtered out.
  const patientsMissingConsent = useMemo(() => {
    const requiringConsentSet = new Set(
      diagnoses.filter(d => d.requiresConsent).map(d => d.name.toLowerCase())
    );
    return patients.filter(p => {
      // Only flag patients whose diagnosis requires consent
      if (!requiringConsentSet.has((p.mainDiagnosis || '').toLowerCase())) return false;
      const docs = documents.filter(d => d.patientId === p.id);
      const hasSignedDoc = docs.some(d => d.status === 'SIGNED');
      if (hasSignedDoc) return false;
      // Hide rows already marked as concluído via the message popup
      if (dismissedSet.has(buildContactId(p.id))) return false;
      return true;
    });
  }, [patients, documents, diagnoses, dismissedSet]);

  // Find any treatment for a patient — preferred order: ONGOING, then most recent.
  // Used by the message popup for variable resolution; if none found, popup falls back to patient-only resolver.
  const treatmentFor = (patientId: string) =>
    treatments.find(t => t.patientId === patientId && t.status === 'ONGOING') ||
    treatments.find(t => t.patientId === patientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <FileWarning size={28} className="mr-3 text-cyan-600" />
          Termo de Consentimento
        </h1>
        <p className="text-slate-500 mt-1">
          Pacientes ativos sem documento de consentimento assinado.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-cyan-50/30 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">
            Pendências ({patientsMissingConsent.length})
          </h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
            <tr>
              <th className="px-6 py-3">Paciente</th>
              <th className="px-6 py-3">Responsável</th>
              <th className="px-6 py-3">Telefone</th>
              <th className="px-6 py-3">Diagnóstico</th>
              <th className="px-6 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {patientsMissingConsent.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhuma pendência. 🎉</td></tr>
            ) : patientsMissingConsent.map(p => {
              const treatment = treatmentFor(p.id);
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">
                    <Link to={`/pacientes/${p.id}`} className="hover:text-pink-600">{p.fullName}</Link>
                    {!p.active && (
                      <span className="ml-2 text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{p.guardian?.fullName || '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{p.guardian?.phonePrimary || '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{p.mainDiagnosis}</td>
                  <td className="px-6 py-3 text-right">
                    {/* March 2026: button always visible — popup falls back to patient-only variables when no treatment exists. */}
                    <button
                      onClick={() => {
                        setPopupTreatmentId(treatment ? treatment.id : null);
                        setPopupPatient(p);
                        setPopupContactId(buildContactId(p.id));
                      }}
                      disabled={!p.guardian}
                      title={!p.guardian ? 'Cadastre o responsável antes de enviar mensagem' : 'Enviar mensagem'}
                      className="text-cyan-600 hover:text-cyan-800 font-medium text-xs flex items-center justify-end ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MessageSquare size={12} className="mr-1" />
                      Enviar Mensagem
                      <ChevronRight size={14} className="ml-0.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Message popup — opens for any patient (active or inactive). When no treatment exists,
          MessagePopup falls back to patient-only variable resolution. */}
      {popupPatient && popupContactId && (
        <MessagePopup
          open
          onClose={() => { setPopupPatient(null); setPopupTreatmentId(null); setPopupContactId(''); }}
          treatmentId={popupTreatmentId || undefined}
          patientId={popupPatient.id}
          patientName={popupPatient.fullName}
          guardianName={popupPatient.guardian?.fullName}
          guardianPhone={popupPatient.guardian?.phonePrimary}
          defaultTrigger={MessageTemplateTrigger.CONSENT_TERM}
          title="Termo de Consentimento"
          treatmentLink={popupTreatmentId ? `/tratamento/${popupTreatmentId}` : undefined}
          contactId={popupContactId}
          onMarkSent={loadData}
        />
      )}
    </div>
  );
};

export default ConsentTermsPage;
