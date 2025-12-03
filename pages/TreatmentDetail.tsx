
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { MOCK_TREATMENTS, MOCK_DOSES, MOCK_PATIENTS, MOCK_PROTOCOLS, updateMockTreatment, addMockDose, updateMockDose } from '../services/mockData';
import { formatDate, getStatusColor, addDays, getTreatmentStatusColor } from '../constants';
import { Dose, DoseStatus, PaymentStatus, SurveyStatus, Treatment, TreatmentStatus, ProtocolCategory } from '../types';
import { ArrowLeft, Calendar, Plus, Save, Edit2, X, Activity, AlignLeft, MessageSquare, Edit, UserCheck, Star, Loader2 } from 'lucide-react';

const TreatmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [showDoseForm, setShowDoseForm] = useState(false);
  
  // Find Data Initial
  const initialTreatment = MOCK_TREATMENTS.find(t => t.id === id);
  const [treatment, setTreatment] = useState<Treatment | undefined>(initialTreatment);
  
  const patient = treatment ? MOCK_PATIENTS.find(p => p.id === treatment.patientId) : null;
  const protocol = treatment ? MOCK_PROTOCOLS.find(p => p.id === treatment.protocolId) : null;
  
  // --- Treatment Edit Mode States ---
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingTreatment, setIsSavingTreatment] = useState(false);
  
  const [editProtocolId, setEditProtocolId] = useState(treatment?.protocolId || '');
  const [editPlannedDoses, setEditPlannedDoses] = useState(treatment?.plannedDosesBeforeConsult || 0);
  const [editNextConsult, setEditNextConsult] = useState(treatment?.nextConsultationDate || '');
  const [editStatus, setEditStatus] = useState<TreatmentStatus>(treatment?.status || TreatmentStatus.ONGOING);
  const [editStartDate, setEditStartDate] = useState(treatment?.startDate || '');
  const [editObservations, setEditObservations] = useState(treatment?.observations || '');

  // --- Dose Form States ---
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [isSavingDose, setIsSavingDose] = useState(false);

  const [doseDate, setDoseDate] = useState(new Date().toISOString().split('T')[0]);
  const [doseLot, setDoseLot] = useState('');
  
  // States inicializados vazios para forçar seleção
  const [doseStatus, setDoseStatus] = useState<DoseStatus | ''>('');
  const [dosePayment, setDosePayment] = useState<PaymentStatus | ''>('');
  
  const [doseIsLast, setDoseIsLast] = useState(false);
  const [doseConsultDate, setDoseConsultDate] = useState('');
  
  // Dose specific: Nurse and Survey
  const [doseNurseSelection, setDoseNurseSelection] = useState(''); // "yes", "no", ""
  const [doseSurveyStatus, setDoseSurveyStatus] = useState<SurveyStatus | ''>('');
  const [doseSurveyScore, setDoseSurveyScore] = useState(0);
  const [doseSurveyComment, setDoseSurveyComment] = useState('');

  // Get Doses for this treatment
  const [doses, setDoses] = useState(
      MOCK_DOSES.filter(d => d.treatmentId === id).sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())
  );

  if (!treatment || !patient || !protocol) return <div>Tratamento ou protocolo não encontrado</div>;

  const handleOpenEditDose = (dose: Dose) => {
      setEditingDoseId(dose.id);
      setDoseDate(dose.applicationDate.split('T')[0]);
      setDoseLot(dose.lotNumber);
      setDoseStatus(dose.status);
      setDosePayment(dose.paymentStatus);
      setDoseIsLast(dose.isLastBeforeConsult);
      setDoseConsultDate(dose.consultationDate ? dose.consultationDate.split('T')[0] : '');
      
      setDoseNurseSelection(dose.nurse ? 'yes' : 'no');
      setDoseSurveyStatus(dose.surveyStatus || '');
      setDoseSurveyScore(dose.surveyScore || 0);
      setDoseSurveyComment(dose.surveyComment || '');

      setShowDoseForm(true);
      
      // Scroll to form
      setTimeout(() => {
          document.getElementById('dose-form-container')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  // Check for auto-open edit dose from navigation state
  useEffect(() => {
    if (location.state && (location.state as any).editDoseId) {
        const doseId = (location.state as any).editDoseId;
        const doseToEdit = doses.find(d => d.id === doseId);
        if (doseToEdit) {
            handleOpenEditDose(doseToEdit);
            // Clear history state to prevent reopening on reload (optional)
            window.history.replaceState({}, document.title);
        }
    }
  }, [location, doses]);

  const resetDoseForm = () => {
      setEditingDoseId(null);
      setDoseDate(new Date().toISOString().split('T')[0]);
      setDoseLot('');
      // Resetar para vazio para forçar seleção
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
      
      // Automação: Verificar se é a última dose planejada
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

    // Validações Manuais
    if (!doseStatus) { alert("Selecione o Status da Dose"); return; }
    if (!dosePayment) { alert("Selecione a Situação do Pagamento"); return; }
    if (!doseNurseSelection) { alert("Informe se houve acompanhamento da Enfermeira"); return; }

    setIsSavingDose(true);
    // Simula delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const isNurse = doseNurseSelection === 'yes';

    // Calcular próxima data (apenas visual aqui, o serviço recalcula oficialmente)
    const appDateObj = new Date(doseDate);
    const nextDateObj = addDays(appDateObj, protocol.frequencyDays);
    const diffTime = nextDateObj.getTime() - new Date().getTime();
    const daysNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Validar status da pesquisa se não tiver enfermeira
    const finalSurveyStatus = !isNurse ? SurveyStatus.NOT_SENT : (doseSurveyStatus as SurveyStatus || SurveyStatus.NOT_SENT);

    if (editingDoseId) {
        // UPDATE
        const updates: Partial<Dose> = {
            applicationDate: new Date(doseDate).toISOString(),
            lotNumber: doseLot,
            status: doseStatus,
            paymentStatus: dosePayment,
            isLastBeforeConsult: doseIsLast,
            consultationDate: doseIsLast ? (doseConsultDate ? new Date(doseConsultDate).toISOString() : undefined) : undefined,
            nurse: isNurse,
            surveyStatus: finalSurveyStatus,
            surveyScore: Number(doseSurveyScore),
            surveyComment: doseSurveyComment
        };
        
        const updatedList = updateMockDose(editingDoseId, updates, protocol.frequencyDays);
        if (updatedList) {
            setDoses(updatedList.filter(d => d.treatmentId === id).sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()));
        }

    } else {
        // CREATE
        const newDose: Dose = {
            id: `d_${Date.now()}`,
            treatmentId: id,
            cycleNumber: doses.length + 1, // Simples incremento
            applicationDate: new Date(doseDate).toISOString(),
            lotNumber: doseLot,
            expiryDate: addDays(new Date(), 365).toISOString(), // Mock validade 1 ano
            status: doseStatus,
            paymentStatus: dosePayment,
            paymentUpdatedAt: new Date().toISOString(),
            isLastBeforeConsult: doseIsLast,
            consultationDate: doseIsLast && doseConsultDate ? new Date(doseConsultDate).toISOString() : undefined,
            calculatedNextDate: nextDateObj.toISOString(),
            daysUntilNext: daysNext,
            nurse: isNurse,
            surveyStatus: finalSurveyStatus,
            surveyScore: Number(doseSurveyScore),
            surveyComment: doseSurveyComment
        };
        
        const updatedList = addMockDose(newDose);
        setDoses(updatedList.filter(d => d.treatmentId === id).sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime()));
    }

    setIsSavingDose(false);
    setShowDoseForm(false);
    resetDoseForm();
  };

  const handleSaveTreatmentDetails = async () => {
    if (!id) return;
    
    setIsSavingTreatment(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const updates: Partial<Treatment> = {
        protocolId: editProtocolId,
        plannedDosesBeforeConsult: Number(editPlannedDoses),
        nextConsultationDate: editNextConsult || undefined,
        status: editStatus,
        startDate: editStartDate,
        observations: editObservations,
    };

    const updated = updateMockTreatment(id, updates);
    if (updated) {
        setTreatment(updated);
        setIsEditing(false);
    }
    setIsSavingTreatment(false);
  };

  const toggleEditMode = () => {
    if (!isEditing) {
        // Init edit values
        setEditProtocolId(treatment.protocolId);
        setEditPlannedDoses(treatment.plannedDosesBeforeConsult);
        setEditNextConsult(treatment.nextConsultationDate || '');
        setEditStatus(treatment.status);
        setEditStartDate(treatment.startDate);
        setEditObservations(treatment.observations || '');
    }
    setIsEditing(!isEditing);
  };

  const handleEditProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const pid = e.target.value;
      setEditProtocolId(pid);
      
      const proto = MOCK_PROTOCOLS.find(p => p.id === pid);
      if (proto && proto.category === ProtocolCategory.MONITORING) {
          setEditPlannedDoses(0);
      }
  };

  const isEditMedicationProtocol = useMemo(() => {
      const proto = MOCK_PROTOCOLS.find(p => p.id === editProtocolId);
      return proto?.category === ProtocolCategory.MEDICATION;
  }, [editProtocolId]);

  // Calculate info for the new dose preview
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

      {/* Protocol Summary / Edit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700">Detalhes do Plano Terapêutico</h3>
            <button 
                onClick={toggleEditMode}
                disabled={isSavingTreatment}
                className={`flex items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${isEditing ? 'bg-red-50 text-red-600' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
            >
                {isEditing ? (
                    <>
                       <X size={16} className="mr-2" />
                       Cancelar Edição
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
                /* VIEW MODE */
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medicamento / Protocolo</label>
                            <p className="font-semibold text-slate-800 mt-1">{protocol.medicationType}</p>
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
                /* EDIT MODE */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                     <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Protocolo (Medicamento)</label>
                            <select 
                                value={editProtocolId}
                                onChange={handleEditProtocolChange}
                                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                            >
                                {MOCK_PROTOCOLS.map(p => (
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
                            {!isEditMedicationProtocol && (
                                <span className="text-xs text-slate-500">Não aplicável a protocolos de monitoramento.</span>
                            )}
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
                            placeholder="Anotações gerais..."
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

      {/* Add/Edit Dose Form (Collapsible) */}
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
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lote / Validade</label>
                    <input 
                        type="text" 
                        placeholder="Ex: AB1234 - 12/2025"
                        value={doseLot}
                        onChange={(e) => setDoseLot(e.target.value)}
                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" 
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
                        required
                        value={dosePayment}
                        onChange={(e) => setDosePayment(e.target.value as PaymentStatus)}
                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
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
                                // required removed here
                                value={doseConsultDate}
                                onChange={e => setDoseConsultDate(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                placeholder="Data Agendada da Consulta (Opcional)"
                            />
                        </div>
                    )}
                </div>

                {/* Seção Enfermeira e Pesquisa */}
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
                        
                        {/* Campos da Pesquisa (Condicionais) */}
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

      {/* Doses Table */}
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
                            <td className="px-6 py-4 font-mono text-slate-500">{dose.lotNumber}</td>
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
