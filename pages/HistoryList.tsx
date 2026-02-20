
import React, { useMemo, useState, useEffect } from 'react';
import { dismissedLogsApi, treatmentsApi, protocolsApi, patientsApi, diagnosesApi } from '../services/api';
import { TreatmentStatus, ProtocolCategory, PatientFeedback, Treatment, Protocol, PatientFull } from '../types';
import { History, Search, Calendar, User, MessageCircle, Filter, MessageSquare, AlertTriangle, CheckCircle2, AlertCircle, Save, Loader2, Stethoscope, MessageSquarePlus, Edit2, Check, RefreshCw, Plus, Phone, X, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { formatDate, getDiagnosisColor } from '../constants';
import SectionCard from '../components/ui/SectionCard';
import Modal from '../components/ui/Modal';

interface DismissedLog {
  contactId: string;
  dismissedAt: string;
  feedback?: PatientFeedback;
  // Manual entry fields
  origin?: 'regua' | 'manual';
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  manualMessage?: string;
}

const ITEMS_PER_PAGE = 20;

const HistoryList: React.FC = () => {
  const [filterDays, setFilterDays] = useState<number | 'all'>(30);
  const [medicalResponseFilter, setMedicalResponseFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [diagnosisFilter, setDiagnosisFilter] = useState<string>('all');
  const [showOnlyWithResponse, setShowOnlyWithResponse] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Data states
  const [dismissedLogs, setDismissedLogs] = useState<DismissedLog[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
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

  // Manual Registration Modal States
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualPatientId, setManualPatientId] = useState('');
  const [manualPatientSearch, setManualPatientSearch] = useState('');
  const [manualPatientSuggestions, setManualPatientSuggestions] = useState<PatientFull[]>([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  const [manualMessage, setManualMessage] = useState('');
  const [manualResponseText, setManualResponseText] = useState('');
  const [manualClassification, setManualClassification] = useState<PatientFeedback['classification'] | ''>('');
  const [manualNeedsMedical, setManualNeedsMedical] = useState<string>('');
  const [manualUrgency, setManualUrgency] = useState<PatientFeedback['urgency'] | ''>('');
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Load data from API
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [logsRes, treatmentsRes, protocolsRes, patientsRes, diagnosesRes] = await Promise.all([
        dismissedLogsApi.getAll(),
        treatmentsApi.getAll({ limit: 100 }),
        protocolsApi.getAll(),
        patientsApi.getAll({ limit: 100 }),
        diagnosesApi.getAll()
      ]);

      // Transform API response to expected format
      const transformedLogs = (logsRes.data || []).map((log: any) => ({
        contactId: log.contactId,
        dismissedAt: log.dismissedAt,
        origin: log.origin || 'regua',
        patientId: log.patientId,
        patientName: log.patientName,
        patientPhone: log.patientPhone,
        manualMessage: log.manualMessage,
        feedback: log.feedbackText ? {
          text: log.feedbackText,
          classification: log.feedbackClassification,
          needsMedicalResponse: log.feedbackNeedsMedical,
          urgency: log.feedbackUrgency,
          status: log.feedbackStatus || 'pending',
          registeredAt: log.dismissedAt,
        } : undefined
      }));

      setDismissedLogs(transformedLogs);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setPatients(patientsRes.data || []);
      setDiagnoses(diagnosesRes.data || []);
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

  // Helper function to normalize strings for search (remove accents, lowercase)
  const normalizeString = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Search patients by name for autocomplete
  const searchPatients = (searchText: string) => {
    if (searchText.length < 2) {
      setManualPatientSuggestions([]);
      setShowPatientSuggestions(false);
      return;
    }

    const normalizedSearch = normalizeString(searchText);
    const matches = patients.filter(p =>
      normalizeString(p.fullName).includes(normalizedSearch)
    ).slice(0, 8); // Limit to 8 suggestions

    setManualPatientSuggestions(matches);
    setShowPatientSuggestions(matches.length > 0);
  };

  // Handle patient selection from autocomplete
  const handleSelectPatient = (patient: PatientFull) => {
    setManualPatientId(patient.id);
    setManualPatientSearch(patient.fullName);
    setShowPatientSuggestions(false);
  };

  // Clear patient selection
  const clearPatientSelection = () => {
    setManualPatientId('');
    setManualPatientSearch('');
    setManualPatientSuggestions([]);
    setShowPatientSuggestions(false);
  };

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

    // Process regua-based logs
    treatments.forEach((t: Treatment) => {
      const proto = protocols.find((p: Protocol) => p.id === t.protocolId);
      if (!proto || !proto.milestones) return;

      proto.milestones.forEach((m: any) => {
        const contactId = `${t.id}_m_${m.day}`;
        const log = logsMap.get(contactId);

        if (log && log.origin !== 'manual') {
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
              patientDiagnosis: patient.mainDiagnosis || '',
              protocolName: proto.name,
              message: m.message,
              isMonitoring: proto.category === ProtocolCategory.MONITORING || proto.category === 'MONITORING',
              feedback: log.feedback,
              origin: 'regua'
            });
          }
        }
      });
    });

    // Process manual logs
    dismissedLogs.filter(log => log.origin === 'manual').forEach(log => {
      const dismissedAt = new Date(log.dismissedAt);

      if (cutoffDate && dismissedAt < cutoffDate) {
        return;
      }

      const manualPatient = log.patientId ? patients.find((p: PatientFull) => p.id === log.patientId) : null;
      items.push({
        id: log.contactId,
        dismissedAt: dismissedAt,
        patientName: log.patientName || 'Paciente',
        patientPhone: log.patientPhone || '',
        patientDiagnosis: manualPatient?.mainDiagnosis || '',
        protocolName: 'Atendimento Manual',
        message: log.manualMessage || 'Registro manual de atendimento',
        isMonitoring: false,
        feedback: log.feedback,
        origin: 'manual'
      });
    });

    // Apply medical response filter
    let filteredItems = items;
    if (medicalResponseFilter === 'yes') {
      filteredItems = filteredItems.filter(item => item.feedback?.needsMedicalResponse === true);
    } else if (medicalResponseFilter === 'no') {
      filteredItems = filteredItems.filter(item =>
        item.feedback?.needsMedicalResponse === false ||
        !item.feedback?.needsMedicalResponse
      );
    }

    // Apply diagnosis filter
    if (diagnosisFilter !== 'all') {
      filteredItems = filteredItems.filter(item => item.patientDiagnosis === diagnosisFilter);
    }

    // Apply response filter (show only items with response/action)
    if (showOnlyWithResponse) {
      filteredItems = filteredItems.filter(item => !!item.feedback);
    }

    return filteredItems.sort((a: any, b: any) => b.dismissedAt.getTime() - a.dismissedAt.getTime());
  }, [filterDays, medicalResponseFilter, diagnosisFilter, showOnlyWithResponse, dismissedLogs, treatments, protocols, patients]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterDays, medicalResponseFilter, diagnosisFilter, showOnlyWithResponse]);

  // Pagination helpers
  const paginate = <T,>(items: T[], page: number): T[] => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  };

  const getTotalPages = (total: number): number => Math.ceil(total / ITEMS_PER_PAGE);

  // Pagination Component
  const Pagination = ({
    currentPage,
    totalPages,
    onPageChange
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-1 py-3 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
              currentPage === page
                ? 'bg-pink-600 text-white'
                : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

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

    try {
      await dismissedLogsApi.resolveFeedback(item.id);

      // Update local state
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
    } catch (err: any) {
      console.error('Error resolving feedback:', err);
      alert('Erro ao marcar como concluido: ' + (err.message || 'Erro desconhecido'));
    }
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

      // Call API to persist feedback
      await dismissedLogsApi.updateFeedback(selectedLogId, feedbackData);

      // Update local state
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

  // Manual Registration Handlers
  const handleOpenManualModal = () => {
    setManualPatientId('');
    setManualMessage('');
    setManualResponseText('');
    setManualClassification('');
    setManualNeedsMedical('');
    setManualUrgency('');
    setIsManualModalOpen(true);
  };

  const handleSaveManualRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualPatientId) {
      alert("Por favor, selecione um paciente.");
      return;
    }

    if (manualResponseText && (!manualClassification || !manualUrgency || !manualNeedsMedical)) {
      alert("Se houver resposta, preencha todos os campos de classificacao.");
      return;
    }

    setIsSavingManual(true);

    try {
      const selectedPatient = patients.find(p => p.id === manualPatientId);

      const feedbackData = manualResponseText ? {
        text: manualResponseText,
        classification: manualClassification,
        needsMedicalResponse: manualNeedsMedical === 'yes',
        urgency: manualUrgency,
      } : undefined;

      await dismissedLogsApi.createManual({
        patientId: manualPatientId,
        patientName: selectedPatient?.fullName || 'Paciente',
        patientPhone: selectedPatient?.guardian?.phonePrimary,
        message: manualMessage || undefined,
        feedback: feedbackData,
      });

      // Reload data to show new entry
      await loadData();

      // Reset form fields
      clearPatientSelection();
      setManualMessage('');
      setManualResponseText('');
      setManualClassification('');
      setManualNeedsMedical('');
      setManualUrgency('');

      setIsManualModalOpen(false);
    } catch (err: any) {
      console.error('Error saving manual registration:', err);
      alert('Erro ao salvar registro manual: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingManual(false);
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
            Central de Mensagens
          </h1>
          <p className="text-slate-500 mt-1">Registro de todas as acoes e mensagens da regua de contato ja concluidas.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenManualModal}
            className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={18} className="mr-2" />
            Registrar Atendimento Manual
          </button>

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

          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <div className="pl-2 pr-1 text-slate-400">
              <Stethoscope size={18} />
            </div>
            <select
              value={medicalResponseFilter}
              onChange={(e) => setMedicalResponseFilter(e.target.value as 'all' | 'yes' | 'no')}
              className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer py-1.5 pr-8 pl-1"
            >
              <option value="all">Resposta Medica: Todos</option>
              <option value="yes">Resposta Medica: Sim</option>
              <option value="no">Resposta Medica: Nao</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <div className="pl-2 pr-1 text-slate-400">
              <Tag size={18} />
            </div>
            <select
              value={diagnosisFilter}
              onChange={(e) => setDiagnosisFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer py-1.5 pr-8 pl-1"
            >
              <option value="all">Diagnostico: Todos</option>
              {diagnoses.map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOnlyWithResponse}
              onChange={(e) => setShowOnlyWithResponse(e.target.checked)}
              className="w-4 h-4 text-pink-600 rounded border-slate-300 focus:ring-pink-500"
            />
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Com resposta</span>
          </label>
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
                paginate(historyItems, currentPage).map((item: any) => {
                  const fb = item.feedback as PatientFeedback | undefined;
                  const isResolved = fb?.status === 'resolved';
                  const diagColor = item.patientDiagnosis ? getDiagnosisColor(
                    item.patientDiagnosis,
                    diagnoses.find((d: any) => d.name === item.patientDiagnosis)?.color
                  ) : '';
                  // Extract just the bg class for row background
                  const rowBgClass = diagColor ? diagColor.split(' ')[0] : '';

                  return (
                    <tr key={item.id} className={`transition-colors ${isResolved ? 'bg-emerald-50 hover:bg-emerald-100' : rowBgClass ? `${rowBgClass} hover:opacity-80` : 'hover:bg-slate-50'}`}>
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
                        {item.patientDiagnosis && (
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase font-medium ${diagColor}`}>
                            {item.patientDiagnosis}
                          </span>
                        )}
                        {item.patientPhone && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.patientPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {item.origin === 'manual' ? (
                            <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded border border-amber-200 font-medium inline-flex items-center w-fit">
                              <MessageSquare size={12} className="mr-1" />
                              MANUAL
                            </span>
                          ) : item.isMonitoring ? (
                            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-100 font-medium w-fit">
                              {item.protocolName}
                            </span>
                          ) : (
                            <span className="text-slate-600">{item.protocolName}</span>
                          )}
                        </div>
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
          <Pagination
            currentPage={currentPage}
            totalPages={getTotalPages(historyItems.length)}
            onPageChange={setCurrentPage}
          />
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

      {/* MANUAL REGISTRATION MODAL */}
      <Modal open={isManualModalOpen} onClose={() => {
        clearPatientSelection();
        setManualMessage('');
        setManualResponseText('');
        setManualClassification('');
        setManualNeedsMedical('');
        setManualUrgency('');
        setIsManualModalOpen(false);
      }} title="Registrar Atendimento Manual" icon={<Plus size={20} className="text-pink-600" />}>
        <form onSubmit={handleSaveManualRegistration} className="space-y-5">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
            <p className="text-xs text-amber-700">
              <strong>Atendimento Manual:</strong> Use este formulario para registrar mensagens ou atendimentos recebidos fora da regua de contato (ex: WhatsApp avulso).
            </p>
          </div>

          <div className="relative">
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Paciente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={manualPatientSearch}
                onChange={e => {
                  setManualPatientSearch(e.target.value);
                  searchPatients(e.target.value);
                  if (!e.target.value) {
                    setManualPatientId('');
                  }
                }}
                onFocus={() => {
                  if (manualPatientSearch.length >= 2) {
                    searchPatients(manualPatientSearch);
                  }
                }}
                placeholder="Digite o nome do paciente..."
                className={`w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 pr-10 ${manualPatientId ? 'bg-green-50 border-green-300' : ''}`}
              />
              {manualPatientId && (
                <button
                  type="button"
                  onClick={clearPatientSelection}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50"
                  title="Limpar seleção"
                >
                  <X size={16} />
                </button>
              )}
              {!manualPatientId && manualPatientSearch.length >= 2 && (
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              )}
            </div>

            {/* Autocomplete suggestions dropdown */}
            {showPatientSuggestions && manualPatientSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {manualPatientSuggestions.map(patient => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full px-4 py-2 text-left hover:bg-pink-50 flex items-center gap-2 border-b border-slate-100 last:border-b-0"
                  >
                    <User size={14} className="text-slate-400" />
                    <span className="font-medium text-slate-700">{patient.fullName}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected patient indicator */}
            {manualPatientId && (
              <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 size={12} />
                <span>Paciente selecionado</span>
              </div>
            )}

            {/* No results message */}
            {showPatientSuggestions && manualPatientSuggestions.length === 0 && manualPatientSearch.length >= 2 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm text-slate-500">
                Nenhum paciente encontrado
              </div>
            )}

            {/* Hidden required input for form validation */}
            <input type="hidden" required value={manualPatientId} />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Contexto / Mensagem recebida
            </label>
            <textarea
              rows={3}
              value={manualMessage}
              onChange={e => setManualMessage(e.target.value)}
              className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              placeholder="Descreva o contexto ou a mensagem recebida do paciente..."
            />
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-bold text-slate-700 mb-3">Resposta do Paciente (opcional)</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Resposta do paciente (texto livre)
                </label>
                <textarea
                  rows={3}
                  value={manualResponseText}
                  onChange={e => setManualResponseText(e.target.value)}
                  className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Descreva a resposta ou duvida do paciente..."
                />
              </div>

              {manualResponseText && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Classificacao da resposta <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {['Resposta geral', 'Duvida sobre medicacao, dose', 'Sintomas/queixas'].map((opt) => (
                        <label key={opt} className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all text-xs ${manualClassification === opt ? 'bg-pink-50 border-pink-500 ring-1 ring-pink-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                          <input
                            type="radio"
                            name="manualClassification"
                            value={opt}
                            checked={manualClassification === opt}
                            onChange={(e) => setManualClassification(e.target.value as any)}
                            className="w-3 h-3 text-pink-600 focus:ring-pink-500 border-gray-300"
                          />
                          <span className="ml-2 font-medium text-slate-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Precisa de resposta medica? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className={`flex-1 flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all ${manualNeedsMedical === 'yes' ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <input type="radio" name="manualMedical" value="yes" checked={manualNeedsMedical === 'yes'} onChange={() => setManualNeedsMedical('yes')} className="sr-only" />
                        <Stethoscope size={14} className="mr-1" /> Sim
                      </label>
                      <label className={`flex-1 flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all ${manualNeedsMedical === 'no' ? 'bg-slate-100 border-slate-400 text-slate-800 ring-1 ring-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <input type="radio" name="manualMedical" value="no" checked={manualNeedsMedical === 'no'} onChange={() => setManualNeedsMedical('no')} className="sr-only" />
                        Nao
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      Urgencia <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer text-center transition-all ${manualUrgency === 'Sem urgencia' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input type="radio" name="manualUrgency" value="Sem urgencia" checked={manualUrgency === 'Sem urgencia'} onChange={(e) => setManualUrgency(e.target.value as any)} className="sr-only" />
                        <span className="text-xs font-bold">Sem urgencia</span>
                      </label>
                      <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer text-center transition-all ${manualUrgency === 'Atencao' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input type="radio" name="manualUrgency" value="Atencao" checked={manualUrgency === 'Atencao'} onChange={(e) => setManualUrgency(e.target.value as any)} className="sr-only" />
                        <span className="text-xs font-bold flex items-center"><AlertTriangle size={10} className="mr-1" /> Atencao</span>
                      </label>
                      <label className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer text-center transition-all ${manualUrgency === 'Urgente' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                        <input type="radio" name="manualUrgency" value="Urgente" checked={manualUrgency === 'Urgente'} onChange={(e) => setManualUrgency(e.target.value as any)} className="sr-only" />
                        <span className="text-xs font-bold flex items-center"><AlertCircle size={10} className="mr-1" /> Urgente</span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              disabled={isSavingManual}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingManual}
              className="flex items-center px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-bold shadow-md shadow-pink-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingManual ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
              {isSavingManual ? 'Salvando...' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HistoryList;
