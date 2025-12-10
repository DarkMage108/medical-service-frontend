import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, dosesApi, patientsApi, treatmentsApi, protocolsApi, documentsApi, purchaseRequestsApi, dismissedLogsApi } from '../services/api';
import { DoseStatus, SurveyStatus, Dose, TreatmentStatus, ProtocolCategory, PaymentStatus, DismissedLog, ConsentDocument, Patient, Treatment, Protocol } from '../types';
import { getStatusColor, diffInDays, formatDate, getDiagnosisColor, addDays, DOSE_STATUS_LABELS, PAYMENT_STATUS_LABELS, SURVEY_STATUS_LABELS } from '../constants';
import { UserCheck, MessageSquare, Phone, ExternalLink, Activity, ShoppingCart } from 'lucide-react';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import Modal from '../components/ui/Modal';
import {
  AlertCircle, CheckCircle2, UserX, MessageCircle, ChevronRight,
  Calendar, Clock, FileWarning, UploadCloud, Edit, CalendarRange,
  Syringe, Bike, Copy, Check, Stethoscope, Save, Loader2, Trophy, User, X
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Data States
  const [doses, setDoses] = useState<Dose[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [documents, setDocuments] = useState<ConsentDocument[]>([]);
  const [dismissedLogs, setDismissedLogs] = useState<DismissedLog[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [selectedGuardianName, setSelectedGuardianName] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [selectedDoseId, setSelectedDoseId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDelivered, setIsDelivered] = useState(false);

  const [doseModalOpen, setDoseModalOpen] = useState(false);
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [isSavingDose, setIsSavingDose] = useState(false);

  // Consultation Modal States
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [selectedConsultDoseId, setSelectedConsultDoseId] = useState<string | null>(null);
  const [consultDateInput, setConsultDateInput] = useState('');
  const [consultPatientName, setConsultPatientName] = useState('');

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isMessageCopied, setIsMessageCopied] = useState(false);

  // Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetPatientId, setUploadTargetPatientId] = useState<string | null>(null);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);

  // Form States
  const [editDoseDate, setEditDoseDate] = useState('');
  const [editDoseLot, setEditDoseLot] = useState('');
  const [editDoseStatus, setEditDoseStatus] = useState<DoseStatus | ''>('');
  const [editDosePayment, setEditDosePayment] = useState<PaymentStatus | ''>('');
  const [editIsLast, setEditIsLast] = useState(false);
  const [editNurse, setEditNurse] = useState('no');
  const [editSurveyStatus, setEditSurveyStatus] = useState<SurveyStatus | ''>('');
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  // Load data from API
  const loadData = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);

    const [
    dosesRes,
    patientsRes,
    treatmentsRes,
    protocolsRes,
    documentsRes,
    purchaseRes,
    dismissedRes
    ] = await Promise.all([
    dosesApi.getAll(),
    patientsApi.getAll(),
    treatmentsApi.getAll(),
    protocolsApi.getAll(),
    documentsApi.getAll(),
    purchaseRequestsApi.getAll(),
    dismissedLogsApi.getAll()
    ]);

    setDoses(dosesRes.data || []);
    setPatients(patientsRes.data || []);
    setTreatments(treatmentsRes.data || []);
    setProtocols(protocolsRes.data || []);
    setDocuments(documentsRes.data || []);
    setDismissedLogs(dismissedRes.data || []);
    setPendingPurchases((purchaseRes.data || []).filter((r: any) => r.status === 'PENDING').length);
  } catch (err: any) {
    setError(err.message || 'Erro ao carregar dados');
    console.error('Failed to load dashboard data:', err);
  } finally {
    setIsLoading(false);
  }
  }, []);

  useEffect(() => {
  loadData();
  }, [loadData]);

  // Quick Update Handler
  const handleQuickUpdate = async (doseId: string, field: 'status' | 'paymentStatus', value: string) => {
    try {
      const updates = { [field]: value };
      const updated = await dosesApi.update(doseId, updates);
      setDoses(prev => prev.map(d => d.id === doseId ? { ...d, ...updated } : d));
    } catch (err: any) {
      console.error('Error updating dose:', err);
      setError(err.message || 'Erro ao atualizar dose');
    }
  };

  // Helpers
  const getPatient = (treatmentId: string) => {
  const treatment = treatments.find(t => t.id === treatmentId);
  if (!treatment) return null;
  return patients.find(p => p.id === treatment.patientId);
  };

  const getPatientByTreatmentId = (treatmentId: string) => {
  const t = treatments.find(tr => tr.id === treatmentId);
  return t ? patients.find(p => p.id === t.patientId) : null;
  };

  const getProtocolName = (treatmentId: string) => {
  const t = treatments.find(tr => tr.id === treatmentId);
  if (!t) return '-';
  const p = protocols.find(proto => proto.id === t.protocolId);
  return p ? p.name : '-';
  };

  // Address Logic
  const handleViewAddress = (e: React.MouseEvent, treatmentId: string, doseId: string) => {
  e.stopPropagation();
  const patient = getPatientByTreatmentId(treatmentId);
  if (patient && patient.address) {
    const a = patient.address;
    const fullText = `${a.street}, ${a.number}${a.complement ? ' - ' + a.complement : ''} - ${a.neighborhood}, ${a.city} - ${a.state}, CEP: ${a.zipCode}`;
    setSelectedAddress(fullText);
    setSelectedPatientName(patient.fullName);
    setSelectedGuardianName(patient.guardian.fullName);
    setSelectedPhone(patient.guardian.phonePrimary);
    setSelectedDoseId(doseId);
    setAddressModalOpen(true);
    setIsCopied(false);
    setIsDelivered(false);
  } else {
    alert('EndereÃ§o nÃ£o cadastrado para este paciente.');
  }
  };

  const handleCopyAddress = () => {
  navigator.clipboard.writeText(selectedAddress);
  setIsCopied(true);
  setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
  if (selectedPhone) {
    const cleanPhone = selectedPhone.replace(/\D/g, '');
    window.open(`https://wa.me/+55${cleanPhone}`, '_blank');
  }
  };

  const handleConfirmDelivery = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.checked && selectedDoseId) {
    setIsDelivered(true);
    await handleQuickUpdate(selectedDoseId, 'paymentStatus', PaymentStatus.PAID);
    setTimeout(() => {
    setAddressModalOpen(false);
    setIsDelivered(false);
    }, 800);
  }
  };

  // Upload Logic
  const handleTriggerUpload = (patientId: string) => {
  setUploadTargetPatientId(patientId);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !uploadTargetPatientId) return;

  if (file.size > MAX_FILE_SIZE_BYTES) {
    alert(`O arquivo Ã© muito grande. O limite mÃ¡ximo Ã© de ${MAX_FILE_SIZE_MB}MB.`);
    return;
  }

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    alert('Formato invÃ¡lido. Apenas PDF ou Word.');
    return;
  }

  setIsUploadingGlobal(true);

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', uploadTargetPatientId);

    const newDoc = await documentsApi.upload(uploadTargetPatientId, file);
    setDocuments(prev => [...prev, newDoc]);
  } catch (err: any) {
    setError(err.message || 'Erro ao fazer upload');
  } finally {
    setIsUploadingGlobal(false);
    setUploadTargetPatientId(null);
  }
  };

  // Edit Dose Modal Logic
  const handleOpenDoseModal = (e: React.MouseEvent, dose: Dose) => {
  e.stopPropagation();
  setEditingDoseId(dose.id);
  setEditDoseDate(dose.applicationDate.split('T')[0]);
  setEditDoseLot(dose.lotNumber);
  setEditDoseStatus(dose.status);
  setEditDosePayment(dose.paymentStatus);
  setEditIsLast(dose.isLastBeforeConsult);
  setEditNurse(dose.nurse ? 'yes' : 'no');
  setEditSurveyStatus(dose.surveyStatus);
  setEditScore(dose.surveyScore || 0);
  setEditComment(dose.surveyComment || '');
  setDoseModalOpen(true);
  };

  const handleSaveDoseFull = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingDoseId) return;

  setIsSavingDose(true);

  try {
    const isNurse = editNurse === 'yes';
    const finalSurveyStatus = !isNurse ? SurveyStatus.NOT_SENT : (editSurveyStatus || SurveyStatus.NOT_SENT);

    const updates: Partial<Dose> = {
    applicationDate: new Date(editDoseDate).toISOString(),
    lotNumber: editDoseLot,
    status: editDoseStatus as DoseStatus,
    paymentStatus: editDosePayment as PaymentStatus,
    isLastBeforeConsult: editIsLast,
    nurse: isNurse,
    surveyStatus: finalSurveyStatus,
    surveyScore: Number(editScore),
    surveyComment: editComment
    };

    const updated = await dosesApi.update(editingDoseId, updates);
    setDoses(prev => prev.map(d => d.id === editingDoseId ? updated : d));
    setDoseModalOpen(false);
  } catch (err: any) {
    setError(err.message || 'Erro ao salvar dose');
  } finally {
    setIsSavingDose(false);
  }
  };

  // Consult Modal Logic
  const handleOpenConsultModal = (e: React.MouseEvent, dose: Dose) => {
  e.stopPropagation();
  const patient = getPatientByTreatmentId(dose.treatmentId);
  setSelectedConsultDoseId(dose.id);
  setConsultPatientName(patient?.fullName || 'Paciente');
  setConsultDateInput(dose.consultationDate ? dose.consultationDate.split('T')[0] : '');
  setConsultModalOpen(true);
  };

  const handleSaveConsult = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedConsultDoseId || !consultDateInput) return;

  setIsSavingDose(true);

  try {
    const updates: Partial<Dose> = {
    consultationDate: new Date(consultDateInput).toISOString()
    };

    const updated = await dosesApi.update(selectedConsultDoseId, updates);
    setDoses(prev => prev.map(d => d.id === selectedConsultDoseId ? updated : d));
    setConsultModalOpen(false);
  } catch (err: any) {
    setError(err.message || 'Erro ao salvar consulta');
  } finally {
    setIsSavingDose(false);
  }
  };

  // Message Modal Logic
  const handleOpenMessageModal = (contact: any) => {
  setSelectedContact(contact);
  setIsMessageCopied(false);
  setMessageModalOpen(true);
  };

  const handleCopyMessage = () => {
  if (selectedContact) {
    navigator.clipboard.writeText(selectedContact.message);
    setIsMessageCopied(true);
    setTimeout(() => setIsMessageCopied(false), 2000);
  }
  };

  const handleDismissContact = async (e: React.MouseEvent | null, contactId: string) => {
  if (e) e.stopPropagation();
  try {
    await dismissedLogsApi.dismiss(contactId);
    setDismissedLogs(prev => [...prev, { id: `dismissed_${Date.now()}`, contactId, dismissedAt: new Date().toISOString() }]);
    if (messageModalOpen) setMessageModalOpen(false);
  } catch (err: any) {
    setError(err.message || 'Erro ao dispensar contato');
  }
  };

  const handleWhatsAppFromMessageModal = () => {
  if (selectedContact && selectedContact.patientPhone) {
    const cleanPhone = selectedContact.patientPhone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(selectedContact.message);
    window.open(`https://wa.me/55${cleanPhone}?text=${encodedMessage}`, '_blank');
  }
  };

  // Data Logic
  const TODAY = new Date();

  // Stats
  const patientStats = useMemo(() => {
  const total = patients.length;
  const active = patients.filter(p => p.active).length;
  return { active, inactive: total - active };
  }, [patients]);

  // Overdue Doses
  const overdueDoses = useMemo(() => {
  const latestDosesMap: Record<string, Dose> = {};
  doses.forEach(dose => {
    if (dose.status !== DoseStatus.APPLIED) return;
    const existing = latestDosesMap[dose.treatmentId];
    if (!existing || new Date(dose.applicationDate) > new Date(existing.applicationDate)) {
    latestDosesMap[dose.treatmentId] = dose;
    }
  });
  return Object.values(latestDosesMap).filter(d => {
    const nextDate = new Date(d.calculatedNextDate);
    return diffInDays(nextDate, TODAY) < 0;
  });
  }, [doses]);

  // Pending Surveys
  const pendingSurveys = useMemo(() => {
  return doses.filter(d => {
    if (!d.nurse) return false;
    const isPendingStatus = d.surveyStatus === SurveyStatus.WAITING || d.surveyStatus === SurveyStatus.SENT || d.surveyStatus === SurveyStatus.NOT_SENT;
    const isZeroScore = !d.surveyScore || d.surveyScore === 0;
    return isPendingStatus || isZeroScore;
  });
  }, [doses]);

  // Approaching Consults
  const approachingConsults = useMemo(() => {
  return doses.filter(d => {
    if (!d.isLastBeforeConsult) return false;
    if (!d.consultationDate) return true;
    const consultDate = new Date(d.consultationDate);
    const diff = diffInDays(consultDate, TODAY);
    return diff >= 0 && diff <= 30;
  }).sort((a, b) => {
    if (!a.consultationDate) return -1;
    if (!b.consultationDate) return 1;
    return new Date(a.consultationDate).getTime() - new Date(b.consultationDate).getTime();
  });
  }, [doses]);

  // NPS
  const npsMetrics = useMemo(() => {
  const answeredDoses = doses.filter(d => d.surveyScore !== undefined && d.surveyScore > 0 && d.surveyStatus === SurveyStatus.ANSWERED);
  const total = answeredDoses.length;
  if (total === 0) return { score: 0, total: 0 };
  let promoters = 0;
  let detractors = 0;
  answeredDoses.forEach(d => {
    const s = d.surveyScore || 0;
    if (s >= 9) promoters++;
    else if (s <= 6) detractors++;
  });
  const nps = Math.round(((promoters - detractors) / total) * 100);
  return { score: nps, total: total };
  }, [doses]);

  // Patients by Diagnosis
  const patientsByDiagnosis = useMemo(() => {
  const counts: Record<string, number> = {};
  patients.filter(p => p.active).forEach(p => {
    const diag = p.mainDiagnosis || 'NÃ£o Informado';
    counts[diag] = (counts[diag] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [patients]);

  // Consent Missing
  const patientsMissingConsent = useMemo(() => {
  return patients.filter(p => {
    if (!p.active) return false;
    const diag = (p.mainDiagnosis || '').toLowerCase();
    const isTarget = diag.includes('puberdade precoce') || diag.includes('baixa estatura');
    if (!isTarget) return false;
    const hasDoc = documents.some(doc => doc.patientId === p.id);
    return !hasDoc;
  });
  }, [patients, documents]);

  // Activity Window
  const highActivityDoses = useMemo(() => {
  const startRange = new Date();
  startRange.setDate(startRange.getDate() - 7);
  const endRange = new Date();
  endRange.setDate(endRange.getDate() + 7);
  return doses.filter(d => {
    if (d.status === DoseStatus.APPLIED && d.paymentStatus === PaymentStatus.PAID) {
    return false;
    }
    const appDate = new Date(d.applicationDate);
    const inRange = appDate >= startRange && appDate <= endRange;
    const isOld = appDate < startRange;
    const hasPendingStatus = d.status === DoseStatus.PENDING;
    const hasPendingPayment = d.paymentStatus !== PaymentStatus.PAID;
    return inRange || (isOld && (hasPendingStatus || hasPendingPayment));
  }).sort((a, b) => new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime());
  }, [doses]);

  // Upcoming Contacts
  const upcomingContacts = useMemo(() => {
  const contacts: any[] = [];
  const activeTreatments = treatments.filter(t => t.status === TreatmentStatus.ONGOING);

  activeTreatments.forEach(t => {
    const proto = protocols.find(p => p.id === t.protocolId);
    if (!proto || !proto.milestones || proto.milestones.length === 0) return;
    const startDate = new Date(t.startDate);

    proto.milestones.forEach(m => {
    const contactId = `${t.id}_m_${m.day}`;

    if (dismissedLogs.some(log => log.contactId === contactId)) return;

    const contactDate = addDays(startDate, m.day);
    const diff = diffInDays(contactDate, TODAY);

    if (diff >= -60) {
      const patient = patients.find(p => p.id === t.patientId);
      if (patient) {
      contacts.push({
        id: contactId,
        treatmentId: t.id,
        patientName: patient.fullName,
        patientGuardian: patient.guardian.fullName,
        patientPhone: patient.guardian.phonePrimary,
        protocolName: proto.name,
        message: m.message,
        date: contactDate,
        diffDays: diff,
        isMonitoring: proto.category === ProtocolCategory.MONITORING
      });
      }
    }
    });
  });
  return contacts.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [treatments, protocols, patients, dismissedLogs]);

  const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
    <Loader2 size={32} className="animate-spin text-pink-600" />
    <span className="ml-3 text-slate-600">Carregando dashboard...</span>
    </div>
  );
  }

  return (
  <div className="space-y-6 pb-10">

    {/* GLOBAL HIDDEN FILE INPUT FOR DIRECT UPLOAD */}
    <input
    type="file"
    ref={fileInputRef}
    className="hidden"
    accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    onChange={handleFileChange}
    />

    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
    <div className="flex gap-2">
      <select className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500">
      <option>Todos</option>
      <option>Ãšltimos 30 dias</option>
      <option>Ãšltimos 7 dias</option>
      </select>
    </div>
    </div>

    {error && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
      <AlertCircle size={20} className="text-red-600 mr-3" />
      <span className="text-red-700">{error}</span>
      <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">&times;</button>
    </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <KpiCard
      title="ReposiÃ§Ã£o de Estoque" subtitle="Pedidos AutomÃ¡ticos" value={pendingPurchases}
      icon={<ShoppingCart size={20} className={pendingPurchases > 0 ? "text-red-600 animate-pulse" : "text-emerald-600"} />}
      accentColor={pendingPurchases > 0 ? "red" : "green"}
      onClick={() => navigate('/estoque', { state: { activeTab: 'orders' } })}
    />
    <KpiCard
      title="Pacientes Ativos" subtitle="Em acompanhamento" value={patientStats.active}
      icon={<UserCheck size={20} className="text-green-600" />} accentColor="green"
      onClick={() => navigate('/pacientes', { state: { statusFilter: 'active' } })}
    />
    <KpiCard
      title="Pacientes Inativos" subtitle="Sem tratamento vigente" value={patientStats.inactive}
      icon={<UserX size={20} className="text-gray-600" />} accentColor="gray"
      onClick={() => navigate('/pacientes', { state: { statusFilter: 'inactive' } })}
    />
    <KpiCard
      title="Termo Pendente" subtitle="Requer upload" value={patientsMissingConsent.length}
      icon={<FileWarning size={20} className="text-cyan-600" />} accentColor="cyan"
      onClick={() => scrollToSection('section-consent')}
    />
    <KpiCard
      title="Doses em Atraso" subtitle="Requer atenÃ§Ã£o" value={overdueDoses.length}
      icon={<AlertCircle size={20} className="text-red-600" />} accentColor="red"
      onClick={() => scrollToSection('section-overdue')}
    />
    <KpiCard
      title="Agendar Consulta" subtitle="Consultas agendadas" value={approachingConsults.length}
      icon={<Calendar size={20} className="text-purple-600" />} accentColor="purple"
      onClick={() => scrollToSection('section-consults')}
    />
    <KpiCard
      title="Enviar Pesquisa" subtitle="Status: Enviado" value={pendingSurveys.length}
      icon={<MessageCircle size={20} className="text-blue-600" />} accentColor="blue"
      onClick={() => scrollToSection('section-surveys')}
    />

    {/* NPS Card */}
    <div
      onClick={() => scrollToSection('section-surveys')}
      className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] group"
    >
      <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-medium text-slate-500 group-hover:text-emerald-800 transition-colors">NPS Enfermagem</h3>
      <div className="p-2 bg-emerald-50 rounded-lg">
        <Trophy className="text-emerald-600" size={20} />
      </div>
      </div>
      <div className="flex items-end justify-between">
      <p className="text-3xl font-bold text-slate-800">{npsMetrics.score}</p>
      <div className="text-right">
        <p className="text-xs font-bold text-emerald-600">NPS</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Base: {npsMetrics.total} respostas</p>
      </div>
      </div>
    </div>
    </div>

    {/* Activity Window */}
    <SectionCard
    title="Janela de Atividade (Doses +/- 7 dias)"
    icon={<CalendarRange size={18} className="text-amber-600" />}
    countBadge={highActivityDoses.length} badgeColor="bg-amber-100 text-amber-800" headerBg="bg-amber-50/30"
    >
    <div className="p-2 bg-amber-50 text-amber-800 text-xs text-center border-b border-amber-100">
      Doses marcadas como <b>Aplicada</b> e <b>PAGO</b> sÃ£o removidas desta lista automaticamente.
    </div>
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase sticky top-0 z-10">
      <tr>
        <th className="px-6 py-3">Data</th>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">Telefone</th>
        <th className="px-6 py-3">Protocolo</th>
        <th className="px-6 py-3">Status Dose</th>
        <th className="px-6 py-3">Pagamento</th>
        <th className="px-6 py-3">Enf.</th>
        <th className="px-6 py-3 text-right">AÃ§Ã£o</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {highActivityDoses.length === 0 ? (
        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Nenhuma pendÃªncia operacional para a semana.</td></tr>
      ) : (
        highActivityDoses.map((dose) => {
        const patient = getPatientByTreatmentId(dose.treatmentId);
        return (
          <tr key={dose.id} className="hover:bg-amber-50/20 transition-colors" onClick={() => navigate(`/tratamento/${dose.treatmentId}`)}>
          <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
            {formatDate(dose.applicationDate)}
          </td>
          <td className="px-6 py-4 font-medium text-slate-900">
            <div className="flex items-center gap-2">
            {patient?.fullName}
            {patient?.address && (
              <button
              onClick={(e) => handleViewAddress(e, dose.treatmentId, dose.id)}
              className="p-1 rounded-full text-pink-600 bg-pink-50 hover:bg-pink-100 transition-colors"
              title="Ver EndereÃ§o e Entrega"
              >
              <Bike size={16} />
              </button>
            )}
            </div>
          </td>
          <td className="px-6 py-4 font-mono text-slate-600 whitespace-nowrap">
            {patient?.guardian.phonePrimary}
          </td>
          <td className="px-6 py-4 text-xs text-slate-600 max-w-[150px] truncate" title={getProtocolName(dose.treatmentId)}>
            {getProtocolName(dose.treatmentId)}
          </td>
          <td className="px-6 py-4">
            <select
            value={dose.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleQuickUpdate(dose.id, 'status', e.target.value)}
            className={`text-xs px-2 py-1 rounded-full border-0 font-semibold cursor-pointer focus:ring-2 focus:ring-amber-500 ${getStatusColor(dose.status)}`}
            >
            {Object.values(DoseStatus).map(s => <option key={s} value={s}>{DOSE_STATUS_LABELS[s]}</option>)}
            </select>
          </td>
          <td className="px-6 py-4">
            <select
            value={dose.paymentStatus}
            disabled={dose.status === DoseStatus.NOT_ACCEPTED}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleQuickUpdate(dose.id, 'paymentStatus', e.target.value)}
            className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:ring-2 focus:ring-amber-500 ${getStatusColor(dose.paymentStatus)} ${dose.status === DoseStatus.NOT_ACCEPTED ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
            <option value="" disabled>Selecione...</option>
            {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>)}
            </select>
          </td>
          <td className="px-6 py-4">
            <button
            onClick={(e) => handleOpenDoseModal(e, dose)}
            className={`p-1.5 rounded-full transition-colors ${dose.nurse ? 'bg-pink-100 text-pink-600 hover:bg-pink-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            title="Editar Detalhes (Enfermagem, Dose, Pesquisa)"
            >
            <Stethoscope size={18} />
            </button>
          </td>
          <td className="px-6 py-4 text-right">
            <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tratamento/${dose.treatmentId}`, { state: { editDoseId: dose.id } });
            }}
            className="inline-flex items-center text-amber-700 hover:text-amber-900 text-xs font-bold border border-amber-200 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
            >
            <Edit size={14} className="mr-1" /> Editar
            </button>
          </td>
          </tr>
        );
        })
      )}
      </tbody>
    </table>
    </SectionCard>

    {/* Upcoming Messages */}
    <SectionCard
    title="PrÃ³ximas Mensagens"
    icon={<MessageSquare size={18} className="text-indigo-600" />}
    countBadge={upcomingContacts.length} badgeColor="bg-indigo-100 text-indigo-800" headerBg="bg-indigo-50/30"
    >
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
      <tr>
        <th className="px-6 py-3">Data Prevista</th>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">Contato</th>
        <th className="px-6 py-3">Protocolo</th>
        <th className="px-6 py-3">AÃ§Ã£o / Mensagem</th>
        <th className="px-6 py-3 text-right">AÃ§Ã£o</th>
        <th className="px-6 py-3 text-right">Detalhes</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {upcomingContacts.length === 0 ? (
        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Nenhum ponto de contato prÃ³ximo.</td></tr>
      ) : (
        upcomingContacts.map(contact => (
        <tr
          key={contact.id}
          onClick={() => handleOpenMessageModal(contact)}
          className="hover:bg-indigo-50/20 cursor-pointer transition-colors"
        >
          <td className="px-6 py-4 font-bold text-slate-800">
          {formatDate(contact.date.toISOString())}
          <span className="block text-xs font-normal text-slate-500">
            {contact.diffDays === 0 ? 'Hoje' : (contact.diffDays > 0 ? `Em ${contact.diffDays} dias` : `HÃ¡ ${Math.abs(contact.diffDays)} dias`)}
          </span>
          </td>
          <td className="px-6 py-4 font-medium text-slate-800">
          {contact.patientName}
          </td>
          <td className="px-6 py-4 text-slate-600">
          <div className="flex items-center gap-1">
            <Phone size={12} />
            {contact.patientPhone}
          </div>
          </td>
          <td className="px-6 py-4">
          {contact.isMonitoring ? (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded border border-blue-200">{contact.protocolName}</span>
          ) : (
            <span className="text-slate-600">{contact.protocolName}</span>
          )}
          </td>
          <td className="px-6 py-4">
          <div className="flex items-center text-indigo-700 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
            <MessageCircle size={14} className="mr-2 flex-shrink-0" />
            <span className="truncate max-w-[250px]">{contact.message}</span>
          </div>
          </td>
          <td className="px-6 py-4 text-right">
          <button
            onClick={(e) => handleDismissContact(e, contact.id)}
            className="text-green-600 bg-green-50 hover:bg-green-100 p-2 rounded-full transition-colors border border-green-200"
            title="Concluir / Dispensar"
          >
            <Check size={18} />
          </button>
          </td>
          <td className="px-6 py-4 text-right">
          <span className="text-slate-400 hover:text-indigo-600 transition-colors">
            <ChevronRight size={18} />
          </span>
          </td>
        </tr>
        ))
      )}
      </tbody>
    </table>
    </SectionCard>

    {/* Grid (Diagnosis / Survey) */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Patients by Diagnosis */}
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-1">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center">
      <Activity size={18} className="mr-2 text-pink-600" />
      Pacientes Ativos por DiagnÃ³stico
      </h3>
      <div className="space-y-4">
      {patientsByDiagnosis.map((item) => (
        <div
        key={item.name}
        onClick={() => navigate('/pacientes', { state: { diagnosisFilter: item.name } })}
        className="group cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors"
        >
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-slate-700 group-hover:text-pink-600 transition-colors">{item.name}</span>
          <span className="font-bold text-slate-900">{item.value}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div className={`h-2.5 rounded-full`} style={{ width: `${(item.value / patients.filter(p => p.active).length) * 100}%` }}>
          <div className={`h-full w-full ${getDiagnosisColor(item.name).split(' ')[0]}`}></div>
          </div>
        </div>
        </div>
      ))}
      </div>
    </div>

    {/* Pending Surveys */}
    <div className="lg:col-span-2">
      <SectionCard id="section-surveys" title="Aguardando Resposta da Pesquisa" icon={<MessageCircle size={18} className="text-blue-600" />} countBadge={pendingSurveys.length} badgeColor="bg-blue-100 text-blue-800" headerBg="bg-blue-50/30">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
        <tr>
          <th className="px-6 py-3">Paciente</th>
          <th className="px-6 py-3">ResponsÃ¡vel</th>
          <th className="px-6 py-3 text-right">AÃ§Ã£o</th>
        </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
        {pendingSurveys.length === 0 ? (
          <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Nenhuma pesquisa pendente.</td></tr>
        ) : (
          pendingSurveys.map(dose => {
          const patient = getPatientByTreatmentId(dose.treatmentId);
          return (
            <tr key={dose.id} onClick={() => navigate(`/tratamento/${dose.treatmentId}`, { state: { editDoseId: dose.id } })} className="hover:bg-blue-50/30 cursor-pointer transition-colors">
            <td className="px-6 py-3 font-medium text-slate-800">{patient?.fullName || 'Desconhecido'}</td>
            <td className="px-6 py-3 text-slate-600">
              <div>{patient?.guardian.fullName}</div>
              <div className="text-xs text-slate-400">{patient?.guardian.phonePrimary}</div>
            </td>
            <td className="px-6 py-3 text-right">
              <span className="text-blue-600 text-xs font-bold hover:underline">Registrar Resposta</span>
            </td>
            </tr>
          );
          })
        )}
        </tbody>
      </table>
      </SectionCard>
    </div>
    </div>

    {/* Consent Pending */}
    <SectionCard id="section-consent" title="PendÃªncia: Termo de Consentimento" icon={<FileWarning size={18} className="text-cyan-600" />} countBadge={patientsMissingConsent.length} badgeColor="bg-cyan-100 text-cyan-800" headerBg="bg-cyan-50/30">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
      <tr>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">DiagnÃ³stico</th>
        <th className="px-6 py-3">ResponsÃ¡vel</th>
        <th className="px-6 py-3 text-right">AÃ§Ã£o</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {patientsMissingConsent.length === 0 ? (
        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Todos os pacientes possuem termo anexado.</td></tr>
      ) : (
        patientsMissingConsent.map(patient => (
        <tr key={patient.id} onClick={() => navigate(`/pacientes/${patient.id}`)} className="hover:bg-cyan-50/20 cursor-pointer transition-colors">
          <td className="px-6 py-4 font-medium text-slate-800">{patient.fullName}</td>
          <td className="px-6 py-4">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getDiagnosisColor(patient.mainDiagnosis)}`}>
            {patient.mainDiagnosis}
          </span>
          </td>
          <td className="px-6 py-4 text-slate-600">{patient.guardian.fullName}</td>
          <td className="px-6 py-4 text-right">
          {isUploadingGlobal && uploadTargetPatientId === patient.id ? (
            <span className="inline-flex items-center text-cyan-600 text-xs font-bold">
            <Loader2 size={14} className="mr-1 animate-spin" /> Enviando...
            </span>
          ) : (
            <button
            onClick={(e) => {
              e.stopPropagation();
              handleTriggerUpload(patient.id);
            }}
            className="inline-flex items-center text-cyan-600 hover:text-cyan-800 text-xs font-bold border border-cyan-200 bg-white px-3 py-1.5 rounded-lg hover:bg-cyan-50 transition-colors cursor-pointer"
            >
            <UploadCloud size={14} className="mr-1" /> Anexar Termo
            </button>
          )}
          </td>
        </tr>
        ))
      )}
      </tbody>
    </table>
    </SectionCard>

    {/* Consults */}
    <SectionCard id="section-consults" title="Agendar Consulta" icon={<Calendar size={18} className="text-purple-600" />} countBadge={approachingConsults.length} badgeColor="bg-purple-100 text-purple-800" headerBg="bg-purple-50/30">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
      <tr>
        <th className="px-6 py-3">Data Agendada</th>
        <th className="px-6 py-3">Faltam</th>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">ResponsÃ¡vel</th>
        <th className="px-6 py-3 text-right">AÃ§Ã£o</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {approachingConsults.length === 0 ? (
        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma consulta prÃ³xima agendada.</td></tr>
      ) : (
        approachingConsults.map(dose => {
        const patient = getPatient(dose.treatmentId);
        const hasDate = !!dose.consultationDate;
        let daysLeft = 0;
        if (hasDate) {
          const consultDate = new Date(dose.consultationDate!);
          daysLeft = diffInDays(consultDate, TODAY);
        }
        return (
          <tr key={dose.id} onClick={() => navigate(`/tratamento/${dose.treatmentId}`)} className="hover:bg-purple-50/20 cursor-pointer transition-colors">
          <td className="px-6 py-4 font-bold text-purple-800">
            {hasDate ? formatDate(dose.consultationDate) : <span className="text-orange-600 animate-pulse">Pendente / A Agendar</span>}
          </td>
          <td className="px-6 py-4">
            {hasDate ? (
            <span className="flex items-center text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded w-fit">
              <Clock size={12} className="mr-1" /> {daysLeft} dias
            </span>
            ) : (
            <button
              onClick={(e) => handleOpenConsultModal(e, dose)}
              className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 transition-colors"
            >
              Agendar
            </button>
            )}
          </td>
          <td className="px-6 py-4 font-medium text-slate-800">{patient?.fullName}</td>
          <td className="px-6 py-4 text-slate-600">{patient?.guardian.fullName}</td>
          <td className="px-6 py-4 text-right">
            {hasDate ? (
            <span className="inline-flex items-center text-slate-400 hover:text-pink-600 transition-colors">
              Ver <ChevronRight size={16} className="ml-1" />
            </span>
            ) : (
            <button
              onClick={(e) => handleOpenConsultModal(e, dose)}
              className="inline-flex items-center text-purple-600 hover:text-purple-800 font-bold text-xs"
            >
              <Calendar size={14} className="mr-1" /> Agendar Agora
            </button>
            )}
          </td>
          </tr>
        )
        })
      )}
      </tbody>
    </table>
    </SectionCard>

    {/* Overdue Doses */}
    <SectionCard id="section-overdue" title="Doses em Atraso" icon={<AlertCircle size={18} className="text-red-600" />} countBadge={overdueDoses.length} badgeColor="bg-red-100 text-red-800" headerBg="bg-red-50/30">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
      <tr>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">Contato</th>
        <th className="px-6 py-3">Atraso (Ãšlt. Dose)</th>
        <th className="px-6 py-3 text-right">AÃ§Ã£o</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {overdueDoses.length === 0 ? (
        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhuma dose atrasada.</td></tr>
      ) : (
        overdueDoses.map(dose => {
        const patient = getPatient(dose.treatmentId);
        const nextDate = new Date(dose.calculatedNextDate);
        const daysDiff = diffInDays(nextDate, TODAY);
        return (
          <tr key={dose.id} onClick={() => navigate(`/tratamento/${dose.treatmentId}`)} className="hover:bg-red-50/20 cursor-pointer transition-colors group">
          <td className="px-6 py-4">
            <div className="font-bold text-slate-900">{patient?.fullName || 'Desconhecido'}</div>
            <div className="text-xs text-slate-500">{patient?.mainDiagnosis}</div>
          </td>
          <td className="px-6 py-4">
            <div className="text-slate-700">{patient?.guardian.fullName}</div>
            <div className="text-xs font-mono text-slate-500">{patient?.guardian.phonePrimary}</div>
          </td>
          <td className="px-6 py-4">
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-xs">{Math.abs(daysDiff)} dias</span>
          </td>
          <td className="px-6 py-4 text-right">
            <span className="inline-flex items-center text-slate-400 group-hover:text-pink-600 transition-colors">
            Abrir <ChevronRight size={16} className="ml-1" />
            </span>
          </td>
          </tr>
        );
        })
      )}
      </tbody>
    </table>
    </SectionCard>

    {/* MODALS */}
    <Modal open={addressModalOpen} onClose={() => setAddressModalOpen(false)} title="EndereÃ§o de Entrega" icon={<Bike size={18} className="text-amber-600" />}>
    <div className="mb-4">
      <p className="text-xs uppercase font-bold text-slate-400 mb-1">ResponsÃ¡vel</p>
      <p className="font-bold text-slate-800 text-lg">{selectedGuardianName}</p>
    </div>
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 font-mono text-sm text-slate-700 break-words">
      {selectedAddress}
    </div>
    <div className="flex gap-2 flex-col">
      <button
      onClick={handleOpenWhatsApp}
      className="w-full flex items-center justify-center py-2.5 rounded-lg font-medium transition-colors bg-green-500 text-white hover:bg-green-600 shadow-sm"
      >
      <MessageCircle size={18} className="mr-2" />
      WhatsApp ResponsÃ¡vel
      </button>
      <button onClick={handleCopyAddress} className={`w-full flex items-center justify-center py-2.5 rounded-lg font-medium transition-colors ${isCopied ? 'bg-slate-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
      {isCopied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
      {isCopied ? 'EndereÃ§o Copiado!' : 'Copiar EndereÃ§o'}
      </button>
      <label className={`mt-2 flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${isDelivered ? 'bg-green-100 border-green-300 text-green-800' : 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'}`}>
      <div className="flex items-center">
        <input type="checkbox" checked={isDelivered} onChange={handleConfirmDelivery} className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500" />
        <span className="ml-3 font-bold text-sm">Entregue (Confirmar Pagamento)</span>
      </div>
      {isDelivered && <CheckCircle2 size={20} className="text-green-600 animate-in zoom-in" />}
      </label>
    </div>
    </Modal>

    <Modal open={doseModalOpen} onClose={() => setDoseModalOpen(false)} title="Editar Detalhes da Dose" icon={<Edit size={20} className="text-pink-600" />} size="lg">
    <form onSubmit={handleSaveDoseFull}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Data da AplicaÃ§Ã£o</label>
        <input type="date" required value={editDoseDate} onChange={(e) => setEditDoseDate(e.target.value)} className="w-full border-slate-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Lote / Validade</label>
        <input type="text" value={editDoseLot} onChange={(e) => setEditDoseLot(e.target.value)} className="w-full border-slate-300 rounded-lg" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status da Dose</label>
        <select required value={editDoseStatus} onChange={(e) => setEditDoseStatus(e.target.value as DoseStatus)} className="w-full border-slate-300 rounded-lg">
        <option value="" disabled>Selecione...</option>
        {Object.values(DoseStatus).map(s => <option key={s} value={s}>{DOSE_STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">SituaÃ§Ã£o Pagamento</label>
        <select required={editDoseStatus !== DoseStatus.NOT_ACCEPTED} disabled={editDoseStatus === DoseStatus.NOT_ACCEPTED} value={editDosePayment} onChange={(e) => setEditDosePayment(e.target.value as PaymentStatus)} className={`w-full border-slate-300 rounded-lg ${editDoseStatus === DoseStatus.NOT_ACCEPTED ? 'bg-slate-100 opacity-50' : ''}`}>
        <option value="" disabled>Selecione...</option>
        {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      <div className="lg:col-span-4 flex items-center mt-2">
        <input id="modalIsLast" type="checkbox" checked={editIsLast} onChange={(e) => setEditIsLast(e.target.checked)} className="w-4 h-4 text-pink-600 border-slate-300 rounded" />
        <label htmlFor="modalIsLast" className="ml-2 text-sm font-medium text-slate-900">Esta Ã© a Ãºltima dose antes da consulta?</label>
      </div>
      </div>
      <div className="mt-4">
      <h4 className="font-bold text-slate-700 mb-3 flex items-center text-sm uppercase tracking-wide">
        <UserCheck size={16} className="mr-2 text-pink-600" /> Acompanhamento e SatisfaÃ§Ã£o
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div className="md:col-span-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">1. Enfermeira</label>
        <select required value={editNurse} onChange={e => setEditNurse(e.target.value)} className="w-full border-slate-300 rounded-lg">
          <option value="" disabled>Selecione...</option>
          <option value="yes">Sim</option>
          <option value="no">NÃ£o</option>
        </select>
        </div>
        <div className={`md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 ${editNurse !== 'yes' ? 'opacity-50 pointer-events-none' : ''}`}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">2. Pesquisa</label>
          <select value={editSurveyStatus} onChange={e => setEditSurveyStatus(e.target.value as SurveyStatus)} className="w-full border-slate-300 rounded-lg">
          <option value="" disabled>Selecione...</option>
          {Object.values(SurveyStatus).map(s => <option key={s} value={s}>{SURVEY_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="md:col-span-2 flex items-end gap-2">
          <div className={`flex-1 ${editSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40 pointer-events-none' : ''}`}>
          <label className="block text-sm font-medium text-slate-700 mb-1">3. Nota</label>
          <input type="range" min="0" max="10" step="1" value={editScore} onChange={e => setEditScore(Number(e.target.value))} className="w-full accent-pink-600" disabled={editSurveyStatus !== SurveyStatus.ANSWERED} />
          </div>
          <span className={`w-10 h-10 flex items-center justify-center bg-white border border-slate-200 font-bold rounded-lg ${editSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40' : ''}`}>{editScore}</span>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">4. ComentÃ¡rio</label>
          <input type="text" value={editComment} onChange={e => setEditComment(e.target.value)} placeholder="ObservaÃ§Ã£o sobre o atendimento..." className="w-full border-slate-300 rounded-lg" />
        </div>
        </div>
      </div>
      </div>
      <div className="flex justify-end pt-6">
      <button type="button" onClick={() => setDoseModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2">Cancelar</button>
      <button type="submit" disabled={isSavingDose} className="flex items-center px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50">
        {isSavingDose ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
        {isSavingDose ? 'Salvando...' : 'Salvar AlteraÃ§Ãµes'}
      </button>
      </div>
    </form>
    </Modal>

    {/* Consultation Modal */}
    <Modal open={consultModalOpen} onClose={() => setConsultModalOpen(false)} title="Agendar Consulta" icon={<Calendar size={20} className="text-purple-600" />}>
    <div className="space-y-4">
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
      <p className="text-xs font-bold text-purple-600 uppercase mb-1">Paciente</p>
      <p className="font-bold text-slate-800">{consultPatientName}</p>
      </div>
      <form onSubmit={handleSaveConsult}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Data para PrÃ³xima Consulta Indicada</label>
      <input
        type="date"
        required
        value={consultDateInput}
        onChange={(e) => setConsultDateInput(e.target.value)}
        className="block w-full border-slate-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 mb-6"
      />
      <div className="flex justify-end gap-3">
        <button
        type="button"
        onClick={() => setConsultModalOpen(false)}
        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
        >
        Cancelar
        </button>
        <button
        type="submit"
        disabled={isSavingDose}
        className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold shadow-sm shadow-purple-200 disabled:opacity-50"
        >
        {isSavingDose ? <Loader2 size={18} className="mr-2 animate-spin" /> : <CheckCircle2 size={18} className="mr-2" />}
        {isSavingDose ? 'Salvando...' : 'Confirmar Agendamento'}
        </button>
      </div>
      </form>
    </div>
    </Modal>

    <Modal open={messageModalOpen} onClose={() => setMessageModalOpen(false)} title="Detalhes da Mensagem" icon={<MessageSquare size={20} className="text-indigo-600" />}>
    {selectedContact && (
      <div className="space-y-6">
      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">AÃ§Ã£o / Mensagem</label>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative group">
        <p className="text-slate-800 font-medium text-sm pr-8 leading-relaxed">{selectedContact.message}</p>
        <button onClick={handleCopyMessage} className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Copiar mensagem">
          {isMessageCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        </div>
        {isMessageCopied && <p className="text-xs text-green-600 mt-1 font-bold animate-pulse">Mensagem copiada!</p>}
      </div>
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
        <div className="bg-pink-100 p-2 rounded-full text-pink-600"><User size={20} /></div>
        <div>
          <p className="text-xs text-slate-500">Paciente</p>
          <p className="font-bold text-slate-800">{selectedContact.patientName}</p>
        </div>
        </div>
        <div className="border-t border-slate-100 pt-3">
        <div className="flex justify-between items-center">
          <div><p className="text-xs text-slate-500 mb-1">ResponsÃ¡vel</p><p className="font-medium text-slate-800">{selectedContact.patientGuardian}</p></div>
          <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">Telefone</p>
          <button onClick={() => navigator.clipboard.writeText(selectedContact.patientPhone)} className="flex items-center font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors" title="Copiar telefone">
            <Phone size={14} className="mr-1.5" />{selectedContact.patientPhone}
          </button>
          </div>
        </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3 pt-2">
        <button
        onClick={handleWhatsAppFromMessageModal}
        className="w-full flex items-center justify-center py-3 bg-[#25D366] text-white rounded-lg font-bold hover:bg-[#128C7E] transition-colors shadow-sm"
        >
        <MessageSquare size={20} className="mr-2" />
        Contatar via WhatsApp
        </button>

        <div className="flex gap-3">
        <button onClick={() => { setMessageModalOpen(false); navigate(`/tratamento/${selectedContact.treatmentId}`); }} className="flex-1 flex items-center justify-center py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors">
          <ExternalLink size={16} className="mr-2" /> Ir para Tratamento
        </button>
        <button onClick={() => handleDismissContact(null, selectedContact.id)} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-lg shadow-green-200 transition-colors flex justify-center items-center">
          <CheckCircle2 size={18} className="mr-2" /> Concluir / Enviado
        </button>
        </div>
      </div>
      </div>
    )}
    </Modal>

  </div>
  );
};

export default Dashboard;
