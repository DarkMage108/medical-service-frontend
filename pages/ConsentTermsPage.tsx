import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { documentsApi, patientsApi, treatmentsApi, protocolsApi, dosesApi, diagnosesApi } from '../services/api';
import { FileWarning, Loader2, AlertCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { ConsentDocument, PatientFull, Treatment, Protocol, Diagnosis } from '../types';
import MessagePopup from '../components/ui/MessagePopup';
import { MessageTemplateTrigger } from '../types';

// March 2026 — extracted from main Dashboard. Side-menu page listing patients with pending Termo de Consentimento.
const ConsentTermsPage: React.FC = () => {
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [documents, setDocuments] = useState<ConsentDocument[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Popup state
  const [popupTreatmentId, setPopupTreatmentId] = useState<string | null>(null);
  const [popupPatient, setPopupPatient] = useState<PatientFull | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [patientsRes, docsRes, treatmentsRes, protocolsRes, diagnosesRes] = await Promise.all([
        patientsApi.getAll({ limit: 1000 }),
        documentsApi.getAll(),
        treatmentsApi.getAll({ limit: 1000 }),
        protocolsApi.getAll(),
        diagnosesApi.getAll(),
      ]);
      setPatients(patientsRes.data || []);
      setDocuments(docsRes.data || []);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setDiagnoses(diagnosesRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Patients whose diagnosis requires consent and don't have a SIGNED document yet.
  const patientsMissingConsent = useMemo(() => {
    const requiringConsentSet = new Set(
      diagnoses.filter(d => d.requiresConsent).map(d => d.name.toLowerCase())
    );
    return patients.filter(p => {
      if (!p.active) return false;
      // Only flag patients whose diagnosis requires consent
      if (!requiringConsentSet.has((p.mainDiagnosis || '').toLowerCase())) return false;
      const docs = documents.filter(d => d.patientId === p.id);
      const hasSignedDoc = docs.some(d => d.status === 'SIGNED');
      return !hasSignedDoc;
    });
  }, [patients, documents, diagnoses]);

  // Find an active treatment for a patient — needed for the message popup variable resolver
  const treatmentFor = (patientId: string) =>
    treatments.find(t => t.patientId === patientId && t.status === 'ONGOING');

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
                  </td>
                  <td className="px-6 py-3 text-slate-600">{p.guardian?.fullName || '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{p.guardian?.phonePrimary || '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{p.mainDiagnosis}</td>
                  <td className="px-6 py-3 text-right">
                    {treatment && (
                      <button
                        onClick={() => { setPopupTreatmentId(treatment.id); setPopupPatient(p); }}
                        className="text-cyan-600 hover:text-cyan-800 font-medium text-xs flex items-center justify-end ml-auto"
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

      {/* Message popup */}
      {popupPatient && popupTreatmentId && (
        <MessagePopup
          open
          onClose={() => { setPopupPatient(null); setPopupTreatmentId(null); }}
          treatmentId={popupTreatmentId}
          patientId={popupPatient.id}
          patientName={popupPatient.fullName}
          guardianName={popupPatient.guardian?.fullName}
          guardianPhone={popupPatient.guardian?.phonePrimary}
          defaultTrigger={MessageTemplateTrigger.CONSENT_TERM}
          title="Termo de Consentimento"
          treatmentLink={`/tratamento/${popupTreatmentId}`}
          onMarkSent={loadData}
        />
      )}
    </div>
  );
};

export default ConsentTermsPage;
