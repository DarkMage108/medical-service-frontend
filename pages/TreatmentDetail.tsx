
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { TreatmentService, DoseService, PatientService, ProtocolService, InventoryService } from '../services/mockData';
import { formatDate, getStatusColor, addDays, getTreatmentStatusColor } from '../constants';
import { Dose, DoseStatus, PaymentStatus, SurveyStatus, Treatment, TreatmentStatus, ProtocolCategory, InventoryItem, PatientFull, Protocol } from '../types';
import { ArrowLeft, Calendar, Plus, Save, Edit2, X, Activity, AlignLeft, UserCheck, Star, Loader2, AlertTriangle, Package, Edit } from 'lucide-react';

const TreatmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  // Data States
  const [treatment, setTreatment] = useState<Treatment | undefined>(undefined);
  const [patient, setPatient] = useState<PatientFull | undefined>(undefined);
  const [protocol, setProtocol] = useState<Protocol | undefined>(undefined);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]); // All protocols for editing list

  // UI States
  const [showDoseForm, setShowDoseForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingTreatment, setIsSavingTreatment] = useState(false);
  const [isSavingDose, setIsSavingDose] = useState(false);

  // Treatment Edit States
  const [editProtocolId, setEditProtocolId] = useState('');
  const [editPlannedDoses, setEditPlannedDoses] = useState(0);
  const [editNextConsult, setEditNextConsult] = useState('');
  const [editStatus, setEditStatus] = useState<TreatmentStatus>(TreatmentStatus.ONGOING);
  const [editStartDate, setEditStartDate] = useState('');
  const [editObservations, setEditObservations] = useState('');

  // Dose Form States
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [doseDate, setDoseDate] = useState(new Date().toISOString().split('T')[0]);
  const [doseLot, setDoseLot] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [doseStatus, setDoseStatus] = useState<DoseStatus | ''>('');
  const [dosePayment, setDosePayment] = useState<PaymentStatus | ''>('');
  const [doseIsLast, setDoseIsLast] = useState(false);
  const [doseConsultDate, setDoseConsultDate] = useState('');
  const [doseNurseSelection, setDoseNurseSelection] = useState('');
  const [doseSurveyStatus, setDoseSurveyStatus] = useState<SurveyStatus | ''>('');
  const [doseSurveyScore, setDoseSurveyScore] = useState(0);
  const [doseSurveyComment, setDoseSurveyComment] = useState('');

  useEffect(() => {
    const loadData = async () => {
        if(!id) return;
        setLoading(true);
        try {
            const t = await TreatmentService.getById(id);
            if (!t) return;
            setTreatment(t);

            const [p, proto, allDoses, inv, allProtos] = await Promise.all([
                PatientService.getById(t.patientId),
                (await ProtocolService.getAll()).find(pr => pr.id === t.protocolId),
                DoseService.getByTreatmentId(id),
                InventoryService.getAll(),
                ProtocolService.getAll()
            ]);
            
            setPatient(p);
            setProtocol(proto);
            setDoses(allDoses.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()));
            setInventory(inv);
            setProtocols(allProtos);

            // Init Edit Form
            setEditProtocolId(t.protocolId);
            setEditPlannedDoses(t.plannedDosesBeforeConsult);
            setEditNextConsult(t.nextConsultationDate || '');
            setEditStatus(t.status);
            setEditStartDate(t.startDate);
            setEditObservations(t.observations || '');

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [id]);

  // Check for auto-open edit dose from navigation state
  useEffect(() => {
    if (doses.length > 0 && location.state && (location.state as any).editDoseId) {
        const doseId = (location.state as any).editDoseId;
        const doseToEdit = doses.find(d => d.id === doseId);
        if (doseToEdit) {
            handleOpenEditDose(doseToEdit);
            window.history.replaceState({}, document.title);
        }
    }
  }, [doses, location]);

  const availableLots = useMemo(() => {
      if (!protocol || protocol.category !== ProtocolCategory.MEDICATION || !protocol.medicationType) return [];
      return inventory.filter(item => 
          item.medicationName === protocol.medicationType &&
          item.active &&
          item.quantity > 0 &&
          new Date(item.expiryDate) >= new Date()
      );
  }, [protocol, inventory]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-pink-600" size={32} /></div>;
  if (!treatment || !patient || !protocol) return <div>Tratamento ou protocolo não encontrado</div>;

  const handleOpenEditDose = (dose: Dose) => {
      setEditingDoseId(dose.id);
      setDoseDate(dose.applicationDate.split('T')[0]);
      setDoseLot(dose.lotNumber);
      setSelectedInventoryId(dose.inventoryLotId || '');
      setDoseStatus(dose.status);
      setDosePayment(dose.paymentStatus);
      setDoseIsLast(dose.isLastBeforeConsult);
      setDoseConsultDate(dose.consultationDate ? dose.consultationDate.split('T')[0] : '');
      setDoseNurseSelection(dose.nurse ? 'yes' : 'no');
      setDoseSurveyStatus(dose.surveyStatus || '');
      setDoseSurveyScore(dose.surveyScore || 0);
      setDoseSurveyComment(dose.surveyComment || '');
      setShowDoseForm(true);
      setTimeout(() => document.getElementById('dose-form-container')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleInventorySelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const invId = e.target.value;
      setSelectedInventoryId(invId);
      const lot = availableLots.find(l => l.id === invId);
      if (lot) setDoseLot(lot.lotNumber);
  };

  const resetDoseForm = () => {
      setEditingDoseId(null);
      setDoseDate(new Date().toISOString().split('T')[0]);
      setDoseLot('');
      setSelectedInventoryId('');
      setDoseStatus('');
      setDosePayment('');
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
    if (doseStatus !== DoseStatus.NOT_ACCEPTED && !dosePayment) { alert("Selecione a Situação do Pagamento"); return; }
    if (!doseNurseSelection) { alert("Informe se houve acompanhamento da Enfermeira"); return; }

    if (protocol.category === ProtocolCategory.MEDICATION && doseStatus === DoseStatus.APPLIED && !selectedInventoryId && !editingDoseId) {
        alert("Para registrar aplicação, selecione um lote disponível no estoque.");
        return;
    }

    setIsSavingDose(true);
    
    const isNurse = doseNurseSelection === 'yes';
    const finalSurveyStatus = !isNurse ? SurveyStatus.NOT_SENT : (doseSurveyStatus as SurveyStatus || SurveyStatus.NOT_SENT);
    
    const commonData = {
        applicationDate: new Date(doseDate).toISOString(),
        lotNumber: doseLot,
        inventoryLotId: selectedInventoryId,
        status: doseStatus as DoseStatus,
        paymentStatus: doseStatus === DoseStatus.NOT_ACCEPTED ? PaymentStatus.WAITING_PIX : (dosePayment as PaymentStatus),
        isLastBeforeConsult: doseIsLast,
        consultationDate: doseIsLast ? (doseConsultDate ? new Date(doseConsultDate).toISOString() : undefined) : undefined,
        nurse: isNurse,
        surveyStatus: finalSurveyStatus,
        surveyScore: Number(doseSurveyScore),
        surveyComment: doseSurveyComment
    };

    try {
        let updatedDose: Dose;
        if (editingDoseId) {
             updatedDose = await DoseService.update(editingDoseId, commonData, protocol.frequencyDays);
             setDoses(doses.map(d => d.id === editingDoseId ? updatedDose : d).sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()));
        } else {
             const newDose: Dose = {
                 id: `d_${Date.now()}`,
                 treatmentId: id,
                 cycleNumber: doses.length + 1,
                 expiryDate: addDays(new Date(), 365).toISOString(),
                 paymentUpdatedAt: new Date().toISOString(),
                 calculatedNextDate: addDays(new Date(doseDate), protocol.frequencyDays).toISOString(),
                 daysUntilNext: 0, // Recalculated by service if needed, logic here is simplistic
                 ...commonData
             } as Dose;
             // Service recalculates next date usually
             const created = await DoseService.create(newDose);
             // Re-fetch doses to ensure consistency or just append
             setDoses([created, ...doses].sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()));
        }
    } catch (e) {
        alert('Erro ao salvar dose');
    }

    setIsSavingDose(false);
    setShowDoseForm(false);
    resetDoseForm();
  };

  const handleSaveTreatmentDetails = async () => {
    if (!id) return;
    setIsSavingTreatment(true);
    
    const updates = {
        protocolId: editProtocolId,
        plannedDosesBeforeConsult: Number(editPlannedDoses),
        nextConsultationDate: editNextConsult || undefined,
        status: editStatus,
        startDate: editStartDate,
        observations: editObservations,
    };

    try {
        const updated = await TreatmentService.update(id, updates);
        setTreatment(updated);
        // If protocol changed, fetch new protocol details
        if(updated.protocolId !== protocol?.id) {
             const newProto = protocols.find(p => p.id === updated.protocolId);
             if(newProto) setProtocol(newProto);
        }
        setIsEditing(false);
    } catch(e) {
        alert('Erro ao atualizar tratamento');
    }
    setIsSavingTreatment(false);
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

  const previewNextDate = addDays(new Date(doseDate), protocol.frequencyDays);

  return (
    <div className="space-y-6 pb-20">
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700">Detalhes do Plano Terapêutico</h3>
            <button 
                onClick={() => setIsEditing(!isEditing)}
                disabled={isSavingTreatment}
                className={`flex items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isEditing ? 'bg-red-50 text-red-600' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
                {isEditing ? <><X size={16} className="mr-2" /> Cancelar Edição</> : <><Edit2 size={16} className="mr-2" /> Editar Dados</>}
            </button>
        </div>

        <div className="p-6">
            {!isEditing ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicamento / Protocolo</label>
                            <p className="font-semibold text-slate-800 mt-1">{protocol.medicationType || '-'}</p>
                            <p className="text-xs text-slate-500">{protocol.name}</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data Início</label>
                            <div className="flex items-center mt-1">
                                <span className="font-medium text-slate-800">{formatDate(treatment.startDate)}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doses Planejadas (Pré-Consulta)</label>
                            <div className="flex items-center mt-1">
                                <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-md font-bold">{treatment.plannedDosesBeforeConsult}</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Próxima Consulta (Indicada)</label>
                            <div className="flex items-center mt-1">
                                {treatment.nextConsultationDate ? (
                                    <span className="font-medium text-slate-800 flex items-center">
                                        <Calendar size={16} className="mr-2 text-slate-400" />
                                        {formatDate(treatment.nextConsultationDate)}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 italic">Não agendada</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-4">
                        <div>
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex items-center">
                                <AlignLeft size={14} className="mr-1"/> Observações
                             </label>
                             <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[40px]">
                                {treatment.observations || "Nenhuma observação registrada."}
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
                                className={`block w-full border-slate-300 rounded-lg font-medium focus:ring-pink-500 focus:border-pink-500`}
                             >
                                {Object.values(TreatmentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data de Início</label>
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
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Próxima Consulta (Indicada)</label>
                            <input 
                                type="date" 
                                value={editNextConsult}
                                onChange={e => setEditNextConsult(e.target.value)}
                                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                            />
                         </div>
                     </div>

                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Observações do Tratamento</label>
                        <textarea 
                            rows={2}
                            value={editObservations}
                            onChange={e => setEditObservations(e.target.value)}
                            className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                        />
                     </div>

                     <div className="md:col-span-2 pt-4 flex justify-end">
                        <button 
                            onClick={handleSaveTreatmentDetails}
                            disabled={isSavingTreatment}
                            className="flex items-center bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingTreatment ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Save size={18} className="mr-2" />}
                            {isSavingTreatment ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                     </div>
                </div>
            )}
        </div>
      </div>

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

      {showDoseForm && (
        <div id="dose-form-container" className="bg-slate-50 border border-slate-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-4 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                {editingDoseId ? <Edit size={18} className="mr-2 text-pink-600"/> : <Plus size={18} className="mr-2 text-pink-600"/>}
                {editingDoseId ? 'Editar Dose' : 'Nova Aplicação'}
            </h3>
            <form onSubmit={handleSaveDose} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data da Aplicação</label>
                    <input 
                        type="date" 
                        required
                        value={doseDate}
                        onChange={(e) => setDoseDate(e.target.value)}
                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" 
                    />
                </div>
                
                {protocol.category === ProtocolCategory.MEDICATION && (
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
                                <div className="text-red-500 text-xs flex items-center">
                                    <AlertTriangle size={14} className="mr-1"/> Sem estoque
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className={protocol.category === ProtocolCategory.MEDICATION ? "" : "lg:col-span-2"}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lote / Validade (Manual)</label>
                    <input 
                        type="text" 
                        placeholder="Ex: AB1234 - 12/2025"
                        value={doseLot}
                        onChange={(e) => setDoseLot(e.target.value)}
                        readOnly={!!selectedInventoryId}
                        className={`w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 ${selectedInventoryId ? 'bg-slate-50' : ''}`} 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status da Dose</label>
                    <select 
                        required
                        value={doseStatus}
                        onChange={(e) => setDoseStatus(e.target.value as DoseStatus)}
                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    >
                        <option value="" disabled>Selecione...</option>
                        {Object.values(DoseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Situação Pagamento</label>
                    <select 
                        required={doseStatus !== DoseStatus.NOT_ACCEPTED}
                        disabled={doseStatus === DoseStatus.NOT_ACCEPTED}
                        value={dosePayment}
                        onChange={(e) => setDosePayment(e.target.value as PaymentStatus)}
                        className={`w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 ${doseStatus === DoseStatus.NOT_ACCEPTED ? 'bg-slate-100 opacity-50' : ''}`}
                    >
                         <option value="" disabled>Selecione...</option>
                        {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="lg:col-span-4 flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
                    <div className="flex items-center h-5">
                         <input 
                            id="isLast" 
                            type="checkbox" 
                            checked={doseIsLast}
                            onChange={(e) => setDoseIsLast(e.target.checked)}
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

                <div className="lg:col-span-4 border-t border-slate-100 pt-4">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center">
                        <UserCheck size={16} className="mr-2 text-pink-600"/>
                        Acompanhamento e Satisfação
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
                        {isSavingDose ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Save size={18} className="mr-2" />}
                        {editingDoseId ? (isSavingDose ? 'Atualizando...' : 'Atualizar Dose') : (isSavingDose ? 'Salvando...' : 'Salvar Nova Dose')}
                     </button>
                </div>
            </form>
            <div className="mt-4 text-xs text-slate-500 flex items-center">
                <Activity size={14} className="mr-1"/>
                Próxima aplicação estimada em: <span className="font-bold ml-1">{formatDate(previewNextDate.toISOString())}</span>
            </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4">Data Aplicação</th>
                        <th className="px-6 py-4">Lote</th>
                        <th className="px-6 py-4">Próxima (Calc)</th>
                        <th className="px-6 py-4">Status Dose</th>
                        <th className="px-6 py-4">Pesquisa</th>
                        <th className="px-6 py-4">Pagamento</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {doses.map((dose) => (
                        <tr key={dose.id} className="hover:bg-slate-50 group">
                            <td className="px-6 py-4 font-medium">{formatDate(dose.applicationDate)}</td>
                            <td className="px-6 py-4">
                                <span className="font-mono text-slate-500">{dose.lotNumber}</span>
                                {dose.inventoryLotId && (
                                    <span className="ml-2 inline-flex items-center text-[10px] bg-green-50 text-green-700 px-1.5 rounded border border-green-100">
                                        <Package size={10} className="mr-1"/> Estoque
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4">{formatDate(dose.calculatedNextDate)}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(dose.status)}`}>
                                    {dose.status}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {dose.nurse ? (
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <UserCheck size={12} className="text-pink-600"/>
                                            <span className="text-xs font-bold text-pink-700">Sim</span>
                                        </div>
                                        {dose.surveyStatus === SurveyStatus.ANSWERED && (
                                            <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-0.5">
                                                <Star size={10} fill="currentColor" />
                                                {dose.surveyScore}
                                            </div>
                                        )}
                                        {dose.surveyStatus === SurveyStatus.SENT && (
                                            <span className="text-[10px] text-blue-600 font-medium">Enviado</span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-xs font-medium ${getStatusColor(dose.paymentStatus)}`}>
                                    {dose.paymentStatus}
                                </span>
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
