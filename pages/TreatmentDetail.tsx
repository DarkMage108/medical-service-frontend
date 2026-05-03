
import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';
import { useParams, Link, useLocation } from 'react-router-dom';
import { treatmentsApi, dosesApi, patientsApi, protocolsApi, inventoryApi } from '../services/api';
import { formatDate, getStatusColor, addDays, diffInDays, getTreatmentStatusColor, DOSE_STATUS_LABELS, PAYMENT_STATUS_LABELS, SURVEY_STATUS_LABELS, TREATMENT_STATUS_LABELS, formatConsultationPeriod } from '../constants';
import { Dose, DoseStatus, PaymentStatus, SurveyStatus, Treatment, TreatmentStatus, ProtocolCategory, PatientFull, Protocol, InventoryItem } from '../types';
import FortnightSelector from '../components/ui/FortnightSelector';
import { ArrowLeft, Calendar, Plus, Save, Edit2, X, Activity, AlignLeft, MessageSquare, Edit, UserCheck, Star, Loader2, AlertTriangle, Package, Truck, CreditCard, Check, RefreshCw } from 'lucide-react';

const TreatmentDetail: React.FC = () => {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [showDoseForm, setShowDoseForm] = useState(false);

  // Data states
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [patient, setPatient] = useState<PatientFull | null>(null);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Treatment Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingTreatment, setIsSavingTreatment] = useState(false);

  const [editProtocolId, setEditProtocolId] = useState('');
  const [editPlannedDoses, setEditPlannedDoses] = useState(0);
  const [editNextConsult, setEditNextConsult] = useState('');
  // March 2026: structured Quinzena edit fields
  const [editNextMonth, setEditNextMonth] = useState<number | null>(null);
  const [editNextYear, setEditNextYear] = useState<number | null>(null);
  const [editNextFortnight, setEditNextFortnight] = useState<1 | 2 | null>(null);
  const [editStatus, setEditStatus] = useState<TreatmentStatus>(TreatmentStatus.ONGOING);
  const [editStartDate, setEditStartDate] = useState('');
  const [editObservations, setEditObservations] = useState('');

  // Dose Form States
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [editingCycleNumber, setEditingCycleNumber] = useState<number | null>(null);
  const [isSavingDose, setIsSavingDose] = useState(false);
  // Dose form no longer uses step wizard — single-page form with collapsible sections
  // Application tracking — populated from dose.appliedBy when editing
  const [doseAppliedByName, setDoseAppliedByName] = useState<string>('');
  const [doseAppliedAt, setDoseAppliedAt] = useState<string>('');

  const [doseDate, setDoseDate] = useState(new Date().toISOString().split('T')[0]);
  const [doseScheduledDate, setDoseScheduledDate] = useState(''); // Stores the scheduled date for the dose being created/edited
  const [doseLot, setDoseLot] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');

  const [dosePurchased, setDosePurchased] = useState<boolean>(false);
  const [doseDeliveryStatus, setDoseDeliveryStatus] = useState<'waiting' | 'delivered' | ''>('');

  const [doseStatus, setDoseStatus] = useState<DoseStatus | ''>('');
  const [dosePayment, setDosePayment] = useState<PaymentStatus | ''>('');
  const [dosePaymentMethod, setDosePaymentMethod] = useState<'PIX' | 'CARD' | 'BOLETO' | ''>('');
  const [dosePaymentDate, setDosePaymentDate] = useState('');

  const [doseIsLast, setDoseIsLast] = useState(false);
  const [doseConsultDate, setDoseConsultDate] = useState('');

  const [doseNurseSelection, setDoseNurseSelection] = useState('');
  const [doseSurveyStatus, setDoseSurveyStatus] = useState<SurveyStatus | ''>('');
  // March 2026 BUG FIX: default null (not 0) — 0 is not a valid 1-10 score, must be distinguishable from "not evaluated"
  const [doseSurveyScore, setDoseSurveyScore] = useState<number | null>(null);
  const [doseSurveyComment, setDoseSurveyComment] = useState('');

  // Load data from API
  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [treatmentData, protocolsRes, inventoryRes] = await Promise.all([
        treatmentsApi.getById(id),
        protocolsApi.getAll(),
        inventoryApi.getAvailable()
      ]);

      setTreatment(treatmentData);
      setProtocols(protocolsRes.data || []);
      setInventory(inventoryRes.data || []);

      // Load patient and protocol details
      if (treatmentData) {
        const [patientData, dosesRes] = await Promise.all([
          patientsApi.getById(treatmentData.patientId),
          dosesApi.getAll({ treatmentId: id })
        ]);

        setPatient(patientData);
        setDoses((dosesRes.data || []).sort((a: Dose, b: Dose) =>
          new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
        ));

        const proto = protocolsRes.data?.find((p: Protocol) => p.id === treatmentData.protocolId);
        setProtocol(proto || null);

        // Initialize edit states
        setEditProtocolId(treatmentData.protocolId);
        setEditPlannedDoses(treatmentData.plannedDosesBeforeConsult || 0);
        setEditNextConsult(treatmentData.nextConsultationDate ? new Date(treatmentData.nextConsultationDate).toISOString().split('T')[0] : '');
        setEditNextMonth(treatmentData.nextConsultationMonth ?? null);
        setEditNextYear(treatmentData.nextConsultationYear ?? null);
        setEditNextFortnight((treatmentData.nextConsultationFortnight as 1 | 2) ?? null);
        setEditStatus(treatmentData.status);
        setEditStartDate(treatmentData.startDate ? new Date(treatmentData.startDate).toISOString().split('T')[0] : '');
        setEditObservations(treatmentData.observations || '');
      }
    } catch (err: any) {
      console.error('Error loading treatment:', err);
      setError(err.message || 'Erro ao carregar tratamento');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openDose') === '1' && doses.length > 0 && !showDoseForm) {
      const dose1 = doses.find((d: Dose) => d.cycleNumber === 1);
      if (dose1) {
        handleEditDose(dose1);
      }
      window.history.replaceState({}, '', location.pathname);
    }
  }, [doses]);

  // Available Inventory Lots for this Protocol
  const availableLots = useMemo(() => {
    if (!protocol) return [];

    // If protocol has medicationType, filter by it
    if (protocol.medicationType) {
      return inventory.filter(item =>
        item.medicationName === protocol.medicationType &&
        item.active &&
        item.quantity > 0 &&
        new Date(item.expiryDate) >= new Date()
      );
    }

    // If no medicationType, show all available inventory items
    return inventory.filter(item =>
      item.active &&
      item.quantity > 0 &&
      new Date(item.expiryDate) >= new Date()
    );
  }, [protocol, inventory]);

  // Check for auto-open edit dose from navigation state
  useEffect(() => {
    if (location.state && (location.state as any).editDoseId && doses.length > 0) {
      const doseId = (location.state as any).editDoseId;
      const doseToEdit = doses.find(d => d.id === doseId);
      if (doseToEdit) {
        handleOpenEditDose(doseToEdit);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location, doses]);

  const handleOpenEditDose = (dose: Dose) => {
    setEditingDoseId(dose.id);
    setEditingCycleNumber(dose.cycleNumber || null);
    setDoseDate(dose.applicationDate.split('T')[0]);
    setDoseScheduledDate(dose.scheduledDate ? dose.scheduledDate.split('T')[0] : dose.applicationDate.split('T')[0]);
    setDoseLot(dose.lotNumber || '');
    setSelectedInventoryId(dose.inventoryLotId || '');
    setDoseStatus(dose.status);
    setDosePayment(dose.paymentStatus || '');
    setDosePaymentMethod(dose.paymentMethod || '');
    setDosePaymentDate(dose.paymentDate ? dose.paymentDate.split('T')[0] : '');
    setDoseIsLast(dose.isLastBeforeConsult || false);
    setDoseConsultDate(dose.consultationDate ? dose.consultationDate.split('T')[0] : '');

    setDosePurchased(dose.purchased !== undefined ? dose.purchased : false);
    setDoseDeliveryStatus(dose.deliveryStatus || '');

    // March 2026: keep existing nurse selection when editing; new doses default to 'yes'
    setDoseNurseSelection(dose.nurse ? 'yes' : 'no');
    setDoseSurveyStatus(dose.surveyStatus || '');
    setDoseSurveyScore(dose.surveyScore ?? null);
    setDoseSurveyComment(dose.surveyComment || '');

    // Application tracking (highlight card)
    setDoseAppliedByName((dose as any).appliedBy?.name || '');
    setDoseAppliedAt(dose.appliedAt || '');

    setShowDoseForm(true);

    setTimeout(() => {
      document.getElementById('dose-form-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleInventorySelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const invId = e.target.value;
    setSelectedInventoryId(invId);

    const lot = availableLots.find(l => l.id === invId);
    if (lot) {
      setDoseLot(lot.lotNumber);
    }
  };

  const resetDoseForm = () => {
    setEditingDoseId(null);
    setEditingCycleNumber(null);
    setDoseDate(new Date().toISOString().split('T')[0]);
    setDoseScheduledDate('');
    setDoseLot('');
    setSelectedInventoryId('');
    setDoseStatus('');
    setDosePayment('');
    setDosePaymentMethod('');
    setDosePaymentDate('');
    setDoseDeliveryStatus('');
    setDosePurchased(false);
    setDoseIsLast(false);
    setDoseConsultDate('');
    setDoseNurseSelection('');
    setDoseSurveyStatus(SurveyStatus.NOT_SENT);
    setDoseSurveyScore(null);
    setDoseSurveyComment('');
    setDoseAppliedByName('');
    setDoseAppliedAt('');
  };

  const handleOpenNewDose = (cycleNumber?: number, scheduledDate?: Date) => {
    resetDoseForm();

    if (treatment) {
      const targetCycleNumber = cycleNumber || (doses.length + 1);

      // Store the cycle number for saving
      setEditingCycleNumber(targetCycleNumber);

      // Set application date and scheduled date from scheduled date if provided
      if (scheduledDate) {
        const dateStr = scheduledDate.toISOString().split('T')[0];
        setDoseDate(dateStr);
        setDoseScheduledDate(dateStr);
      }

      // Mark as last dose if this is the last planned dose
      if (targetCycleNumber === treatment.plannedDosesBeforeConsult) {
        setDoseIsLast(true);
        // Auto-fill consultation date if available
        if (treatment.nextConsultationDate) {
          setDoseConsultDate(treatment.nextConsultationDate.split('T')[0]);
        }
      }
    }

    setShowDoseForm(true);

    // Scroll to form after it renders
    setTimeout(() => {
      document.getElementById('dose-form-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle click on scheduled dose card
  const handleScheduledDoseClick = async (scheduledDose: { cycleNumber: number; scheduledDate: Date; isCreated: boolean; doseId?: string }) => {
    if (scheduledDose.isCreated && scheduledDose.doseId) {
      // Dose already exists - open editor
      const existingDose = doses.find(d => d.id === scheduledDose.doseId);
      if (existingDose) {
        handleOpenEditDose(existingDose);
      }
    } else {
      // Dose doesn't exist - check if there's already a dose for this cycle (prevent duplicates)
      const existingDoseForCycle = doses.find(d => d.cycleNumber === scheduledDose.cycleNumber);
      if (existingDoseForCycle) {
        // Already exists, open it
        handleOpenEditDose(existingDoseForCycle);
      } else {
        // Create new dose with scheduled date and pending status
        handleOpenNewDose(scheduledDose.cycleNumber, scheduledDose.scheduledDate);
        // Pre-set status to PENDING
        setDoseStatus(DoseStatus.PENDING);
      }
    }
  };

  const handleSaveDose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !protocol) return;

    if (!doseStatus) { toast("Selecione o Status da Dose", "warning"); return; }

    if (dosePurchased && !dosePayment) { toast("Selecione a Situação do Pagamento", "warning"); return; }
    if (dosePurchased) {
      if (!dosePaymentMethod) {
        toast("Selecione a Forma de Pagamento", "warning");
        return;
      }
      if (dosePayment === PaymentStatus.PAID && !dosePaymentDate) {
        toast("Informe a Data do Pagamento", "warning");
        return;
      }
    }
    if (!doseNurseSelection) { toast("Informe se houve acompanhamento da Enfermeira", "warning"); return; }

    if (dosePurchased && availableLots.length > 0 && !selectedInventoryId && !editingDoseId) {
      toast("Selecione um lote disponivel no estoque", "warning");
      return;
    }

    setIsSavingDose(true);

    try {
      const isNurse = doseNurseSelection === 'yes';
      const finalSurveyStatus = !isNurse ? SurveyStatus.NOT_SENT : (doseSurveyStatus as SurveyStatus || SurveyStatus.NOT_SENT);

      // Use editingCycleNumber if set, otherwise calculate next cycle
      const cycleNumber = editingCycleNumber || (doses.length + 1);

      // Check for duplicate cycle number (only for new doses)
      if (!editingDoseId) {
        const existingDoseForCycle = doses.find(d => d.cycleNumber === cycleNumber);
        if (existingDoseForCycle) {
          toast(`Ja existe uma dose para o ciclo ${cycleNumber}. Edite a dose existente.`, 'warning');
          setIsSavingDose(false);
          return;
        }
      }

      const doseData = {
        treatmentId: id,
        cycleNumber: cycleNumber,
        scheduledDate: doseScheduledDate ? new Date(doseScheduledDate).toISOString() : new Date(doseDate).toISOString(),
        applicationDate: new Date(doseDate).toISOString(),
        lotNumber: dosePurchased ? (doseLot || '') : '',
        inventoryLotId: dosePurchased ? (selectedInventoryId || undefined) : undefined,
        purchased: dosePurchased,
        deliveryStatus: dosePurchased ? (doseDeliveryStatus as any) : undefined,
        status: doseStatus,
        paymentStatus: dosePurchased && dosePayment ? (dosePayment as PaymentStatus) : null,
        // Dados financeiros sempre enviados (obrigatórios para CAIXA)
        paymentMethod: dosePaymentMethod || undefined,
        paymentDate: dosePaymentDate ? new Date(dosePaymentDate).toISOString() : undefined,
        isLastBeforeConsult: doseIsLast,
        consultationDate: doseIsLast ? (doseConsultDate ? new Date(doseConsultDate).toISOString() : undefined) : undefined,
        nurse: isNurse,
        surveyStatus: finalSurveyStatus,
        // March 2026 bug fix: send null (not 0) when not evaluated. Score is only set when nurse explicitly fills.
        surveyScore: doseSurveyScore !== null ? Number(doseSurveyScore) : null,
        surveyComment: doseSurveyComment
      };

      if (editingDoseId) {
        await dosesApi.update(editingDoseId, doseData);
      } else {
        await dosesApi.create(doseData);
      }

      await loadData(); // Refresh data
      setShowDoseForm(false);
      resetDoseForm();
    } catch (err: any) {
      console.error('Error saving dose:', err);
      toast('Erro ao salvar dose: ' + (err.message || 'Erro'), 'error');
    } finally {
      setIsSavingDose(false);
    }
  };

  const handleSaveTreatmentDetails = async () => {
    if (!id) return;

    setIsSavingTreatment(true);

    try {
      const updates: any = {
        protocolId: editProtocolId,
        plannedDosesBeforeConsult: Number(editPlannedDoses),
        nextConsultationDate: editNextConsult || undefined,
        // March 2026: structured Quinzena fields. Send null to clear.
        nextConsultationMonth: editNextMonth,
        nextConsultationYear: editNextYear,
        nextConsultationFortnight: editNextFortnight,
        status: editStatus,
        startDate: editStartDate,
        observations: editObservations,
      };

      await treatmentsApi.update(id, updates);

      // If nextConsultationDate is set and plannedDoses > 0, update the last planned dose
      if (editNextConsult && editPlannedDoses > 0) {
        const lastCycleNumber = editPlannedDoses;
        const lastDose = doses.find(d => d.cycleNumber === lastCycleNumber);

        if (lastDose) {
          // Update existing last dose with consultation date and mark as last
          await dosesApi.update(lastDose.id, {
            isLastBeforeConsult: true,
            consultationDate: new Date(editNextConsult).toISOString()
          });
        }
      }

      await loadData();
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating treatment:', err);
      toast('Erro ao atualizar tratamento: ' + (err.message || 'Erro'), 'error');
    } finally {
      setIsSavingTreatment(false);
    }
  };

  const toggleEditMode = () => {
    if (!isEditing && treatment) {
      setEditProtocolId(treatment.protocolId);
      setEditPlannedDoses(treatment.plannedDosesBeforeConsult || 0);
      setEditNextConsult(treatment.nextConsultationDate ? new Date(treatment.nextConsultationDate).toISOString().split('T')[0] : '');
      setEditNextMonth(treatment.nextConsultationMonth ?? null);
      setEditNextYear(treatment.nextConsultationYear ?? null);
      setEditNextFortnight((treatment.nextConsultationFortnight as 1 | 2) ?? null);
      setEditStatus(treatment.status);
      setEditStartDate(treatment.startDate ? new Date(treatment.startDate).toISOString().split('T')[0] : '');
      setEditObservations(treatment.observations || '');
    }
    setIsEditing(!isEditing);
  };

  const handleEditProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setEditProtocolId(pid);

    const proto = protocols.find(p => p.id === pid);
    if (proto && proto.category === ProtocolCategory.MONITORING) {
      setEditPlannedDoses(0);
    }
  };

  const isEditMedicationProtocol = useMemo(() => {
    const proto = protocols.find(p => p.id === editProtocolId);
    return proto?.category === ProtocolCategory.MEDICATION || proto?.category === 'MEDICATION';
  }, [editProtocolId, protocols]);

  const previewNextDate = protocol ? addDays(new Date(doseDate), protocol.frequencyDays || 30) : new Date();

  // Calculate scheduled doses based on protocol, start date, and planned doses
  // For existing doses: use backend scheduledDate. For future: chain from last applied dose's applicationDate
  const scheduledDoses = useMemo(() => {
    if (!treatment || !protocol || treatment.plannedDosesBeforeConsult === 0) return [];

    const scheduled: { cycleNumber: number; scheduledDate: Date; isCreated: boolean; doseId?: string; actualDose?: Dose }[] = [];
    const startDate = addDays(treatment.startDate, 0);
    const frequencyDays = protocol.frequencyDays || 28;

    for (let i = 0; i < treatment.plannedDosesBeforeConsult; i++) {
      const cycleNumber = i + 1;
      const existingDose = doses.find(d => d.cycleNumber === cycleNumber);

      if (existingDose) {
        // Use the scheduledDate from backend (may have been recalculated)
        scheduled.push({
          cycleNumber,
          scheduledDate: addDays(existingDose.scheduledDate || existingDose.applicationDate, 0),
          isCreated: true,
          doseId: existingDose.id,
          actualDose: existingDose
        });
      } else {
        let scheduledDate: Date;

        if (i === 0) {
          scheduledDate = startDate;
        } else {
          const previous = scheduled[i - 1];
          // If previous dose was applied, chain from its ACTUAL application date
          if (previous && previous.actualDose &&
              (previous.actualDose.status === DoseStatus.APPLIED || previous.actualDose.status === DoseStatus.APPLIED_LATE)) {
            scheduledDate = addDays(previous.actualDose.applicationDate, frequencyDays);
          } else if (previous) {
            scheduledDate = addDays(previous.scheduledDate, frequencyDays);
          } else {
            scheduledDate = addDays(startDate, i * frequencyDays);
          }
        }

        scheduled.push({
          cycleNumber,
          scheduledDate,
          isCreated: false
        });
      }
    }

    return scheduled;
  }, [treatment, protocol, doses]);

  // Separate scheduled doses into created and future
  const createdDoses = scheduledDoses.filter(d => d.isCreated);
  const futureDoses = scheduledDoses.filter(d => !d.isCreated);

  // Check for overdue doses (future doses with date in the past)
  const overdueDoses = futureDoses.filter(d => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.scheduledDate < today;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando tratamento...</span>
      </div>
    );
  }

  if (error || !treatment || !patient || !protocol) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={48} className="mx-auto text-red-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Tratamento nao encontrado</h3>
        <p className="text-slate-500 mb-4">{error || 'O tratamento solicitado nao existe.'}</p>
        <Link to="/pacientes" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
          Voltar para Pacientes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/pacientes/${patient.id}`} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">Gestão de Tratamento</h1>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getTreatmentStatusColor(treatment.status)}`}>
                {treatment.status}
              </span>
            </div>
            <p className="text-slate-500">{patient.fullName} - {protocol.name}</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Protocol Summary / Edit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-700">Detalhes do Plano Terapeutico</h3>
          <button
            onClick={toggleEditMode}
            disabled={isSavingTreatment}
            className={`flex items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isEditing ? 'bg-red-50 text-red-600' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            {isEditing ? (
              <>
                <X size={16} className="mr-2" />
                Cancelar Edicao
              </>
            ) : (
              <>
                <Edit2 size={16} className="mr-2" />
                Editar Dados
              </>
            )}
          </button>
        </div>

        <div className="p-6">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicamento / Protocolo</label>
                  <p className="font-semibold text-slate-800 mt-1">{protocol.medicationType}</p>
                  <p className="text-xs text-slate-500">{protocol.name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Inicio</label>
                  <div className="flex items-center mt-1">
                    <span className="font-medium text-slate-800">{formatDate(treatment.startDate)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doses Planejadas (Pre-Consulta)</label>
                  <div className="flex items-center mt-1">
                    <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-md font-bold">{treatment.plannedDosesBeforeConsult}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Próxima Consulta (Indicada)</label>
                  <div className="flex items-center mt-1">
                    {(treatment.nextConsultationMonth && treatment.nextConsultationYear && treatment.nextConsultationFortnight) ? (
                      <span className="font-medium text-slate-800 flex items-center">
                        <Calendar size={16} className="mr-2 text-slate-400" />
                        {formatConsultationPeriod(
                          treatment.nextConsultationMonth,
                          treatment.nextConsultationYear,
                          treatment.nextConsultationFortnight,
                        )}
                      </span>
                    ) : treatment.nextConsultationDate ? (
                      <span className="font-medium text-slate-800 flex items-center">
                        <Calendar size={16} className="mr-2 text-slate-400" />
                        {formatDate(treatment.nextConsultationDate)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Nao agendada</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center">
                    <AlignLeft size={14} className="mr-1" /> Observacoes
                  </label>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[40px]">
                    {treatment.observations || "Nenhuma observacao registrada."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Protocolo (Medicamento)</label>
                  <select
                    value={editProtocolId}
                    onChange={handleEditProtocolChange}
                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  >
                    {protocols.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.medicationType}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status do Tratamento</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as TreatmentStatus)}
                    className="block w-full border-slate-300 rounded-lg font-medium focus:ring-pink-500 focus:border-pink-500"
                  >
                    {Object.values(TreatmentStatus).map(s => <option key={s} value={s}>{TREATMENT_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Inicio</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                <div className={!isEditMedicationProtocol ? "opacity-50" : ""}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Doses Planejadas (Ciclo)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={editPlannedDoses}
                    onChange={e => setEditPlannedDoses(Number(e.target.value))}
                    disabled={!isEditMedicationProtocol}
                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  {!isEditMedicationProtocol && (
                    <span className="text-xs text-slate-500">Nao aplicavel a protocolos de monitoramento.</span>
                  )}
                </div>
              </div>

              {/* March 2026: structured Quinzena selector. Legacy date field kept below for transition. */}
              <FortnightSelector
                month={editNextMonth}
                year={editNextYear}
                fortnight={editNextFortnight}
                onChange={(m, y, f) => {
                  setEditNextMonth(m);
                  setEditNextYear(y);
                  setEditNextFortnight(f);
                }}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Próxima Consulta (data exata — opcional)
                  </label>
                  <input
                    type="date"
                    value={editNextConsult}
                    onChange={e => setEditNextConsult(e.target.value)}
                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Use a previsão acima quando ainda não houver data exata definida.</p>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Observacoes do Tratamento</label>
                <textarea
                  rows={2}
                  value={editObservations}
                  onChange={e => setEditObservations(e.target.value)}
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Anotacoes gerais..."
                />
              </div>

              <div className="md:col-span-2 pt-4 flex justify-end">
                <button
                  onClick={handleSaveTreatmentDetails}
                  disabled={isSavingTreatment}
                  className="flex items-center bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingTreatment ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
                  {isSavingTreatment ? 'Salvando...' : 'Salvar Alteracoes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Doses Section */}
      {scheduledDoses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-700 flex items-center">
                <Calendar size={18} className="mr-2 text-pink-600" />
                Doses Programadas
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Baseado no Protocolo ({protocol?.name}) + Data de Início + Doses Planejadas ({treatment?.plannedDosesBeforeConsult})
              </p>
            </div>
            {overdueDoses.length > 0 && (
              <span className="flex items-center text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                <AlertTriangle size={14} className="mr-1" />
                {overdueDoses.length} dose{overdueDoses.length > 1 ? 's' : ''} em atraso
              </span>
            )}
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledDoses.map((scheduledDose) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const actualDose = scheduledDose.actualDose || (scheduledDose.doseId ? doses.find(d => d.id === scheduledDose.doseId) : null);

                // Determine display status
                let displayStatus: string;
                let bgClass: string;
                let textClass: string;
                let badgeClass: string;

                if (scheduledDose.isCreated && actualDose) {
                  if (actualDose.status === DoseStatus.APPLIED) {
                    displayStatus = 'APLICADA';
                    bgClass = 'bg-green-50 border-green-200 hover:border-green-400';
                    textClass = 'text-green-700';
                    badgeClass = 'bg-green-600 text-white';
                  } else if (actualDose.status === DoseStatus.APPLIED_LATE) {
                    displayStatus = 'APLICADA COM ATRASO';
                    bgClass = 'bg-amber-50 border-amber-200 hover:border-amber-400';
                    textClass = 'text-amber-700';
                    badgeClass = 'bg-amber-500 text-white';
                  } else if (actualDose.status === DoseStatus.NOT_ACCEPTED) {
                    displayStatus = 'NAO REALIZADA';
                    bgClass = 'bg-slate-50 border-slate-200 hover:border-slate-400';
                    textClass = 'text-slate-500';
                    badgeClass = 'bg-slate-400 text-white';
                  } else {
                    // PENDING - dose registered, waiting application
                    displayStatus = 'PENDENTE';
                    bgClass = 'bg-blue-50 border-blue-200 hover:border-blue-400';
                    textClass = 'text-blue-700';
                    badgeClass = 'bg-blue-600 text-white';
                  }
                } else {
                  // Not created yet - compute from scheduledDate vs today
                  const daysDiff = diffInDays(scheduledDose.scheduledDate, today);
                  if (daysDiff > 0) {
                    displayStatus = 'PROGRAMADA';
                    bgClass = 'bg-slate-50 border-slate-200 hover:border-pink-300';
                    textClass = 'text-slate-700';
                    badgeClass = 'bg-slate-400 text-white';
                  } else {
                    const daysLate = Math.abs(daysDiff);
                    displayStatus = `ATRASADA`;
                    bgClass = 'bg-red-50 border-red-300 hover:border-red-500';
                    textClass = 'text-red-700';
                    badgeClass = 'bg-red-600 text-white';
                  }
                }

                const isOverdue = displayStatus.startsWith('ATRASADA');
                const daysLateCount = isOverdue ? Math.abs(diffInDays(scheduledDose.scheduledDate, today)) : 0;

                return (
                  <button
                    key={scheduledDose.cycleNumber}
                    onClick={() => handleScheduledDoseClick(scheduledDose)}
                    className={`p-4 rounded-lg border-2 transition-all text-left w-full hover:shadow-md cursor-pointer ${bgClass}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          Dose {scheduledDose.cycleNumber}
                        </span>
                        <p className={`font-bold text-sm mt-1 ${textClass}`}>
                          {formatDate(scheduledDose.scheduledDate.toISOString())}
                        </p>
                        {/* Show actual application date if different from scheduled */}
                        {actualDose && (actualDose.status === DoseStatus.APPLIED_LATE) && (
                          <p className="text-[10px] text-amber-600 mt-0.5">
                            Aplicada: {formatDate(actualDose.applicationDate)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeClass}`}>
                          {displayStatus === 'APLICADA' && <><Check size={10} className="mr-0.5" /> APLICADA</>}
                          {displayStatus === 'APLICADA COM ATRASO' && <><AlertTriangle size={10} className="mr-0.5" /> APLICADA COM ATRASO</>}
                          {displayStatus === 'PENDENTE' && <><Calendar size={10} className="mr-0.5" /> PENDENTE</>}
                          {displayStatus === 'NAO REALIZADA' && <>NAO REALIZADA</>}
                          {displayStatus === 'PROGRAMADA' && <>PROGRAMADA</>}
                          {displayStatus === 'ATRASADA' && <><AlertTriangle size={10} className="mr-0.5" /> ATRASADA</>}
                        </span>
                        {isOverdue && daysLateCount > 0 && (
                          <span className="text-[10px] text-red-600 font-bold">{daysLateCount} dia(s) em atraso</span>
                        )}
                      </div>
                    </div>

                    {actualDose && actualDose.lotNumber && (
                      <div className="mt-2 pt-2 border-t border-slate-200/50">
                        <p className="text-xs text-slate-600">
                          Lote: <span className="font-mono font-medium">{actualDose.lotNumber}</span>
                        </p>
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center">
                      <Edit size={10} className="mr-1" />
                      {!scheduledDose.isCreated ? 'Clique para registrar aplicação' : 'Clique para editar'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        {!showDoseForm && (
          <button
            onClick={handleOpenNewDose}
            className="flex items-center bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 shadow-sm transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Adicionar Nova Dose
          </button>
        )}
      </div>

      {/* Add/Edit Dose Form — single-page with collapsible sections */}
      {showDoseForm && (
        <div id="dose-form-container" className="bg-white border border-slate-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-4 shadow-md">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-slate-800 flex items-center">
              {editingDoseId ? <Edit size={18} className="mr-2 text-pink-600" /> : <Plus size={18} className="mr-2 text-pink-600" />}
              {editingDoseId ? 'Editar Dose' : 'Nova Aplicação'}
              {editingCycleNumber && (
                <span className="ml-2 bg-pink-100 text-pink-700 text-xs font-bold px-2 py-1 rounded-full">
                  Dose {editingCycleNumber}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={() => { setShowDoseForm(false); resetDoseForm(); }}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Section indicators */}
          <div className="flex items-center gap-2 mt-4 mb-6 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1 rounded-full">Medicamento</span>
            {dosePurchased && <span className="text-[10px] font-bold uppercase tracking-widest bg-green-50 text-green-700 px-3 py-1 rounded-full">Pagamento</span>}
            <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1 rounded-full">Enfermeira</span>
          </div>

          {/* Application Data highlight card — visible whenever we know who applied */}
          {editingDoseId && (doseAppliedByName || doseAppliedAt) && (
            <div className="mb-5 p-4 rounded-lg bg-pink-50 border border-pink-200">
              <p className="text-xs font-bold text-pink-700 uppercase tracking-wide mb-2 flex items-center">
                <UserCheck size={14} className="mr-1.5" /> Dados da Aplicação
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {doseAppliedAt && (
                  <div>
                    <span className="text-xs text-slate-500 block">Em</span>
                    <span className="font-semibold text-slate-800">{formatDate(doseAppliedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSaveDose} className="space-y-6">

            {/* ============= Medicamento ============= */}
            <>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Medicamento</p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Compra de Medicamento?</label>
                  <div className="flex gap-3">
                    <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${dosePurchased ? 'bg-pink-50 border-pink-500 text-pink-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <input type="radio" name="purchased" checked={dosePurchased} onChange={() => setDosePurchased(true)} className="sr-only" />
                      Sim
                    </label>
                    <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${!dosePurchased ? 'bg-slate-100 border-slate-400 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <input type="radio" name="purchased" checked={!dosePurchased} onChange={() => { setDosePurchased(false); setSelectedInventoryId(''); setDoseLot(''); }} className="sr-only" />
                      Não
                    </label>
                  </div>
                </div>

                {dosePurchased && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lote (Estoque)</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedInventoryId}
                        onChange={handleInventorySelection}
                        disabled={!!editingDoseId && !!selectedInventoryId}
                        className="flex-1 w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 disabled:bg-slate-100"
                      >
                        <option value="">Selecione um lote do estoque...</option>
                        {availableLots.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.medicationName} - Lote: {item.lotNumber} - Val: {formatDate(item.expiryDate)} (Qtd: {item.quantity})
                          </option>
                        ))}
                      </select>
                      {availableLots.length === 0 && (
                        <div className="text-red-500 text-xs flex items-center w-24">
                          <AlertTriangle size={14} className="mr-1" /> Sem estoque
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <input type="hidden" value={doseLot} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data da Aplicação <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={doseDate}
                      onChange={(e) => setDoseDate(e.target.value)}
                      className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status da Dose <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={doseStatus}
                      onChange={(e) => setDoseStatus(e.target.value as DoseStatus)}
                      className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    >
                      <option value="" disabled>Selecione...</option>
                      <option value={DoseStatus.PENDING}>{DOSE_STATUS_LABELS[DoseStatus.PENDING]}</option>
                      <option value={DoseStatus.APPLIED}>{DOSE_STATUS_LABELS[DoseStatus.APPLIED]}</option>
                      <option value={DoseStatus.CONFIRM_APPLICATION}>{DOSE_STATUS_LABELS[DoseStatus.CONFIRM_APPLICATION]}</option>
                    </select>
                  </div>
                </div>
              </>

            {/* ============= Pagamento e Entrega (auto-hides when no purchase) ============= */}
            {dosePurchased && (
              <>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pagamento & Entrega</p>
                </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Situação Pagamento <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={dosePayment}
                        onChange={(e) => setDosePayment(e.target.value as PaymentStatus)}
                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="" disabled>Selecione...</option>
                        <option value={PaymentStatus.WAITING_PIX}>{PAYMENT_STATUS_LABELS[PaymentStatus.WAITING_PIX]}</option>
                        <option value={PaymentStatus.WAITING_BOLETO}>{PAYMENT_STATUS_LABELS[PaymentStatus.WAITING_BOLETO]}</option>
                        <option value={PaymentStatus.WAITING_CARD}>{PAYMENT_STATUS_LABELS[PaymentStatus.WAITING_CARD]}</option>
                        <option value={PaymentStatus.PAID}>{PAYMENT_STATUS_LABELS[PaymentStatus.PAID]}</option>
                      </select>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-xs font-semibold text-green-700 mb-3 uppercase tracking-wide">Dados Financeiros da Venda</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Forma de Pagamento <span className="text-red-500">*</span>
                          </label>
                          <select
                            required
                            value={dosePaymentMethod}
                            onChange={(e) => setDosePaymentMethod(e.target.value as 'PIX' | 'CARD' | 'BOLETO' | '')}
                            className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 bg-white"
                          >
                            <option value="" disabled>Selecione...</option>
                            <option value="PIX">PIX</option>
                            <option value="CARD">Cartão</option>
                            <option value="BOLETO">Boleto</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Data do Pagamento {dosePayment === PaymentStatus.PAID && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="date"
                            required={dosePayment === PaymentStatus.PAID}
                            min="2020-01-01"
                            max="2030-12-31"
                            value={dosePaymentDate}
                            onChange={(e) => setDosePaymentDate(e.target.value)}
                            className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 bg-white"
                          />
                          <p className="text-xs text-slate-500 mt-1 italic">
                            {dosePayment === PaymentStatus.PAID
                              ? 'Esta data será registrada como a data oficial da venda.'
                              : 'Obrigatória apenas quando a Situação for "PAGO".'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Entrega</label>
                      <select
                        value={doseDeliveryStatus}
                        onChange={(e) => setDoseDeliveryStatus(e.target.value as any)}
                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Selecione...</option>
                        <option value="waiting">Aguardando Entrega</option>
                        <option value="delivered">Entregue</option>
                      </select>
                    </div>
              </>
            )}

            {/* ============= Enfermeira ============= */}
            <>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Acompanhamento & Satisfação</p>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">1. Enfermeira</label>
                    <select
                      required
                      value={doseNurseSelection}
                      onChange={e => setDoseNurseSelection(e.target.value)}
                      className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    >
                      <option value="" disabled>Selecione...</option>
                      <option value="yes">Sim</option>
                      <option value="no">Não</option>
                    </select>
                  </div>

                  <div className={`md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 ${doseNurseSelection !== 'yes' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">2. Pesquisa</label>
                      <select
                        value={doseSurveyStatus}
                        onChange={e => setDoseSurveyStatus(e.target.value as SurveyStatus)}
                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="" disabled>Selecione...</option>
                        {Object.values(SurveyStatus).map(s => <option key={s} value={s}>{SURVEY_STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex items-end gap-2">
                      <div className={`flex-1 transition-opacity ${doseSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40 pointer-events-none' : ''}`}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">3. Nota (1-10)</label>
                        <select
                          value={doseSurveyScore === null ? '' : String(doseSurveyScore)}
                          onChange={e => setDoseSurveyScore(e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                          disabled={doseSurveyStatus !== SurveyStatus.ANSWERED}
                        >
                          <option value="">— Selecione</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <span className={`w-10 h-10 flex items-center justify-center bg-white border border-slate-200 font-bold rounded-lg text-slate-700 mb-1 ${doseSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40' : ''}`}>
                        {doseSurveyScore !== null ? doseSurveyScore : '—'}
                      </span>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-slate-700 mb-1">4. Comentário</label>
                      <input
                        type="text"
                        value={doseSurveyComment}
                        onChange={e => setDoseSurveyComment(e.target.value)}
                        placeholder="Observação sobre o atendimento..."
                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center h-5">
                    <input
                      id="isLast"
                      type="checkbox"
                      checked={doseIsLast}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setDoseIsLast(isChecked);
                        if (isChecked && treatment?.nextConsultationDate && !doseConsultDate) {
                          setDoseConsultDate(treatment.nextConsultationDate.split('T')[0]);
                        }
                      }}
                      className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
                    />
                    <label htmlFor="isLast" className="ml-2 text-sm font-medium text-slate-900">Esta é a última dose antes da consulta?</label>
                  </div>
                  {doseIsLast && (
                    <div className="flex-1 w-full animate-in fade-in duration-200">
                      <input
                        type="date"
                        value={doseConsultDate}
                        onChange={e => setDoseConsultDate(e.target.value)}
                        className="w-full text-sm border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Data Agendada da Consulta (Opcional)"
                      />
                    </div>
                  )}
                </div>
            </>

            {/* Form buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => { setShowDoseForm(false); resetDoseForm(); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSavingDose}
                className="flex items-center px-5 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow"
              >
                {isSavingDose ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
                {editingDoseId ? (isSavingDose ? 'Atualizando...' : 'Atualizar Dose') : (isSavingDose ? 'Salvando...' : 'Salvar Dose')}
              </button>
            </div>
          </form>
          <div className="mt-4 text-xs text-slate-500 flex items-center">
            <Activity size={14} className="mr-1" />
            Próxima aplicação estimada em: <span className="font-bold ml-1">{formatDate(previewNextDate.toISOString())}</span>
          </div>
        </div>
      )}

      {/* Doses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data Aplicacao / Programada</th>
                <th className="px-6 py-4">Protocolo</th>
                <th className="px-6 py-4">Lote</th>
                <th className="px-6 py-4">Status Dose</th>
                <th className="px-6 py-4">Pagamento</th>
                <th className="px-6 py-4">Entrega</th>
                <th className="px-6 py-4 text-right">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doses
                .slice()
                .sort((a, b) => (a.cycleNumber || 0) - (b.cycleNumber || 0))
                .map((dose) => (
                <tr key={dose.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        D{dose.cycleNumber || '-'}
                      </span>
                      <div>
                        <span>{formatDate(dose.applicationDate)}</span>
                        {dose.scheduledDate && formatDate(dose.scheduledDate) !== formatDate(dose.applicationDate) && (
                          <p className="text-[10px] text-amber-600 mt-0.5">
                            Programada: {formatDate(dose.scheduledDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700 text-xs">{protocol?.medicationType || protocol?.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    {dose.purchased ? (
                      <>
                        <span className="font-mono text-slate-600">{dose.lotNumber}</span>
                        {dose.inventoryLotId && (
                          <span className="ml-2 inline-flex items-center text-[10px] bg-green-50 text-green-700 px-1.5 rounded border border-green-100">
                            <Package size={10} className="mr-1" /> Estoque
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Nao Comprado</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(dose.status)}`}>
                      {DOSE_STATUS_LABELS[dose.status] || dose.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {dose.purchased === false ? (
                      <span className="text-slate-400 text-xs italic">N/A</span>
                    ) : dose.paymentStatus ? (
                      <span className={`inline-block px-2 py-1 rounded-md border ${getStatusColor(dose.paymentStatus)}`}>
                        {PAYMENT_STATUS_LABELS[dose.paymentStatus]}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {dose.deliveryStatus === 'delivered' && (
                      <span className="flex items-center text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-md text-xs font-bold w-fit">
                        <Check size={12} className="mr-1" /> Entregue
                      </span>
                    )}
                    {dose.deliveryStatus === 'waiting' && (
                      <span className="flex items-center text-orange-700 bg-orange-50 border border-orange-100 px-2 py-1 rounded-md text-xs font-bold w-fit">
                        <Truck size={12} className="mr-1" /> Aguardando
                      </span>
                    )}
                    {!dose.deliveryStatus && <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenEditDose(dose)}
                      className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all"
                      title="Editar Dose"
                    >
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {doses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">Nenhuma dose registrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TreatmentDetail;
