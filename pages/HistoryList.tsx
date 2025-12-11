
import React, { useMemo, useState, useEffect } from 'react';
import { dismissedLogsApi, treatmentsApi, protocolsApi, patientsApi } from '../services/api';
import { TreatmentStatus, ProtocolCategory, PatientFeedback, Treatment, Protocol, PatientFull } from '../types';
import { History, Search, Calendar, User, MessageCircle, Filter, MessageSquare, AlertTriangle, CheckCircle2, AlertCircle, Save, Loader2, Stethoscope, MessageSquarePlus, Edit2, Check, RefreshCw } from 'lucide-react';
import { formatDate } from '../constants';
import SectionCard from '../components/ui/SectionCard';
import Modal from '../components/ui/Modal';

interface DismissedLog {
  contactId: string;
  dismissedAt: string;
  feedback?: PatientFeedback;
}

const HistoryList: React.FC = () => {
  const [filterDays, setFilterDays] = useState<number | 'all'>(30);

  // Data states
  const [dismissedLogs, setDismissedLogs] = useState<DismissedLog[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feedback Modal States
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [responseText, setResponseText] = useState('');
  const [classification, setClassification] = useState<PatientFeedback['classification'] | ''>('');
  const [needsMedicalResponse, setNeedsMedicalResponse] = useState<string>('');
  const [urgency, setUrgency] = useState<PatientFeedback['urgency'] | ''>('');
  const [existingStatus, setExistingStatus] = useState<PatientFeedback['status']>('pending');
  const [isSaving, setIsSaving] = useState(false);

  // Load data from API
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [logsRes, treatmentsRes, protocolsRes, patientsRes] = await Promise.all([
        dismissedLogsApi.getAll(),
        treatmentsApi.getAll({ limit: 100 }),
        protocolsApi.getAll(),
        patientsApi.getAll({ limit: 100 })
      ]);

      setDismissedLogs(logsRes.data || []);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setPatients(patientsRes.data || []);
    } catch (err: any) {
      console.error('Error loading history data:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Combine logs with real data for display
  const historyItems = useMemo(() => {
    const logsMap = new Map<string, DismissedLog>(dismissedLogs.map(log => [log.contactId, log]));

    const items: any[] = [];
    const today = new Date();

    let cutoffDate: Date | null = null;
    if (filterDays !== 'all') {
      cutoffDate = new Date();
      cutoffDate.setDate(today.getDate() - filterDays);
    }

    treatments.forEach((t: Treatment) => {
      const proto = protocols.find((p: Protocol) => p.id === t.protocolId);
      if (!proto || !proto.milestones) return;

      proto.milestones.forEach((m: any) => {
        const contactId = `${t.id}_m_${m.day}`;
        const log = logsMap.get(contactId);

        if (log) {
          const dismissedAt = new Date(log.dismissedAt);

          if (cutoffDate && dismissedAt < cutoffDate) {
            return;
          }

          const patient = patients.find((p: PatientFull) => p.id === t.patientId);
          if (patient) {
            items.push({
              id: contactId,
              dismissedAt: dismissedAt,
              patientName: patient.fullName,
              patientPhone: patient.guardian?.phonePrimary || '',
              protocolName: proto.name,
              message: m.message,
              isMonitoring: proto.category === ProtocolCategory.MONITORING || proto.category === 'MONITORING',
              feedback: log.feedback
            });
          }
        }
      });
    });

    return items.sort((a: any, b: any) => b.dismissedAt.getTime() - a.dismissedAt.getTime());
  }, [filterDays, dismissedLogs, treatments, protocols, patients]);

  // Handlers
  const handleOpenFeedback = (item: any, editMode = false) => {
    setSelectedLogId(item.id);
    setSelectedPatientName(item.patientName);
    setIsEditing(editMode);

    if (editMode && item.feedback) {
      const fb = item.feedback as PatientFeedback;
      setResponseText(fb.text);
      setClassification(fb.classification);
      setNeedsMedicalResponse(fb.needsMedicalResponse ? 'yes' : 'no');
      setUrgency(fb.urgency);
      setExistingStatus(fb.status || 'pending');
    } else {
      setResponseText('');
      setClassification('');
      setNeedsMedicalResponse('');
      setUrgency('');
      setExistingStatus('pending');
    }

    setIsFeedbackModalOpen(true);
  };

  const handleResolveFeedback = async (item: any) => {
    if (!window.confirm("Deseja marcar este atendimento como CONCLUIDO?")) return;

    // Note: The backend doesn't have a specific resolve endpoint yet
    // For now, we'll update the feedback with resolved status
    // This would need a backend endpoint to properly persist
    const updatedLogs = dismissedLogs.map(log => {
      if (log.contactId === item.id && log.feedback) {
        return {
          ...log,
          feedback: { ...log.feedback, status: 'resolved' as const }
        };
      }
      return log;
    });
    setDismissedLogs(updatedLogs);
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogId || !responseText || !classification || !urgency || !needsMedicalResponse) {
      alert("Por favor, preencha todos os campos obrigatorios.");
      return;
    }

    setIsSaving(true);

    try {
      const feedbackData: PatientFeedback = {
        text: responseText,
        classification: classification as any,
        needsMedicalResponse: needsMedicalResponse === 'yes',
        urgency: urgency as any,
        registeredAt: new Date().toISOString(),
        status: existingStatus
      };

      // Update local state (would need backend endpoint to persist)
      const updatedLogs = dismissedLogs.map(log => {
        if (log.contactId === selectedLogId) {
          return { ...log, feedback: feedbackData };
        }
        return log;
      });
      setDismissedLogs(updatedLogs);

      setIsFeedbackModalOpen(false);
    } catch (err: any) {
      console.error('Error saving feedback:', err);
      alert('Erro ao salvar feedback: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando historico...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto text-red-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Erro ao carregar dados</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <History size={28} className="mr-3 text-pink-600" />
            Historico de Mensagens
          </h1>
          <p className="text-slate-500 mt-1">Registro de todas as acoes e mensagens da regua de contato ja concluidas.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <div className="pl-2 pr-1 text-slate-400">
              <Filter size={18} />
            </div>
            <select
              value={filterDays}
              onChange={(e) => setFilterDays(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer py-1.5 pr-8 pl-1"
            >
              <option value="7">Ultimos 7 dias</option>
              <option value="30">Ultimos 30 dias</option>
              <option value="60">Ultimos 60 dias</option>
              <option value="all">Todo o periodo</option>
            </select>
          </div>
        </div>
      </div>

      <SectionCard
        title="Mensagens Enviadas / Concluidas"
        icon={<MessageCircle size={18} className="text-slate-600" />}
        countBadge={historyItems.length}
        badgeColor="bg-slate-100 text-slate-600"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4">Data/Hora Envio</th>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Protocolo</th>
                <th className="px-6 py-4">Mensagem Padrao</th>
                <th className="px-6 py-4">Resposta / Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Nenhum historico registrado no periodo selecionado.
                  </td>
                </tr>
              ) : (
                historyItems.map((item) => {
                  const fb = item.feedback as PatientFeedback | undefined;
                  const isResolved = fb?.status === 'resolved';

                  return (
                    <tr key={item.id} className={`transition-colors ${isResolved ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          {formatDate(item.dismissedAt)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 ml-6">
                          {item.dismissedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{item.patientName}</div>
                        {item.patientPhone && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.patientPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.isMonitoring ? (
                          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-100 font-medium">
                            {item.protocolName}
                          </span>
                        ) : (
                          <span className="text-slate-600">{item.protocolName}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={item.message}>
                        {item.message}
                      </td>
                      <td className="px-6 py-4">
                        {fb ? (
                          <div className="space-y-1.5 min-w-[200px] group">
                            <div className="flex flex-wrap gap-1 items-center justify-between">
                              <div className="flex gap-1 flex-wrap">
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-white text-slate-600 rounded border border-slate-200">
                                  {fb.classification}
                                </span>
                                {fb.urgency === 'Urgente' && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded border border-red-200 flex items-center">
                                    <AlertCircle size={10} className="mr-1" /> Urgente
                                  </span>
                                )}
                                {fb.urgency === 'Atenção' && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded border border-orange-200 flex items-center">
                                    <AlertTriangle size={10} className="mr-1" /> Atenção
                                  </span>
                                )}
                                {fb.needsMedicalResponse && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded border border-purple-200 flex items-center" title="Requer Resposta Medica">
                                    <Stethoscope size={10} className="mr-1" /> Medico
                                  </span>
                                )}
                                {isResolved && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-emerald-600 text-white rounded flex items-center ml-1">
                                    <Check size={10} className="mr-1" /> Concluido
                                  </span>
                                )}
                              </div>

                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleOpenFeedback(item, true)}
                                  className="p-1 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded hover:bg-blue-50"
                                  title="Editar Resposta"
                                >
                                  <Edit2 size={14} />
                                </button>
                                {!isResolved && (
                                  <button
                                    onClick={() => handleResolveFeedback(item)}
                                    className="p-1 text-slate-400 hover:text-green-600 bg-white border border-slate-200 rounded hover:bg-green-50"
                                    title="Marcar como Concluido"
                                  >
                                    <Check size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-slate-700 bg-white/50 border border-slate-200 p-2 rounded line-clamp-2" title={fb.text}>
                              {fb.text}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenFeedback(item)}
                            className="flex items-center text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 border border-pink-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <MessageSquarePlus size={14} className="mr-1.5" />
                            Registrar Resposta
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* FEEDBACK MODAL */}
      <Modal open={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} title={isEditing ? "Editar Resposta do Paciente" : "Nova Resposta do Paciente"} icon={<MessageSquare size={20} className="text-pink-600" />}>
        <form onSubmit={handleSaveFeedback} className="space-y-5">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase">Paciente</p>
            <p className="font-bold text-slate-800 text-lg">{selectedPatientName}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Resposta do paciente (texto livre) <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              placeholder="Descreva a resposta ou duvida do paciente..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Classificacao da resposta <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {['Resposta geral', 'Duvida sobre medicacao, dose', 'Sintomas/queixas'].map((opt) => (
                <label key={opt} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${classification === opt ? 'bg-pink-50 border-pink-500 ring-1 ring-pink-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="classification"
                    value={opt}
                    checked={classification === opt}
                    onChange={(e) => setClassification(e.target.value as any)}
                    className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300"
                  />
                  <span className="ml-2 text-xs font-medium text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Precisa de resposta medica? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${needsMedicalResponse === 'yes' ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <input type="radio" name="medical" value="yes" checked={needsMedicalResponse === 'yes'} onChange={() => setNeedsMedicalResponse('yes')} className="sr-only" />
                <Stethoscope size={16} className="mr-2" /> Sim
              </label>
              <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${needsMedicalResponse === 'no' ? 'bg-slate-100 border-slate-400 text-slate-800 ring-1 ring-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <input type="radio" name="medical" value="no" checked={needsMedicalResponse === 'no'} onChange={() => setNeedsMedicalResponse('no')} className="sr-only" />
                Nao
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Urgencia <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer text-center transition-all ${urgency === 'Sem urgencia' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                <input type="radio" name="urgency" value="Sem urgencia" checked={urgency === 'Sem urgencia'} onChange={(e) => setUrgency(e.target.value as any)} className="sr-only" />
                <span className="text-xs font-bold">Sem urgencia</span>
              </label>
              <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer text-center transition-all ${urgency === 'Atencao' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                <input type="radio" name="urgency" value="Atencao" checked={urgency === 'Atencao'} onChange={(e) => setUrgency(e.target.value as any)} className="sr-only" />
                <span className="text-xs font-bold flex items-center"><AlertTriangle size={12} className="mr-1" /> Atencao</span>
              </label>
              <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer text-center transition-all ${urgency === 'Urgente' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                <input type="radio" name="urgency" value="Urgente" checked={urgency === 'Urgente'} onChange={(e) => setUrgency(e.target.value as any)} className="sr-only" />
                <span className="text-xs font-bold flex items-center"><AlertCircle size={12} className="mr-1" /> Urgente</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFeedbackModalOpen(false)}
              disabled={isSaving}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-bold shadow-md shadow-pink-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
              {isSaving ? 'Salvando...' : 'Salvar Resposta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HistoryList;
