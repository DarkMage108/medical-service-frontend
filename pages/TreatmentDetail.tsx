
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { treatmentsApi, dosesApi, patientsApi, protocolsApi, inventoryApi } from '../services/api';
import { formatDate, getStatusColor, addDays, getTreatmentStatusColor } from '../constants';
import { Dose, DoseStatus, PaymentStatus, SurveyStatus, Treatment, TreatmentStatus, ProtocolCategory, PatientFull, Protocol, InventoryItem } from '../types';
import { ArrowLeft, Calendar, Plus, Save, Edit2, X, Activity, AlignLeft, MessageSquare, Edit, UserCheck, Star, Loader2, AlertTriangle, Package, Truck, CreditCard, Check, RefreshCw } from 'lucide-react';

const TreatmentDetail: React.FC = () => {
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
  const [editStatus, setEditStatus] = useState<TreatmentStatus>(TreatmentStatus.ONGOING);
  const [editStartDate, setEditStartDate] = useState('');
  const [editObservations, setEditObservations] = useState('');

  // Dose Form States
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [isSavingDose, setIsSavingDose] = useState(false);

  const [doseDate, setDoseDate] = useState(new Date().toISOString().split('T')[0]);
  const [doseLot, setDoseLot] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');

  const [dosePurchased, setDosePurchased] = useState<boolean>(true);
  const [doseDeliveryStatus, setDoseDeliveryStatus] = useState<'waiting' | 'delivered' | ''>('');

  const [doseStatus, setDoseStatus] = useState<DoseStatus | ''>('');
  const [dosePayment, setDosePayment] = useState<PaymentStatus | ''>('');

  const [doseIsLast, setDoseIsLast] = useState(false);
  const [doseConsultDate, setDoseConsultDate] = useState('');

  const [doseNurseSelection, setDoseNurseSelection] = useState('');
  const [doseSurveyStatus, setDoseSurveyStatus] = useState<SurveyStatus | ''>('');
  const [doseSurveyScore, setDoseSurveyScore] = useState(0);
  const [doseSurveyComment, setDoseSurveyComment] = useState('');

  // Load data from API
  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [treatmentRes, protocolsRes, inventoryRes] = await Promise.all([
        treatmentsApi.getById(id),
        protocolsApi.getAll(),
        inventoryApi.getAvailable()
      ]);

      const treatmentData = treatmentRes.data;
      setTreatment(treatmentData);
      setProtocols(protocolsRes.data || []);
      setInventory(inventoryRes.data || []);

      // Load patient and protocol details
      if (treatmentData) {
        const [patientRes, dosesRes] = await Promise.all([
          patientsApi.getById(treatmentData.patientId),
          dosesApi.getAll({ treatmentId: id })
        ]);

        setPatient(patientRes.data);
        setDoses((dosesRes.data || []).sort((a: Dose, b: Dose) =>
          new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()
        ));

        const proto = protocolsRes.data?.find((p: Protocol) => p.id === treatmentData.protocolId);
        setProtocol(proto || null);

        // Initialize edit states
        setEditProtocolId(treatmentData.protocolId);
        setEditPlannedDoses(treatmentData.plannedDosesBeforeConsult || 0);
        setEditNextConsult(treatmentData.nextConsultationDate || '');
        setEditStatus(treatmentData.status);
        setEditStartDate(treatmentData.startDate || '');
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

  // Available Inventory Lots for this Protocol
  const availableLots = useMemo(() => {
    if (!protocol || protocol.category !== ProtocolCategory.MEDICATION || !protocol.medicationType) return [];

    return inventory.filter(item =>
      item.medicationName === protocol.medicationType &&
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
    setDoseDate(dose.applicationDate.split('T')[0]);
    setDoseLot(dose.lotNumber || '');
    setSelectedInventoryId(dose.inventoryLotId || '');
    setDoseStatus(dose.status);
    setDosePayment(dose.paymentStatus === PaymentStatus.NOT_APPLICABLE ? '' : dose.paymentStatus);
    setDoseIsLast(dose.isLastBeforeConsult || false);
    setDoseConsultDate(dose.consultationDate ? dose.consultationDate.split('T')[0] : '');

    setDosePurchased(dose.purchased !== undefined ? dose.purchased : true);
    setDoseDeliveryStatus(dose.deliveryStatus || '');

    setDoseNurseSelection(dose.nurse ? 'yes' : 'no');
    setDoseSurveyStatus(dose.surveyStatus || '');
    setDoseSurveyScore(dose.surveyScore || 0);
    setDoseSurveyComment(dose.surveyComment || '');

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
    setDoseDate(new Date().toISOString().split('T')[0]);
    setDoseLot('');
    setSelectedInventoryId('');
    setDoseStatus('');
    setDosePayment('');
    setDoseDeliveryStatus('');
    setDosePurchased(true);
    setDoseIsLast(false);
    setDoseConsultDate('');
    setDoseNurseSelection('');
    setDoseSurveyStatus('');
    setDoseSurveyScore(0);
    setDoseSurveyComment('');
  };

  const handleOpenNewDose = () => {
    resetDoseForm();

    if (treatment) {
      const nextCycleNumber = doses.length + 1;
      if (nextCycleNumber === treatment.plannedDosesBeforeConsult) {
        setDoseIsLast(true);
      }
    }

    setShowDoseForm(true);
  };

  const handleSaveDose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !protocol) return;

    if (!doseStatus) { alert("Selecione o Status da Dose"); return; }
    if (dosePurchased && !dosePayment) { alert("Selecione a Situacao do Pagamento"); return; }
    if (!doseNurseSelection) { alert("Informe se houve acompanhamento da Enfermeira"); return; }

    if (protocol.category === ProtocolCategory.MEDICATION && dosePurchased && !selectedInventoryId && !editingDoseId) {
      alert("Para medicamento comprado, selecione um lote disponivel no estoque.");
      return;
    }

    setIsSavingDose(true);

    try {
      const isNurse = doseNurseSelection === 'yes';
      const finalSurveyStatus = !isNurse ? SurveyStatus.NOT_SENT : (doseSurveyStatus as SurveyStatus || SurveyStatus.NOT_SENT);

      const doseData = {
        treatmentId: id,
        applicationDate: new Date(doseDate).toISOString(),
        lotNumber: dosePurchased ? doseLot : '',
        inventoryLotId: dosePurchased ? selectedInventoryId : undefined,
        purchased: dosePurchased,
        deliveryStatus: dosePurchased ? (doseDeliveryStatus as any) : undefined,
        status: doseStatus,
        paymentStatus: dosePurchased ? (dosePayment as PaymentStatus) : PaymentStatus.NOT_APPLICABLE,
        isLastBeforeConsult: doseIsLast,
        consultationDate: doseIsLast ? (doseConsultDate ? new Date(doseConsultDate).toISOString() : undefined) : undefined,
        nurse: isNurse,
        surveyStatus: finalSurveyStatus,
        surveyScore: Number(doseSurveyScore),
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
      alert('Erro ao salvar dose: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingDose(false);
    }
  };

  const handleSaveTreatmentDetails = async () => {
    if (!id) return;

    setIsSavingTreatment(true);

    try {
      const updates = {
        protocolId: editProtocolId,
        plannedDosesBeforeConsult: Number(editPlannedDoses),
        nextConsultationDate: editNextConsult || undefined,
        status: editStatus,
        startDate: editStartDate,
        observations: editObservations,
      };

      await treatmentsApi.update(id, updates);
      await loadData();
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating treatment:', err);
      alert('Erro ao atualizar tratamento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingTreatment(false);
    }
  };

  const toggleEditMode = () => {
    if (!isEditing && treatment) {
      setEditProtocolId(treatment.protocolId);
      setEditPlannedDoses(treatment.plannedDosesBeforeConsult || 0);
      setEditNextConsult(treatment.nextConsultationDate || '');
      setEditStatus(treatment.status);
      setEditStartDate(treatment.startDate || '');
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
    return proto?.category === ProtocolCategory.MEDICATION;
  }, [editProtocolId, protocols]);

  const previewNextDate = protocol ? addDays(new Date(doseDate), protocol.frequencyDays || 30) : new Date();

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
              <h1 className="text-2xl font-bold text-slate-800">Gestao de Tratamento</h1>
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proxima Consulta (Indicada)</label>
                  <div className="flex items-center mt-1">
                    {treatment.nextConsultationDate ? (
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
                    {Object.values(TreatmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proxima Consulta (Indicada)</label>
                  <input
                    type="date"
                    value={editNextConsult}
                    onChange={e => setEditNextConsult(e.target.value)}
                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  />
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

      {/* Add/Edit Dose Form */}
      {showDoseForm && (
        <div id="dose-form-container" className="bg-slate-50 border border-slate-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-4 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center">
            {editingDoseId ? <Edit size={18} className="mr-2 text-pink-600" /> : <Plus size={18} className="mr-2 text-pink-600" />}
            {editingDoseId ? 'Editar Dose' : 'Nova Aplicacao'}
          </h3>
          <form onSubmit={handleSaveDose} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Compra de Medicamento?</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all ${dosePurchased ? 'bg-pink-50 border-pink-500 text-pink-700 ring-1 ring-pink-500' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="radio" name="purchased" checked={dosePurchased} onChange={() => setDosePurchased(true)} className="sr-only" />
                  Sim
                </label>
                <label className={`flex-1 flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all ${!dosePurchased ? 'bg-slate-100 border-slate-400 text-slate-800 ring-1 ring-slate-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="radio" name="purchased" checked={!dosePurchased} onChange={() => setDosePurchased(false)} className="sr-only" />
                  Nao
                </label>
              </div>
            </div>

            {protocol.category === ProtocolCategory.MEDICATION && dosePurchased ? (
              <div className="lg:col-span-2">
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
                        {item.lotNumber} - Val: {formatDate(item.expiryDate)} (Qtd: {item.quantity})
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
            ) : (
              <div className="lg:col-span-2 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm">
                Lote indisponivel (Sem compra)
              </div>
            )}

            <input type="hidden" value={doseLot} />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data da Aplicacao</label>
              <input
                type="date"
                required
                value={doseDate}
                onChange={(e) => setDoseDate(e.target.value)}
                className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status da Dose</label>
              <select
                required
                value={doseStatus}
                onChange={(e) => {
                  const newStatus = e.target.value as DoseStatus;
                  setDoseStatus(newStatus);
                  if (newStatus === DoseStatus.APPLIED) {
                    setDoseDate(new Date().toISOString().split('T')[0]);
                  }
                }}
                className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="" disabled>Selecione...</option>
                <option value={DoseStatus.PENDING}>Pendente</option>
                <option value={DoseStatus.APPLIED}>Aplicada</option>
              </select>
            </div>

            {dosePurchased && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Situacao Pagamento</label>
                  <select
                    required
                    value={dosePayment}
                    onChange={(e) => setDosePayment(e.target.value as PaymentStatus)}
                    className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="" disabled>Selecione...</option>
                    <option value={PaymentStatus.WAITING_PIX}>Aguardando PIX</option>
                    <option value={PaymentStatus.WAITING_BOLETO}>Aguardando Boleto</option>
                    <option value={PaymentStatus.WAITING_CARD}>Aguardando Cartao</option>
                    <option value={PaymentStatus.PAID}>PAGO</option>
                  </select>
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

            <div className="lg:col-span-4 flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center h-5">
                <input
                  id="isLast"
                  type="checkbox"
                  checked={doseIsLast}
                  onChange={(e) => setDoseIsLast(e.target.checked)}
                  className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
                />
                <label htmlFor="isLast" className="ml-2 text-sm font-medium text-slate-900">Esta e a ultima dose antes da consulta?</label>
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

            <div className="lg:col-span-4 border-t border-slate-100 pt-4">
              <h4 className="font-bold text-slate-700 mb-3 flex items-center">
                <UserCheck size={16} className="mr-2 text-pink-600" />
                Acompanhamento e Satisfacao
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-100/50 p-4 rounded-lg">
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
                    <option value="no">Nao</option>
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
                      {Object.values(SurveyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-end gap-2">
                    <div className={`flex-1 transition-opacity ${doseSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40 pointer-events-none' : ''}`}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">3. Nota</label>
                      <input
                        type="range" min="0" max="10" step="1"
                        value={doseSurveyScore}
                        onChange={e => setDoseSurveyScore(Number(e.target.value))}
                        className="w-full accent-pink-600"
                        disabled={doseSurveyStatus !== SurveyStatus.ANSWERED}
                      />
                    </div>
                    <span className={`w-10 h-10 flex items-center justify-center bg-white border border-slate-200 font-bold rounded-lg text-slate-700 mb-1 ${doseSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40' : ''}`}>
                      {doseSurveyScore}
                    </span>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">4. Comentario</label>
                    <input
                      type="text"
                      value={doseSurveyComment}
                      onChange={e => setDoseSurveyComment(e.target.value)}
                      placeholder="Observacao sobre o atendimento..."
                      className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowDoseForm(false);
                  resetDoseForm();
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingDose}
                className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingDose ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
                {editingDoseId ? (isSavingDose ? 'Atualizando...' : 'Atualizar Dose') : (isSavingDose ? 'Salvando...' : 'Salvar Nova Dose')}
              </button>
            </div>
          </form>
          <div className="mt-4 text-xs text-slate-500 flex items-center">
            <Activity size={14} className="mr-1" />
            Proxima aplicacao estimada em: <span className="font-bold ml-1">{formatDate(previewNextDate.toISOString())}</span>
          </div>
        </div>
      )}

      {/* Doses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data Aplicacao</th>
                <th className="px-6 py-4">Lote</th>
                <th className="px-6 py-4">Status Dose</th>
                <th className="px-6 py-4">Pagamento</th>
                <th className="px-6 py-4">Entrega</th>
                <th className="px-6 py-4 text-right">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doses.map((dose) => (
                <tr key={dose.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-4 font-medium text-slate-900">{formatDate(dose.applicationDate)}</td>
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
                      {dose.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {dose.paymentStatus === PaymentStatus.NOT_APPLICABLE ? (
                      <span className="text-slate-300">-</span>
                    ) : (
                      <span className={`inline-block px-2 py-1 rounded-md border ${getStatusColor(dose.paymentStatus)}`}>
                        {dose.paymentStatus}
                      </span>
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
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhuma dose registrada.</td>
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
