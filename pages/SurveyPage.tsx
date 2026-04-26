import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { dosesApi, patientsApi, treatmentsApi, protocolsApi } from '../services/api';
import { MessageCircle, Loader2, AlertCircle, MessageSquare, ChevronRight, Star } from 'lucide-react';
import { Dose, SurveyStatus, PatientFull, Treatment, Protocol, MessageTemplateTrigger } from '../types';
import { formatDate, SURVEY_STATUS_LABELS } from '../constants';
import MessagePopup from '../components/ui/MessagePopup';

// March 2026 — sidebar page for nursing satisfaction survey pending list (extracted from Dashboard).
const SurveyPage: React.FC = () => {
  const [doses, setDoses] = useState<Dose[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [popupPatient, setPopupPatient] = useState<PatientFull | null>(null);
  const [popupTreatmentId, setPopupTreatmentId] = useState<string | null>(null);
  const [popupDoseId, setPopupDoseId] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  // Doses with nurse=true and survey not yet ANSWERED / NOT_ANSWERED
  const pendingSurveyDoses = useMemo(() => {
    return doses
      .filter(d => d.nurse === true)
      .filter(d => d.surveyStatus !== SurveyStatus.ANSWERED && d.surveyStatus !== SurveyStatus.NOT_ANSWERED)
      .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
  }, [doses]);

  const getPatient = (treatmentId: string) => {
    const t = treatments.find(tr => tr.id === treatmentId);
    return t ? patients.find(p => p.id === t.patientId) : null;
  };

  const getProtocol = (treatmentId: string) => {
    const t = treatments.find(tr => tr.id === treatmentId);
    return t ? protocols.find(p => p.id === t.protocolId) : null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando pesquisas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <MessageCircle size={28} className="mr-3 text-blue-600" />
          Pesquisa Enfermagem
        </h1>
        <p className="text-slate-500 mt-1">
          Doses aplicadas pela enfermeira aguardando resposta da pesquisa de satisfação.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-blue-50/30">
          <h3 className="font-bold text-slate-700">
            Pendentes ({pendingSurveyDoses.length})
          </h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
            <tr>
              <th className="px-6 py-3">Data Aplicação</th>
              <th className="px-6 py-3">Paciente</th>
              <th className="px-6 py-3">Telefone</th>
              <th className="px-6 py-3">Protocolo</th>
              <th className="px-6 py-3">Status Pesquisa</th>
              <th className="px-6 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendingSurveyDoses.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Nenhuma pesquisa pendente.</td></tr>
            ) : pendingSurveyDoses.map(dose => {
              const patient = getPatient(dose.treatmentId);
              const protocol = getProtocol(dose.treatmentId);
              return (
                <tr key={dose.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-700">{formatDate(dose.applicationDate)}</td>
                  <td className="px-6 py-3">
                    {patient ? (
                      <Link to={`/pacientes/${patient.id}`} className="text-pink-600 hover:underline">{patient.fullName}</Link>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{patient?.guardian?.phonePrimary || '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{protocol?.name || '—'}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center text-xs font-medium text-blue-700">
                      <Star size={12} className="mr-1" />
                      {SURVEY_STATUS_LABELS[dose.surveyStatus]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {patient && (
                      <button
                        onClick={() => { setPopupPatient(patient); setPopupTreatmentId(dose.treatmentId); setPopupDoseId(dose.id); }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center justify-end ml-auto"
                      >
                        <MessageSquare size={12} className="mr-1" />
                        Enviar Pesquisa
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

      {popupPatient && popupTreatmentId && (
        <MessagePopup
          open
          onClose={() => { setPopupPatient(null); setPopupTreatmentId(null); setPopupDoseId(undefined); }}
          treatmentId={popupTreatmentId}
          doseId={popupDoseId}
          patientId={popupPatient.id}
          patientName={popupPatient.fullName}
          guardianName={popupPatient.guardian?.fullName}
          guardianPhone={popupPatient.guardian?.phonePrimary}
          defaultTrigger={MessageTemplateTrigger.SURVEY_PENDING}
          title="Aguardando Resposta da Pesquisa"
          treatmentLink={`/tratamento/${popupTreatmentId}`}
        />
      )}
    </div>
  );
};

export default SurveyPage;
