import { useToast } from '../components/ui/Toast';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, dosesApi, patientsApi, treatmentsApi, protocolsApi, documentsApi, dismissedLogsApi, patientEventsApi, invoicesApi, messageTemplatesApi, PatientEventWithPatient } from '../services/api';
import { DoseStatus, SurveyStatus, Dose, TreatmentStatus, ProtocolCategory, PaymentStatus, DismissedLog, ConsentDocument, Patient, PatientFull, Treatment, Protocol } from '../types';
import { getStatusColor, diffInDays, formatDate, getDiagnosisColor, addDays, DOSE_STATUS_LABELS, PAYMENT_STATUS_LABELS, SURVEY_STATUS_LABELS } from '../constants';
import { UserCheck, MessageSquare, Phone, ExternalLink, Activity } from 'lucide-react';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import Modal from '../components/ui/Modal';
import { renderTemplate, buildTreatmentVariables } from '../utils/messageVariables';
import {
  AlertCircle, CheckCircle2, MessageCircle, ChevronRight, ChevronLeft, UserPlus,
  Calendar, Clock, FileWarning, UploadCloud, Edit, CalendarRange,
  Syringe, Bike, Copy, Check, Stethoscope, Save, Loader2, User, X,
  ArrowUp, ArrowDown, Receipt, Search, CalendarX2
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Type for contact items in upcoming messages
type ContactItem = {
  id: string;
  treatmentId?: string;
  eventId?: string;
  patientId?: string;
  patientName: string;
  patientGuardian: string;
  patientPhone: string;
  protocolName: string;
  message: string;
  date: Date;
  diffDays: number;
  isMonitoring: boolean;
  isManual: boolean;
};

// Type for scheduled doses
type ScheduledDoseItem = {
  treatmentId: string;
  cycleNumber: number;
  scheduledDate: Date;
  daysUntil: number;
  patientName: string;
  guardianName: string;
  protocolName: string;
  isCreated: boolean;
  doseId?: string;
  lastDosePurchased?: boolean;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Data States
  const { toast } = useToast();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [documents, setDocuments] = useState<ConsentDocument[]>([]);
  const [dismissedLogs, setDismissedLogs] = useState<DismissedLog[]>([]);
  const [manualEvents, setManualEvents] = useState<PatientEventWithPatient[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
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
  const [editScore, setEditScore] = useState<number | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editPurchased, setEditPurchased] = useState(false);

  // Duplicate Appointments
  const [dupDias, setDupDias] = useState(365);
  const [dupData, setDupData] = useState<any[]>([]);
  const [dupLoading, setDupLoading] = useState(false);

  useEffect(() => {
    setDupLoading(true);
    fetch(
      `https://api.endocrinokids.com.br/api/secretaria/consultas-duplicadas?dias=${dupDias}`,
      { headers: { 'x-admin-key': 'endoped-qa-81313b4c9ec6be950adde720c03d57aa' } }
    )
      .then(r => r.json())
      .then(d => setDupData(d.consultas || []))
      .catch(() => setDupData([]))
      .finally(() => setDupLoading(false));
  }, [dupDias]);

  // Patient Search
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const patientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePatientSearch = useCallback((query: string) => {
    setPatientSearchQuery(query);
    if (patientSearchTimer.current) clearTimeout(patientSearchTimer.current);
    if (query.trim().length < 2) {
      setPatientSearchResults([]);
      return;
    }
    setPatientSearchLoading(true);
    patientSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.endocrinokids.com.br/api/secretaria/busca-rapida?q=${encodeURIComponent(query.trim())}`,
          { headers: { 'x-admin-key': 'endoped-qa-81313b4c9ec6be950adde720c03d57aa' } }
        );
        const data = await res.json();
        setPatientSearchResults(data.pacientes || []);
      } catch {
        setPatientSearchResults([]);
      } finally {
        setPatientSearchLoading(false);
      }
    }, 400);
  }, []);

  // Nota Fiscal states
  const [nfPromptOpen, setNfPromptOpen] = useState(false);
  const [nfPromptDoseId, setNfPromptDoseId] = useState<string | null>(null);
  const [nfFormOpen, setNfFormOpen] = useState(false);
  const [nfPrefill, setNfPrefill] = useState<any>(null);
  const [nfLoading, setNfLoading] = useState(false);
  const [nfForm, setNfForm] = useState({ guardianName: '', guardianEmail: '', childName: '', cpf: '', cep: '', address: '' });
  const [nfSaving, setNfSaving] = useState(false);

  // Pagination States (10 items per page) — March 2026: only Activity, Messages, UpcomingDoses remain on dashboard
  const ITEMS_PER_PAGE = 10;
  const [activityPage, setActivityPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [upcomingDosesPage, setUpcomingDosesPage] = useState(1);

  // Sort direction states (true = ascending/closest first, false = descending/farthest first)
  const [activitySortAsc, setActivitySortAsc] = useState(true);
  const [messagesSortAsc, setMessagesSortAsc] = useState(true);
  const [upcomingDosesSortAsc, setUpcomingDosesSortAsc] = useState(true);

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
    dismissedRes,
    manualEventsRes,
    invoicesRes
    ] = await Promise.all([
    dosesApi.getAll({ limit: 1000 }),
    patientsApi.getAll({ limit: 1000 }),
    treatmentsApi.getAll({ limit: 1000 }),
    protocolsApi.getAll(),
    documentsApi.getAll(),
    dismissedLogsApi.getAll(),
    patientEventsApi.getAll(),
    invoicesApi.getAll()
    ]);

    setDoses(dosesRes.data || []);
    setPatients(patientsRes.data || []);
    setTreatments(treatmentsRes.data || []);
    setProtocols(protocolsRes.data || []);
    setDocuments(documentsRes.data || []);
    setDismissedLogs(dismissedRes.data || []);
    setManualEvents(manualEventsRes.data || []);
    setInvoices(invoicesRes.data || []);
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
  const handleQuickUpdate = async (doseId: string, field: 'status' | 'paymentStatus' | 'deliveryStatus' | 'surveyStatus', value: string) => {
    if (field === 'paymentStatus' && !window.confirm('Confirma alteração do status financeiro?')) return;
    try {
      const updates = { [field]: value };
      const updated = await dosesApi.update(doseId, updates);
      setDoses(prev => prev.map(d => d.id === doseId ? { ...d, ...updated } : d));
      if (field === 'paymentStatus' && value === 'PAID') {
        setNfPromptDoseId(doseId);
        setNfPromptOpen(true);
      }
    } catch (err: any) {
      console.error('Error updating dose:', err);
      setError(err.message || 'Erro ao atualizar dose');
    }
  };

  const handleNfYes = async () => {
    if (!nfPromptDoseId) return;
    setNfPromptOpen(false);
    setNfLoading(true);
    try {
      const prefill = await invoicesApi.prefill(nfPromptDoseId);
      setNfPrefill(prefill);
      setNfForm({
        guardianName: prefill.guardianName || '',
        guardianEmail: prefill.guardianEmail || '',
        childName: prefill.childName || '',
        cpf: prefill.cpf || '',
        cep: prefill.cep || '',
        address: prefill.address || '',
      });
      setNfFormOpen(true);
    } catch (err: any) {
      toast('Erro ao carregar dados: ' + (err.message || ''), 'error');
    } finally {
      setNfLoading(false);
    }
  };

  const handleNfSubmit = async () => {
    if (!nfPromptDoseId) return;
    if (!nfForm.guardianName.trim() || !nfForm.childName.trim()) {
      toast('Nome do responsável e da criança são obrigatórios', 'error');
      return;
    }
    setNfSaving(true);
    try {
      await invoicesApi.create({
        doseId: nfPromptDoseId,
        guardianName: nfForm.guardianName.trim(),
        guardianEmail: nfForm.guardianEmail.trim() || undefined,
        childName: nfForm.childName.trim(),
        cpf: nfForm.cpf.trim() || undefined,
        cep: nfForm.cep.trim() || undefined,
        address: nfForm.address.trim() || undefined,
      });
      toast('Nota fiscal criada com sucesso!', 'success');
      setNfFormOpen(false);
      setNfPromptDoseId(null);
      // Reload invoices
      try { const r = await invoicesApi.getAll(); setInvoices(r.data || []); } catch {}
    } catch (err: any) {
      toast('Erro ao criar NF: ' + (err.message || ''), 'error');
    } finally {
      setNfSaving(false);
    }
  };

  const NF_STATUS_LABELS: Record<string, string> = {
    PENDING_DATA: 'Dados Pendentes',
    DATA_SENT: 'Enviado',
    CONFIRMED: 'Confirmado',
    ISSUED: 'NF Emitida',
    DELIVERED: 'Entregue',
  };
  const NF_STATUS_COLORS: Record<string, string> = {
    PENDING_DATA: 'bg-amber-100 text-amber-700',
    DATA_SENT: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-purple-100 text-purple-700',
    ISSUED: 'bg-emerald-100 text-emerald-700',
    DELIVERED: 'bg-slate-100 text-slate-600',
  };
  const NF_NEXT_STATUS: Record<string, string> = {
    PENDING_DATA: 'DATA_SENT',
    DATA_SENT: 'CONFIRMED',
    CONFIRMED: 'ISSUED',
    ISSUED: 'DELIVERED',
  };
  const NF_ACTION_LABELS: Record<string, string> = {
    PENDING_DATA: 'Enviar ao Responsável',
    DATA_SENT: 'Confirmado pelo Resp.',
    CONFIRMED: 'NF Emitida',
    ISSUED: 'Entregue ao Resp.',
  };

  const handleNfAdvance = async (invoiceId: string, currentStatus: string) => {
    const nextStatus = NF_NEXT_STATUS[currentStatus];
    if (!nextStatus) return;
    try {
      await invoicesApi.update(invoiceId, { status: nextStatus });
      const r = await invoicesApi.getAll();
      setInvoices(r.data || []);
      toast('Status da NF atualizado!', 'success');
    } catch (err: any) {
      toast('Erro: ' + (err.message || ''), 'error');
    }
  };

  const pendingInvoices = invoices.filter(i => i.status !== 'DELIVERED');

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
    const fullText = `${a.street}, ${a.number}${a.complement ? ' - ' + a.complement : ''}${a.condominium ? ' - ' + a.condominium : ''} - ${a.neighborhood}, ${a.city} - ${a.state}, CEP: ${a.zipCode}${a.referencePoint ? '\nRef: ' + a.referencePoint : ''}`;
    setSelectedAddress(fullText);
    setSelectedPatientName(patient.fullName);
    setSelectedGuardianName(patient.guardian.fullName);
    setSelectedPhone(patient.guardian.phonePrimary);
    setSelectedDoseId(doseId);
    setAddressModalOpen(true);
    setIsCopied(false);
    setIsDelivered(false);
  } else {
    toast('Endereço não cadastrado para este paciente', 'warning');
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
    const doseIdForNf = selectedDoseId;
    await dosesApi.update(selectedDoseId, { paymentStatus: 'PAID' });
    await dosesApi.update(selectedDoseId, { deliveryStatus: 'delivered' });
    setDoses(prev => prev.map(d => d.id === doseIdForNf ? { ...d, paymentStatus: 'PAID' as any, deliveryStatus: 'delivered' } : d));
    setTimeout(() => {
    setAddressModalOpen(false);
    setIsDelivered(false);
    setNfPromptDoseId(doseIdForNf);
    setNfPromptOpen(true);
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
    toast(`Arquivo muito grande. Limite: ${MAX_FILE_SIZE_MB}MB`, 'warning');
    return;
  }

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    toast('Formato invalido. Apenas PDF ou Word', 'warning');
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
  // March 2026 bug fix: null = não avaliado, distinct from a real score of 0
  setEditScore(dose.surveyScore ?? null);
  setEditComment(dose.surveyComment || '');
  setEditPurchased(dose.purchased !== false);
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
    surveyScore: editScore !== null && editScore !== undefined ? Number(editScore) : null,
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
  setConsultPatientName(patient?.fullName || dose.treatment?.patient?.fullName || 'Paciente');
  setConsultDateInput(dose.consultationDate ? dose.consultationDate.split('T')[0] : '');
  setConsultModalOpen(true);
  };

  const handleSaveConsult = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedConsultDoseId || !consultDateInput) return;

  setIsSavingDose(true);

  try {
    const updates: Partial<Dose> = {
    consultationDate: new Date(consultDateInput).toISOString(),
    consultationScheduled: true // Mark as completed when scheduling
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

  // Handler to mark consultation as completed directly (without setting date)
  const handleMarkConsultCompleted = async (doseId: string) => {
  try {
    const updates: Partial<Dose> = {
    consultationScheduled: true
    };
    const updated = await dosesApi.update(doseId, updates);
    setDoses(prev => prev.map(d => d.id === doseId ? updated : d));
  } catch (err: any) {
    setError(err.message || 'Erro ao concluir agendamento');
  }
  };

  // Message Modal Logic
  const handleOpenMessageModal = async (contact: any) => {
  setSelectedContact(contact);
  setIsMessageCopied(false);
  setMessageModalOpen(true);
  if (contact.message?.includes('{link_confirmacao_gh}') && contact.treatmentId) {
    try {
      const res = await messageTemplatesApi.resolve({ content: contact.message, treatmentId: contact.treatmentId });
      setSelectedContact((prev: any) => prev?.id === contact.id ? { ...prev, message: res.rendered } : prev);
    } catch {}
  }
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
  if (!window.confirm('Confirma que a mensagem foi enviada ao paciente?')) return;
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

  // Data Logic - Normalize TODAY to midnight local time to avoid timezone issues in date comparisons
  const TODAY = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Stats - Active patients are those with ongoing treatments (scheduled events)
  // March 2026 — Operational counters (Painel de Controle Operacional)
  // ENTREGAR: doses with status PAID + delivery waiting
  // A PAGAR:  doses pending payment (any WAITING_*)
  // ENFERMAGEM: nurse-assigned doses still pending application
  // Dismissed contacts (via DosesPage's "Concluir / Enviado") must also be excluded here so the
  // Dashboard counter mirrors the sidebar Doses page. Same contactId scheme as DosesPage:
  //   `dose_${doseId}_general` for to-deliver / to-pay,
  //   `dose_${doseId}_late_dose` for overdue, `dose_${doseId}_next_dose` for upcoming.
  const operationalCounters = useMemo(() => {
    const dismissedSet = new Set(dismissedLogs.map(d => d.contactId));
    const isDismissed = (doseId: string, trigger: string) =>
      dismissedSet.has(`dose_${doseId}_${trigger}`);

    const toDeliver = doses
      .filter(d => d.paymentStatus === PaymentStatus.PAID && d.deliveryStatus === 'waiting')
      .filter(d => !isDismissed(d.id, 'general'));
    const toPay = doses
      .filter(d => d.purchased !== false && [
        PaymentStatus.WAITING_PIX, PaymentStatus.WAITING_CARD, PaymentStatus.WAITING_BOLETO,
      ].includes(d.paymentStatus))
      .filter(d => !isDismissed(d.id, 'general'));
    const nursingPending = doses.filter(d => d.nurse === true && (d.status === DoseStatus.PENDING || d.status === DoseStatus.SCHEDULED || d.status === DoseStatus.CONFIRM_APPLICATION));
    return {
      toDeliver,
      toPay,
      nursingPending,
    };
  }, [doses, dismissedLogs]);

  // Overdue Doses - uses real scheduledDate from dose records (auto-created by backend)
  const overdueDoses = useMemo(() => {
  const activeTreatmentIds = new Set(
    treatments.filter(t => t.status === TreatmentStatus.ONGOING).map(t => t.id)
  );

  const result = doses.filter(d => {
    if (!activeTreatmentIds.has(d.treatmentId)) return false;
    if (d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE) return false;
    const overdueDays = diffInDays(TODAY, d.scheduledDate);
    const minOverdue = d.cycleNumber === 1 ? 10 : 1;
    return overdueDays >= minOverdue;
  });

  // One dose per treatment (earliest overdue)
  const seen = new Set<string>();
  const deduped = result
    .sort((a, b) => a.cycleNumber - b.cycleNumber)
    .filter(d => {
      if (seen.has(d.treatmentId)) return false;
      seen.add(d.treatmentId);
      return true;
    });

  const dismissedSet = new Set(dismissedLogs.map(d => d.contactId));
  const filtered = deduped
    .filter(d => (d as any).confirmationStatus !== 'SENT_2')
    .filter(d => !dismissedSet.has(`dose_${d.id}_late_dose`));

  return filtered.sort((a, b) => {
    const diff = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    if (diff !== 0) return diff;
    const patientA = getPatientByTreatmentId(a.treatmentId)?.fullName || '';
    const patientB = getPatientByTreatmentId(b.treatmentId)?.fullName || '';
    return patientA.localeCompare(patientB);
  });
  }, [doses, treatments, TODAY, dismissedLogs]);

  // Upcoming Scheduled Doses (future doses not yet applied)
  // IMPORTANT: Uses SCHEDULED dates from protocol (startDate + frequencyDays * cycleNumber)
  // NOT the dates when doses were added in the system
  const upcomingScheduledDoses = useMemo(() => {
  const result: ScheduledDoseItem[] = [];

  const activeTreatments = treatments.filter(t => t.status === TreatmentStatus.ONGOING);

  activeTreatments.forEach(treatment => {
    const protocol = protocols.find(p => p.id === treatment.protocolId);
    // Note: protocol.category from backend is 'MEDICATION' or 'MONITORING' (not the display label)
    const isMedication = protocol?.category === 'MEDICATION' || protocol?.category === ProtocolCategory.MEDICATION;
    if (!protocol || !isMedication || treatment.plannedDosesBeforeConsult === 0) return;

    const patient = patients.find(p => p.id === treatment.patientId);
    if (!patient) return;

    const treatmentDoses = doses.filter(d => d.treatmentId === treatment.id);
    const startDate = addDays(treatment.startDate, 0); // Normalize date
    const frequencyDays = protocol.frequencyDays || 28;

    // Count applied doses (APPLIED_LATE / CONFIRM_APPLICATION count as applied per March 2026 spec)
    const appliedCount = treatmentDoses.filter(d =>
      d.status === DoseStatus.APPLIED ||
      d.status === DoseStatus.APPLIED_LATE ||
      d.status === DoseStatus.CONFIRM_APPLICATION
    ).length;

    // If all planned doses are applied, treatment is complete
    if (appliedCount >= treatment.plannedDosesBeforeConsult) return;

    // Build scheduled doses for this treatment based on PROTOCOL schedule
    for (let i = 0; i < treatment.plannedDosesBeforeConsult; i++) {
      const cycleNumber = i + 1;
      const existingDose = treatmentDoses.find(d => d.cycleNumber === cycleNumber);

      // If dose exists and is APPLIED / APPLIED_LATE / CONFIRM_APPLICATION, skip it
      if (existingDose && (
        existingDose.status === DoseStatus.APPLIED ||
        existingDose.status === DoseStatus.APPLIED_LATE ||
        existingDose.status === DoseStatus.CONFIRM_APPLICATION
      )) continue;

      // Calculate SCHEDULED date based on protocol (not when dose was added)
      // Dose 1 = startDate, Dose 2 = startDate + frequencyDays, etc.
      let scheduledDate: Date;
      if (i === 0) {
        scheduledDate = addDays(startDate, 0);
      } else {
        scheduledDate = addDays(startDate, frequencyDays * i);
      }

      const daysUntil = diffInDays(scheduledDate, TODAY);

      // March 2026 spec — main dashboard "Próximas Doses" filtered to next 7 days only.
      // (Full list lives on the new sidebar page /doses.)
      if (daysUntil >= 0 && daysUntil <= 7) {
        // Check if last applied dose was purchased
        const appliedDoses = treatmentDoses
          .filter(d => d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE)
          .sort((a, b) => (b.cycleNumber || 0) - (a.cycleNumber || 0));
        const lastAppliedDose = appliedDoses[0];

        result.push({
          treatmentId: treatment.id,
          cycleNumber,
          scheduledDate,
          daysUntil,
          patientName: patient.fullName,
          guardianName: patient.guardian.fullName,
          protocolName: protocol.name,
          isCreated: !!existingDose,
          doseId: existingDose?.id,
          lastDosePurchased: lastAppliedDose?.purchased
        });
      }
    }
  });

  // March 2026: exclude doses dismissed via DosesPage popup with NEXT_DOSE trigger.
  const dismissedSet = new Set(dismissedLogs.map(d => d.contactId));
  const filtered = result.filter(d => !d.doseId || !dismissedSet.has(`dose_${d.doseId}_next_dose`));

  // Sort by date (closest first or farthest first based on sort direction)
  return filtered.sort((a, b) => {
    const diff = a.scheduledDate.getTime() - b.scheduledDate.getTime();
    if (diff !== 0) return upcomingDosesSortAsc ? diff : -diff;
    return a.patientName.localeCompare(b.patientName);
  });
  }, [treatments, protocols, patients, doses, upcomingDosesSortAsc, TODAY, dismissedLogs]);

  // Pending Surveys (excludes WAITING status - only NOT_SENT and SENT are valid)
  // March 2026: also exclude doses dismissed via SurveyPage popup ("Concluir / Enviado").
  const pendingSurveys = useMemo(() => {
  const dismissedSet = new Set(dismissedLogs.map(d => d.contactId));
  return doses.filter(d => {
    if (!d.nurse) return false;
    if (d.purchased === false) return false;
    if (d.surveyStatus === SurveyStatus.ANSWERED) return false;
    if (d.surveyStatus === SurveyStatus.NOT_ANSWERED) return false;
    const isPendingStatus = d.surveyStatus === SurveyStatus.SENT || d.surveyStatus === SurveyStatus.NOT_SENT || !d.surveyStatus;
    if (!isPendingStatus) return false;
    // Exclude survey-popup dismissed doses
    if (dismissedSet.has(`survey_${d.id}`)) return false;
    return true;
  }).sort((a, b) => {
    const diff = new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime();
    if (diff !== 0) return diff;
    const patientA = getPatientByTreatmentId(a.treatmentId)?.fullName || '';
    const patientB = getPatientByTreatmentId(b.treatmentId)?.fullName || '';
    return patientA.localeCompare(patientB);
  });
  }, [doses, treatments, patients, dismissedLogs]);

  // Approaching Consults
  const approachingConsults = useMemo(() => {
  const dismissedSet = new Set(dismissedLogs.map(d => d.contactId));
  // Build set of treatments that have a consultation forecast
  const forecastTreatments = new Map<string, { month: number; year: number }>();
  treatments.forEach(t => {
    if (t.nextConsultationDate) {
    const d = new Date(t.nextConsultationDate);
    forecastTreatments.set(t.id, { month: d.getMonth() + 1, year: d.getFullYear() });
    } else if (t.nextConsultationMonth && t.nextConsultationYear && t.nextConsultationFortnight) {
    forecastTreatments.set(t.id, { month: t.nextConsultationMonth, year: t.nextConsultationYear });
    }
  });
  // Build scheduledMap: treatmentId -> has consultationDate from dose
  const scheduledMap = new Map<string, boolean>();
  doses.forEach(d => {
    if (!d.isLastBeforeConsult) return;
    if (d.consultationDate || d.consultationScheduled) scheduledMap.set(d.treatmentId, true);
  });
  // Only include treatments with forecast, not scheduled, not dismissed
  return Array.from(forecastTreatments.entries())
    .filter(([tid, info]) => {
    if (scheduledMap.get(tid)) return false;
    const contactId = `consult_${tid}_${info.year}_${info.month}`;
    if (dismissedSet.has(contactId)) return false;
    return true;
    })
    .map(([tid]) => {
    const t = treatments.find(tr => tr.id === tid);
    const patient = t ? patients.find(p => p.id === t.patientId) : null;
    return { treatmentId: tid, patientName: patient?.fullName || '', treatment: t };
    })
    .sort((a, b) => a.patientName.localeCompare(b.patientName));
  }, [doses, treatments, patients, dismissedLogs]);

  // Get patient IDs with ongoing treatments (for filtering active patients)
  const patientsWithOngoingTreatmentsSet = useMemo(() => {
  return new Set(
    treatments
      .filter(t => t.status === TreatmentStatus.ONGOING)
      .map(t => t.patientId)
  );
  }, [treatments]);

  // March 2026 spec 4.5: "Pacientes Ativos por Diagnóstico" moved to /pacientes (PatientList) — memo removed.

  // Consent Missing (only for patients with ongoing treatments).
  // March 2026: also exclude patients dismissed via ConsentTermsPage popup ("Concluir / Enviado").
  const patientsMissingConsent = useMemo(() => {
  const dismissedSet = new Set(dismissedLogs.map(d => d.contactId));
  return patients.filter(p => {
    if (!patientsWithOngoingTreatmentsSet.has(p.id)) return false;
    const allDiags = [p.mainDiagnosis, ...(p.secondaryDiagnoses || [])].map(d => (d || '').toLowerCase());
    const isTarget = allDiags.some(d => d.includes('puberdade precoce') || d.includes('baixa estatura'));
    if (!isTarget) return false;
    const hasSigned = documents.some(doc => doc.patientId === p.id && doc.status === 'SIGNED');
    if (hasSigned) return false;
    // Hide rows already marked as concluído via the consent message popup
    if (dismissedSet.has(`consent_${p.id}`)) return false;
    return true;
  });
  }, [patients, documents, patientsWithOngoingTreatmentsSet, dismissedLogs]);

  // Activity Window
  const highActivityDoses = useMemo(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startRange = new Date(now);
  startRange.setDate(startRange.getDate() - 14);
  const endRange = new Date(now);
  endRange.setDate(endRange.getDate() + 14);

  return doses.filter(d => {
    const appDate = new Date(d.applicationDate);
    if (appDate < startRange || appDate > endRange) return false;

    const noPurchase = d.purchased === false || (!d.paymentStatus && d.purchased !== true);
    const paymentResolved = d.paymentStatus === PaymentStatus.PAID || noPurchase || d.paymentStatus == null;
    const isFullyDone = (d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE) && paymentResolved;

    return !isFullyDone;
  }).sort((a, b) => {
    const diff = new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime();
    if (diff !== 0) return activitySortAsc ? diff : -diff;
    const patientA = getPatientByTreatmentId(a.treatmentId)?.fullName || '';
    const patientB = getPatientByTreatmentId(b.treatmentId)?.fullName || '';
    return patientA.localeCompare(patientB);
  });
  }, [doses, activitySortAsc, treatments, patients]);

  // Upcoming Contacts
  const upcomingContacts = useMemo(() => {
  const contacts: ContactItem[] = [];
  const activeTreatments = treatments.filter(t => t.status === TreatmentStatus.ONGOING);

  // Helper to parse ISO date string without timezone shift
  const parseLocalDate = (dateStr: string) => {
    const dateOnly = dateStr.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Add protocol milestones from active treatments
  activeTreatments.forEach(t => {
    const proto = protocols.find(p => p.id === t.protocolId);
    if (!proto || !proto.milestones || proto.milestones.length === 0) return;

    const isMedication = proto.category === 'MEDICATION' || proto.category === ProtocolCategory.MEDICATION;

    let referenceDate: Date;

    if (isMedication) {
      // MEDICATION protocols: messages are based on actual dose application date
      // If there are overdue pending doses → BLOCK all messages (pause the flow)
      const allTreatmentDoses = doses.filter(d => d.treatmentId === t.id);
      const overduePendingDoses = allTreatmentDoses.filter(d =>
        d.status === DoseStatus.PENDING && diffInDays(parseLocalDate(d.applicationDate), TODAY) < 0
      );
      const appliedDoses = allTreatmentDoses.filter(d => d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE);
      const lastAppliedDose = appliedDoses.length > 0
        ? appliedDoses.reduce((latest, d) =>
            parseLocalDate(d.applicationDate).getTime() > parseLocalDate(latest.applicationDate).getTime() ? d : latest
          )
        : null;

      // Block: no applied dose yet, or there are overdue pending doses
      if (!lastAppliedDose || overduePendingDoses.length > 0) return;

      // Use last applied dose date as reference
      referenceDate = parseLocalDate(lastAppliedDose.applicationDate);
    } else {
      // NON-MEDICATION protocols: messages based on treatment start date
      referenceDate = parseLocalDate(t.startDate);
    }

    // March 2026: build variable map ONCE per treatment so all milestones get the same resolved
    // {nome_paciente}, {nome_responsavel}, {nome_medico}, {data_proxima_dose}, {data_proxima_consulta}.
    const patientForTreatment = patients.find(p => p.id === t.patientId);
    const treatmentVars = buildTreatmentVariables({
      treatment: t as any,
      patient: patientForTreatment,
      protocol: proto,
      doses,
    });

    proto.milestones.forEach(m => {
    const contactId = `${t.id}_m_${m.day}`;

    if (dismissedLogs.some(log => log.contactId === contactId)) return;

    const contactDate = addDays(referenceDate, m.day);
    const diff = diffInDays(contactDate, TODAY);

    if (diff >= -60) {
      const patient = patientForTreatment;
      if (patient) {
      contacts.push({
        id: contactId,
        treatmentId: t.id,
        patientName: patient.fullName,
        patientGuardian: patient.guardian.fullName,
        patientPhone: patient.guardian.phonePrimary,
        protocolName: proto.name,
        message: renderTemplate(m.message, treatmentVars),
        date: contactDate,
        diffDays: diff,
        isMonitoring: proto.category === ProtocolCategory.MONITORING,
        isManual: false
      });
      }
    }
    });
  });

  // Add manual events from patients
  manualEvents.forEach(event => {
    const contactId = `manual_${event.id}`;

    if (dismissedLogs.some(log => log.contactId === contactId)) return;

    const eventDate = parseLocalDate(event.eventDate);
    const diff = diffInDays(eventDate, TODAY);

    // Show events from 60 days ago to future
    if (diff >= -60) {
      contacts.push({
        id: contactId,
        eventId: event.id,
        patientId: event.patientId,
        patientName: event.patient.fullName,
        patientGuardian: event.patient.guardian.fullName,
        patientPhone: event.patient.guardian.phonePrimary,
        protocolName: 'Manual',
        message: event.title + (event.description ? `: ${event.description}` : ''),
        date: eventDate,
        diffDays: diff,
        isMonitoring: false,
        isManual: true
      });
    }
  });

  return contacts.sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return messagesSortAsc ? diff : -diff;
    // Secondary sort by patient name when dates are equal
    return a.patientName.localeCompare(b.patientName);
  });
  }, [treatments, protocols, patients, dismissedLogs, doses, manualEvents, messagesSortAsc]);

  const messagesToday = upcomingContacts.filter(c => c.diffDays === 0).length;
  const messagesOverdue = upcomingContacts.filter(c => c.diffDays < 0).length;
  const messagesActionable = messagesToday + messagesOverdue;

  const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  };

  // Pagination helper
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
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-pink-600 text-white'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  // Sort Button Component
  const SortButton = ({
    isAsc,
    onToggle,
    label
  }: {
    isAsc: boolean;
    onToggle: () => void;
    label?: string;
  }) => (
    <button
      onClick={onToggle}
      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      title={isAsc ? 'Ordenado: mais próximo primeiro' : 'Ordenado: mais distante primeiro'}
    >
      {isAsc ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      <span className="hidden sm:inline">{label || 'Data'}</span>
    </button>
  );

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

    {/* Quick-action: Add new patient */}
    <button
      onClick={() => navigate('/pacientes?new=1')}
      className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-pink-600 to-pink-500 text-white px-6 py-4 rounded-xl hover:from-pink-700 hover:to-pink-600 transition-all shadow-lg shadow-pink-200 active:scale-[0.99]"
    >
      <UserPlus size={22} />
      <span className="text-lg font-bold">Adicionar Novo Paciente</span>
    </button>

    {/* Patient Search */}
    <SectionCard id="section-patient-search" title="Verificar Dados Paciente" icon={<Search size={18} className="text-violet-600" />} headerBg="bg-violet-50/30">
      <div className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={patientSearchQuery}
            onChange={(e) => handlePatientSearch(e.target.value)}
            placeholder="Digite o nome ou celular do responsável..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
          />
        </div>
        {patientSearchLoading && (
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Buscando...
          </div>
        )}
        {!patientSearchLoading && patientSearchResults.length > 0 && (
          <div className="mt-3 border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2">Paciente</th>
                  <th className="px-3 py-2">Responsável</th>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2">Última Consulta</th>
                  <th className="px-3 py-2">Próxima Consulta</th>
                  <th className="px-3 py-2">Diagnóstico</th>
                  <th className="px-3 py-2">Idade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patientSearchResults.map((p: any, idx: number) => {
                  const fmtDate = (v: string | null) => {
                    if (!v) return '—';
                    const [date, time] = v.split(' ');
                    const [y, m, d] = date.split('-');
                    return `${d}/${m}/${y}${time ? ` ${time}` : ''}`;
                  };
                  return (
                    <tr key={idx} className="hover:bg-violet-50/30">
                      <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{p.nome}</td>
                      <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{p.responsavel || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-slate-600 whitespace-nowrap">{p.telefone || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{fmtDate(p.ultima_consulta)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{fmtDate(p.proxima_consulta)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{p.diagnostico || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{p.idade || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!patientSearchLoading && patientSearchQuery.trim().length >= 2 && patientSearchResults.length === 0 && (
          <p className="mt-3 text-sm text-slate-400 text-center py-2">Nenhum paciente encontrado.</p>
        )}
      </div>
    </SectionCard>

    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
    </div>

    {error && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
      <AlertCircle size={20} className="text-red-600 mr-3" />
      <span className="text-red-700">{error}</span>
      <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">&times;</button>
    </div>
    )}

    {/* ============= Painel de Controle Operacional (March 2026 spec) ============= */}
    {/* 3 new action counters — daily operational queues */}
    <div>
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ação Operacional</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KpiCard
          title="Mensagens"
          subtitle={messagesOverdue > 0 ? `${messagesToday} hoje · ${messagesOverdue} atrasadas` : `${messagesToday} hoje`}
          value={messagesActionable}
          icon={<MessageSquare size={16} className="text-indigo-600" />}
          accentColor={messagesOverdue > 0 ? 'red' : 'indigo'}
          highlight
          onClick={() => scrollToSection('section-messages')}
        />
        <KpiCard
          title="A Pagar"
          subtitle="Doses pendentes de pagamento"
          value={operationalCounters.toPay.length}
          icon={<AlertCircle size={16} className="text-amber-600" />} accentColor="amber"
          highlight
          onClick={() => navigate('/doses', { state: { filter: 'to-pay' } })}
        />
        <KpiCard
          title="Entregar"
          subtitle="Pago + Aguardando Entrega"
          value={operationalCounters.toDeliver.length}
          icon={<Bike size={20} className="text-orange-600" />} accentColor="orange"
          highlight
          onClick={() => navigate('/doses', { state: { filter: 'to-deliver' } })}
        />
        <KpiCard
          title="Enfermagem"
          subtitle="Aguardando aplicação"
          value={operationalCounters.nursingPending.length}
          icon={<Syringe size={16} className="text-rose-600" />} accentColor="rose"
          highlight
          onClick={() => navigate('/enfermagem')}
        />
        <KpiCard
          title="Agendar Consulta" value={approachingConsults.length}
          icon={<Calendar size={16} className="text-purple-600" />} accentColor="purple"
          highlight
          onClick={() => navigate('/consultas')}
        />
        <KpiCard
          title="Consultas Duplicadas"
          subtitle="Futuras duplicadas"
          value={new Set(dupData.map((d: any) => d.nome_completo)).size}
          icon={<CalendarX2 size={16} className="text-red-600" />}
          accentColor={dupData.length > 0 ? 'red' : 'gray'}
          highlight
          onClick={() => scrollToSection('section-dup-appointments')}
        />
        <KpiCard
          title="Emitir NF"
          subtitle="Pendentes de entrega"
          value={pendingInvoices.length}
          icon={<Receipt size={16} className="text-emerald-600" />}
          accentColor={pendingInvoices.length > 0 ? 'emerald' : 'gray'}
          highlight
          onClick={() => scrollToSection('section-invoices')}
        />
      </div>
    </div>

    {/* General KPIs */}
    <div>
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Indicadores Gerais</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2.5">
        <KpiCard
          title="Termos Pendentes" value={documents.filter(d => d.status === 'PENDING').length}
          icon={<FileWarning size={16} className="text-cyan-600" />} accentColor="cyan"
          onClick={() => navigate('/termos-consentimento')}
        />
        <KpiCard
          title="Doses em Atraso" value={overdueDoses.length}
          icon={<AlertCircle size={16} className="text-red-600" />} accentColor="red"
          onClick={() => navigate('/doses', { state: { filter: 'overdue' } })}
        />

        <KpiCard
          title="Pesquisa Enfermeira" subtitle="Aguardando resposta" value={pendingSurveys.length}
          icon={<MessageCircle size={16} className="text-blue-600" />} accentColor="blue"
          onClick={() => navigate('/pesquisa-enfermagem')}
        />
        <KpiCard
          title="Próximas Doses (14d)" subtitle="Próximos 14 dias" value={upcomingScheduledDoses.length}
          icon={<Syringe size={16} className="text-teal-600" />} accentColor="teal"
          onClick={() => scrollToSection('section-upcoming-doses')}
        />

      </div>
    </div>

    {/* Activity Window */}
    <SectionCard
    title="Janela de Atividade (Doses +/- 14 dias)"
    icon={<CalendarRange size={18} className="text-amber-600" />}
    countBadge={highActivityDoses.length} badgeColor="bg-amber-100 text-amber-800" headerBg="bg-amber-50/30"
    >
    <div className="p-2 bg-amber-50 text-amber-800 text-xs text-center border-b border-amber-100">
      Doses marcadas como <b>Aplicada</b> e <b>PAGO</b> são removidas desta lista automaticamente.
    </div>
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase sticky top-0 z-10">
      <tr>
        <th className="px-6 py-3">
          <div className="flex items-center gap-1">
            Data
            <SortButton isAsc={activitySortAsc} onToggle={() => { setActivitySortAsc(!activitySortAsc); setActivityPage(1); }} />
          </div>
        </th>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">Telefone</th>
        <th className="px-6 py-3">Protocolo</th>
        <th className="px-6 py-3">Status Dose</th>
        <th className="px-6 py-3">Pagamento</th>
        <th className="px-6 py-3">Enf.</th>
        <th className="px-6 py-3 text-right">Ação</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {highActivityDoses.length === 0 ? (
        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Nenhuma pendência operacional no momento.</td></tr>
      ) : (
        paginate(highActivityDoses, activityPage).map((dose: Dose) => {
        const patient = getPatientByTreatmentId(dose.treatmentId);
        return (
          <tr key={dose.id} className="hover:bg-amber-50/20 transition-colors" onClick={() => navigate(`/tratamento/${dose.treatmentId}`)}>
          <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
            {formatDate(dose.applicationDate)}
          </td>
          <td className="px-6 py-4 font-medium text-slate-900">
            <div className="flex items-center gap-2">
            {patient?.fullName || dose.treatment?.patient?.fullName || '-'}
            {patient?.address && dose.purchased !== false && (
              <button
              onClick={(e) => handleViewAddress(e, dose.treatmentId, dose.id)}
              className={`p-1 rounded-full transition-colors ${
                dose.deliveryStatus === 'delivered'
                  ? 'text-green-600 bg-green-50 hover:bg-green-100'
                  : 'text-red-500 bg-red-50 hover:bg-red-100'
              }`}
              title={dose.deliveryStatus === 'delivered' ? 'Entrega Concluída' : 'Entrega Pendente'}
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
            <span className={`text-xs px-2 py-1 rounded-full font-semibold inline-block ${getStatusColor(dose.status)}`}>
              {DOSE_STATUS_LABELS[dose.status]}
            </span>
          </td>
          <td className="px-6 py-4">
            {dose.purchased === false || dose.paymentStatus == null ? (
            <span className="text-slate-400 text-xs italic">{dose.purchased === false ? 'N/A' : '—'}</span>
            ) : dose.paymentStatus === PaymentStatus.PAID ? (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(dose.paymentStatus)}`}>
              {PAYMENT_STATUS_LABELS[dose.paymentStatus]}
            </span>
            ) : (
            <select
            value={dose.paymentStatus}
            disabled={dose.status === DoseStatus.NOT_ACCEPTED}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => handleQuickUpdate(dose.id, 'paymentStatus', e.target.value)}
            className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:ring-2 focus:ring-amber-500 ${getStatusColor(dose.paymentStatus)} ${dose.status === DoseStatus.NOT_ACCEPTED ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
            <option value="" disabled>Selecione...</option>
            {Object.values(PaymentStatus).filter(s => s !== PaymentStatus.PAID).map(s => <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>)}
            </select>
            )}
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
    <Pagination
      currentPage={activityPage}
      totalPages={getTotalPages(highActivityDoses.length)}
      onPageChange={setActivityPage}
    />
    </SectionCard>

    {/* Upcoming Messages */}
    <SectionCard
    id="section-messages"
    title="Próximas Mensagens"
    icon={<MessageSquare size={18} className="text-indigo-600" />}
    countBadge={upcomingContacts.length} badgeColor="bg-indigo-100 text-indigo-800" headerBg="bg-indigo-50/30"
    >
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
      <tr>
        <th className="px-6 py-3">
          <div className="flex items-center gap-1">
            Data Prevista
            <SortButton isAsc={messagesSortAsc} onToggle={() => { setMessagesSortAsc(!messagesSortAsc); setMessagesPage(1); }} />
          </div>
        </th>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">Contato</th>
        <th className="px-6 py-3">Protocolo</th>
        <th className="px-6 py-3">Ação / Mensagem</th>
        <th className="px-6 py-3 text-right">Ação</th>
        <th className="px-6 py-3 text-right">Detalhes</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {upcomingContacts.length === 0 ? (
        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Nenhum ponto de contato próximo.</td></tr>
      ) : (
        paginate(upcomingContacts, messagesPage).map((contact: ContactItem) => (
        <tr
          key={contact.id}
          onClick={() => handleOpenMessageModal(contact)}
          className={`${contact.diffDays < 0 ? 'bg-red-50' : ''} hover:bg-indigo-50/20 cursor-pointer transition-colors`}
        >
          <td className="px-6 py-4 font-bold text-slate-800">
          {formatDate(contact.date.toISOString())}
          <span className={`block text-xs ${contact.diffDays < 0 ? 'font-semibold text-red-600' : 'font-normal text-slate-500'}`}>
            {contact.diffDays === 0 ? 'Hoje' : (contact.diffDays > 0 ? `Em ${contact.diffDays} dias` : `Há ${Math.abs(contact.diffDays)} dias`)}
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
          {contact.isManual ? (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded border border-amber-200">Manual</span>
          ) : contact.isMonitoring ? (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded border border-blue-200">{contact.protocolName}</span>
          ) : (
            <span className="text-slate-600">{contact.protocolName}</span>
          )}
          </td>
          <td className="px-6 py-4">
          {contact.message.includes('portal.endocrinokids.com.br/c/') ? (
          <div className="flex items-center text-red-800 font-bold bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
            <MessageCircle size={14} className="mr-2 flex-shrink-0 text-red-600" />
            <span className="truncate max-w-[250px]">{contact.message}</span>
          </div>
          ) : (
          <div className="flex items-center text-indigo-700 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
            <MessageCircle size={14} className="mr-2 flex-shrink-0" />
            <span className="truncate max-w-[250px]">{contact.message}</span>
          </div>
          )}
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
    <Pagination
      currentPage={messagesPage}
      totalPages={getTotalPages(upcomingContacts.length)}
      onPageChange={setMessagesPage}
    />
    </SectionCard>

    {/* March 2026 spec 4.4 — moved off main page to sidebar pages:
        - Termo de Consentimento → /termos-consentimento
        - Doses em Atraso + Próximas Doses → /doses
        - Datas de Consultas (Agendar Consulta) → /consultas
        - Pesquisa Enfermagem → /pesquisa-enfermagem
        Spec 4.5 — moved to Patients tab:
        - Pacientes Ativos por Diagnóstico
        - Pacientes Ativos / Inativos
        Main dashboard now keeps: KPIs, Activity Window, Próximas Mensagens,
        operational counters (ENTREGAR/A PAGAR/ENFERMAGEM),
        and Próximas Doses (filtered to next 7 days). */}

    {/* Upcoming Scheduled Doses (filtered to next 7 days per March 2026 spec 4.2) */}
    <SectionCard id="section-upcoming-doses" title="Próximas Doses (próximos 7 dias)" icon={<Syringe size={18} className="text-teal-600" />} countBadge={upcomingScheduledDoses.length} badgeColor="bg-teal-100 text-teal-800" headerBg="bg-teal-50/30">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
      <tr>
        <th className="px-6 py-3">
          <div className="flex items-center gap-1">
            Data Programada
            <SortButton isAsc={upcomingDosesSortAsc} onToggle={() => { setUpcomingDosesSortAsc(!upcomingDosesSortAsc); setUpcomingDosesPage(1); }} />
          </div>
        </th>
        <th className="px-6 py-3">Faltam</th>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">Responsável</th>
        <th className="px-6 py-3">Protocolo</th>
        <th className="px-6 py-3">Comprador</th>
        <th className="px-6 py-3 text-right">Ação</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {upcomingScheduledDoses.length === 0 ? (
        <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Nenhuma dose futura programada.</td></tr>
      ) : (
        paginate(upcomingScheduledDoses, upcomingDosesPage).map((dose: ScheduledDoseItem, idx) => (
        <tr
          key={`${dose.treatmentId}-${dose.cycleNumber}`}
          onClick={() => navigate(`/tratamento/${dose.treatmentId}`)}
          className="hover:bg-teal-50/20 cursor-pointer transition-colors group"
        >
          <td className="px-6 py-4 font-bold text-teal-800">
          {formatDate(dose.scheduledDate.toISOString())}
          </td>
          <td className="px-6 py-4">
          <span className={`flex items-center text-xs font-bold px-2 py-1 rounded w-fit ${
            dose.daysUntil === 0 ? 'bg-orange-100 text-orange-700' :
            dose.daysUntil <= 7 ? 'bg-amber-100 text-amber-700' :
            'bg-teal-100 text-teal-700'
          }`}>
            <Clock size={12} className="mr-1" />
            {dose.daysUntil === 0 ? 'Hoje' : `${dose.daysUntil} dias`}
          </span>
          </td>
          <td className="px-6 py-4 font-medium text-slate-900">{dose.patientName}</td>
          <td className="px-6 py-4 text-slate-600">{dose.guardianName}</td>
          <td className="px-6 py-4 text-xs text-slate-600 max-w-[150px] truncate" title={dose.protocolName}>
          {dose.protocolName}
          </td>
          <td className="px-6 py-4">
          {dose.lastDosePurchased === true ? (
            <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">Sim</span>
          ) : dose.lastDosePurchased === false ? (
            <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded">Não</span>
          ) : (
            <span className="text-slate-300">-</span>
          )}
          </td>
          <td className="px-6 py-4 text-right">
          <span className="inline-flex items-center text-slate-400 group-hover:text-teal-600 transition-colors">
            Abrir <ChevronRight size={16} className="ml-1" />
          </span>
          </td>
        </tr>
        ))
      )}
      </tbody>
    </table>
    <Pagination
      currentPage={upcomingDosesPage}
      totalPages={getTotalPages(upcomingScheduledDoses.length)}
      onPageChange={setUpcomingDosesPage}
    />
    </SectionCard>

    {/* Notas Fiscais Pendentes */}
    {pendingInvoices.length > 0 && (
    <SectionCard id="section-invoices" title="Notas Fiscais — Acompanhamento" icon={<Receipt size={18} className="text-amber-600" />} countBadge={pendingInvoices.length} badgeColor="bg-amber-100 text-amber-800" headerBg="bg-amber-50/30">
    <table className="w-full text-sm text-left">
      <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
      <tr>
        <th className="px-5 py-3">Criança</th>
        <th className="px-5 py-3">Responsável</th>
        <th className="px-5 py-3">CPF</th>
        <th className="px-5 py-3">Status</th>
        <th className="px-5 py-3">Data</th>
        <th className="px-5 py-3 text-right">Ação</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
      {pendingInvoices.map((inv: any) => (
        <tr key={inv.id} className="hover:bg-amber-50/30">
        <td className="px-5 py-3">
          <div className="font-medium text-slate-800">{inv.childName}</div>
          <div className="text-[10px] text-slate-400">{inv.dose?.treatment?.protocol?.name || ''}</div>
        </td>
        <td className="px-5 py-3">
          <div className="text-slate-700">{inv.guardianName}</div>
          <div className="text-[10px] text-slate-400">{inv.guardianEmail || ''}</div>
        </td>
        <td className="px-5 py-3 text-slate-600 font-mono text-xs">{inv.cpf || '—'}</td>
        <td className="px-5 py-3">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${NF_STATUS_COLORS[inv.status] || 'bg-slate-100'}`}>
          {NF_STATUS_LABELS[inv.status] || inv.status}
          </span>
        </td>
        <td className="px-5 py-3 text-xs text-slate-500">{new Date(inv.createdAt).toLocaleDateString('pt-BR')}</td>
        <td className="px-5 py-3 text-right">
          {NF_NEXT_STATUS[inv.status] && (
          <button
            onClick={() => handleNfAdvance(inv.id, inv.status)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
          >
            <CheckCircle2 size={12} />
            {NF_ACTION_LABELS[inv.status]}
          </button>
          )}
        </td>
        </tr>
      ))}
      </tbody>
    </table>
    </SectionCard>
    )}

    {/* Duplicate Appointments */}
    <SectionCard id="section-dup-appointments" title="Consultas Futuras Duplicadas" icon={<CalendarX2 size={18} className="text-red-500" />} countBadge={dupData.length > 0 ? new Set(dupData.map((d: any) => d.nome_completo)).size : 0} badgeColor="bg-red-100 text-red-800" headerBg="bg-red-50/30">
      <div className="p-4">
        <div className="flex gap-2 mb-3">
          {[30, 60, 90, 0].map(d => (
            <button
              key={d}
              onClick={() => setDupDias(d || 365)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                (d === 0 ? dupDias === 365 : dupDias === d)
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d === 0 ? 'Todos' : `${d} dias`}
            </button>
          ))}
        </div>
        {dupLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
            <Loader2 size={14} className="animate-spin" /> Carregando...
          </div>
        ) : dupData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhuma consulta duplicada encontrada.</p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2">Paciente</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Horário</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Procedimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dupData.map((c: any, idx: number) => {
                  const [y, m, d] = c.data.split('-');
                  const statusMap: Record<string, string> = { sc: 'Agendado', co: 'Confirmado', pa: 'Confirmado' };
                  const statusColor: Record<string, string> = { sc: 'bg-blue-100 text-blue-700', co: 'bg-green-100 text-green-700', pa: 'bg-green-100 text-green-700' };
                  const isFirstOfGroup = idx === 0 || dupData[idx - 1].nome_completo !== c.nome_completo;
                  return (
                    <tr key={idx} className={`hover:bg-red-50/30 ${isFirstOfGroup && idx > 0 ? 'border-t-2 border-red-200' : ''}`}>
                      <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap" title={c.nome_completo}>{c.nome}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{`${d}/${m}/${y}`}</td>
                      <td className="px-3 py-2 text-slate-600">{c.hora}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor[c.status] || 'bg-slate-100'}`}>
                          {statusMap[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">{c.procedimento || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>

    {/* MODALS */}
    <Modal open={addressModalOpen} onClose={() => setAddressModalOpen(false)} title="Endereço de Entrega" icon={<Bike size={18} className="text-amber-600" />}>
    <div className="mb-4">
      <p className="text-xs uppercase font-bold text-slate-400 mb-1">Responsável</p>
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
      WhatsApp Responsável
      </button>
      <button onClick={handleCopyAddress} className={`w-full flex items-center justify-center py-2.5 rounded-lg font-medium transition-colors ${isCopied ? 'bg-slate-600 text-white' : 'bg-pink-600 text-white hover:bg-pink-700'}`}>
      {isCopied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
      {isCopied ? 'Endereço Copiado!' : 'Copiar Endereço'}
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
        <label className="block text-sm font-medium text-slate-700 mb-1">Data da Aplicação</label>
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
        <label className="block text-sm font-medium text-slate-700 mb-1">Situação Pagamento</label>
        {!editPurchased ? (
        <div className="w-full py-2 px-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 text-sm italic">N/A (Sem compra)</div>
        ) : editDosePayment === PaymentStatus.PAID ? (
        <div className="w-full py-2 px-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
          {PAYMENT_STATUS_LABELS[PaymentStatus.PAID]}
          <span className="text-xs text-green-600 ml-2">(Edite na Gestão de Tratamento)</span>
        </div>
        ) : (
        <select required={editDoseStatus !== DoseStatus.NOT_ACCEPTED} disabled={editDoseStatus === DoseStatus.NOT_ACCEPTED} value={editDosePayment} onChange={(e) => setEditDosePayment(e.target.value as PaymentStatus)} className={`w-full border-slate-300 rounded-lg ${editDoseStatus === DoseStatus.NOT_ACCEPTED ? 'bg-slate-100 opacity-50' : ''}`}>
        <option value="" disabled>Selecione...</option>
        {Object.values(PaymentStatus).filter(s => s !== PaymentStatus.PAID).map(s => <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>)}
        </select>
        )}
      </div>
      <div className="lg:col-span-4 flex items-center mt-2">
        <input id="modalIsLast" type="checkbox" checked={editIsLast} onChange={(e) => setEditIsLast(e.target.checked)} className="w-4 h-4 text-pink-600 border-slate-300 rounded" />
        <label htmlFor="modalIsLast" className="ml-2 text-sm font-medium text-slate-900">Esta é a última dose antes da consulta?</label>
      </div>
      </div>
      <div className="mt-4">
      <h4 className="font-bold text-slate-700 mb-3 flex items-center text-sm uppercase tracking-wide">
        <UserCheck size={16} className="mr-2 text-pink-600" /> Acompanhamento e Satisfação
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
        <div className="md:col-span-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">1. Enfermeira</label>
        <select required value={editNurse} onChange={e => setEditNurse(e.target.value)} className="w-full border-slate-300 rounded-lg">
          <option value="" disabled>Selecione...</option>
          <option value="yes">Sim</option>
          <option value="no">Não</option>
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
          <label className="block text-sm font-medium text-slate-700 mb-1">3. Nota (1-10)</label>
          {/* March 2026 bug fix: dropdown with empty default; null => "não avaliado" */}
          <select
            value={editScore === null ? '' : String(editScore)}
            onChange={e => setEditScore(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full border-slate-300 rounded-lg"
            disabled={editSurveyStatus !== SurveyStatus.ANSWERED}
          >
            <option value="">— Selecione</option>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          </div>
          <span className={`w-10 h-10 flex items-center justify-center bg-white border border-slate-200 font-bold rounded-lg ${editSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40' : ''}`}>{editScore ?? '—'}</span>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">4. Comentário</label>
          <input type="text" value={editComment} onChange={e => setEditComment(e.target.value)} placeholder="Observação sobre o atendimento..." className="w-full border-slate-300 rounded-lg" />
        </div>
        </div>
      </div>
      </div>
      <div className="flex justify-end pt-6">
      <button type="button" onClick={() => setDoseModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2">Cancelar</button>
      <button type="submit" disabled={isSavingDose} className="flex items-center px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50">
        {isSavingDose ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
        {isSavingDose ? 'Salvando...' : 'Salvar Alterações'}
      </button>
      </div>
    </form>
    </Modal>

    {/* Consultation Modal */}
    <Modal open={consultModalOpen} onClose={() => setConsultModalOpen(false)} title="Agendar Consulta" icon={<Calendar size={16} className="text-purple-600" />}>
    <div className="space-y-4">
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
      <p className="text-xs font-bold text-purple-600 uppercase mb-1">Paciente</p>
      <p className="font-bold text-slate-800">{consultPatientName}</p>
      </div>
      <form onSubmit={handleSaveConsult}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Data para Próxima Consulta Indicada</label>
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
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ação / Mensagem</label>
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
          <div><p className="text-xs text-slate-500 mb-1">Responsável</p><p className="font-medium text-slate-800">{selectedContact.patientGuardian}</p></div>
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

      {/* NF Prompt Modal */}
      {nfPromptOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg"><Receipt size={20} className="text-amber-600" /></div>
              <h3 className="text-lg font-bold text-slate-800">Emitir Nota Fiscal?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">Deseja iniciar a emissão de nota fiscal para esta dose?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setNfPromptOpen(false); setNfPromptDoseId(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
              >Não</button>
              <button
                onClick={handleNfYes}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >Sim, emitir</button>
            </div>
          </div>
        </div>
      )}

      {/* NF Loading */}
      {nfLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-amber-600" />
            <span className="text-slate-700">Carregando dados para NF...</span>
          </div>
        </div>
      )}

      {/* NF Form Modal */}
      {nfFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-amber-100 rounded-lg"><Receipt size={20} className="text-amber-600" /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Dados para Nota Fiscal</h3>
                <p className="text-xs text-slate-500">Confirme os dados antes de enviar ao responsável</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome Completo do Responsável *</label>
                <input type="text" value={nfForm.guardianName} onChange={e => setNfForm(f => ({ ...f, guardianName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email do Responsável</label>
                <input type="email" value={nfForm.guardianEmail} onChange={e => setNfForm(f => ({ ...f, guardianEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome Completo da Criança *</label>
                <input type="text" value={nfForm.childName} onChange={e => setNfForm(f => ({ ...f, childName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CPF</label>
                  <input type="text" value={nfForm.cpf} onChange={e => setNfForm(f => ({ ...f, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
                  <input type="text" value={nfForm.cep} onChange={e => setNfForm(f => ({ ...f, cep: e.target.value }))}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label>
                <input type="text" value={nfForm.address} onChange={e => setNfForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => { setNfFormOpen(false); setNfPromptDoseId(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium" disabled={nfSaving}>
                Cancelar
              </button>
              <button onClick={handleNfSubmit}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium disabled:opacity-50 flex items-center gap-2"
                disabled={nfSaving}>
                {nfSaving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Receipt size={14} /> Confirmar e Criar NF</>}
              </button>
            </div>
          </div>
        </div>
      )}

  </div>
  );
};

export default Dashboard;
