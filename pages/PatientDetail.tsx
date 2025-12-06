
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_PATIENTS, MOCK_TREATMENTS, MOCK_PROTOCOLS, getPatientDocuments, addMockDocument, addMockTreatment, updateMockPatient, MOCK_DOSES } from '../services/mockData';
import { formatDate, getTreatmentStatusColor } from '../constants';
import { User, MapPin, FileText, Activity, ArrowRight, UploadCloud, X, File, Download, Trash2, CheckCircle2, Pill, Edit, AlertCircle, Loader2, Syringe, Save } from 'lucide-react';
import { ConsentDocument, Treatment, SurveyStatus, TreatmentStatus, DoseStatus, ProtocolCategory } from '../types';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  
  // Treatment Modal State
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [newProtocolId, setNewProtocolId] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedDoses, setPlannedDoses] = useState(3);
  const [isSavingTreatment, setIsSavingTreatment] = useState(false);
  
  // Edit Patient Modal State
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  
  // Document Upload State
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Load data
  const initialPatient = MOCK_PATIENTS.find(p => p.id === id);
  const [patient, setPatient] = useState(initialPatient);
  // We use local state for treatments to allow immediate UI update after creation
  const [treatments, setTreatments] = useState(MOCK_TREATMENTS.filter(t => t.patientId === id));
  
  // Documents State
  const [documents, setDocuments] = useState<ConsentDocument[]>(id ? getPatientDocuments(id) : []);

  // Form states for Patient Edit
  const [editName, setEditName] = useState('');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editClinicalNotes, setEditClinicalNotes] = useState('');
  
  // Address Edit fields
  const [editStreet, setEditStreet] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editState, setEditState] = useState('');
  const [editZipCode, setEditZipCode] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  if (!patient) return <div className="p-8 text-center">Paciente não encontrado.</div>;

  const getProtocolName = (pid: string) => {
    return MOCK_PROTOCOLS.find(p => p.id === pid)?.name || 'Protocolo Desconhecido';
  };

  const handleOpenEditPatient = () => {
      setEditName(patient.fullName);
      setEditGuardianName(patient.guardian.fullName);
      setEditPhone(patient.guardian.phonePrimary);
      setEditClinicalNotes(patient.clinicalNotes || '');
      
      setEditStreet(patient.address?.street || '');
      setEditNumber(patient.address?.number || '');
      setEditCity(patient.address?.city || '');
      setEditNeighborhood(patient.address?.neighborhood || '');
      setEditState(patient.address?.state || '');
      setEditZipCode(patient.address?.zipCode || '');
      
      setIsEditPatientOpen(true);
  };

  const handleEditZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setEditZipCode(e.target.value); 

    if (value.length === 8) {
        setIsLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
            const data = await response.json();
            
            if (!data.erro) {
                setEditStreet(data.logradouro);
                setEditNeighborhood(data.bairro);
                setEditCity(data.localidade);
                setEditState(data.uf);
                document.getElementById('edit_addr_number')?.focus();
            }
        } catch (error) {
            console.error("Erro ao buscar CEP", error);
        } finally {
            setIsLoadingCep(false);
        }
    }
  };

  const handleSavePatientEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingPatient(true);
      
      // Simula delay de API
      await new Promise(resolve => setTimeout(resolve, 800));

      const updates = {
          fullName: editName,
          clinicalNotes: editClinicalNotes,
          guardian: {
              ...patient.guardian,
              fullName: editGuardianName,
              phonePrimary: editPhone
          },
          address: (patient.address || editStreet) ? {
              id: patient.address?.id || `addr_${patient.id}`,
              patientId: patient.id,
              street: editStreet,
              number: editNumber,
              city: editCity,
              neighborhood: editNeighborhood,
              state: editState,
              zipCode: editZipCode
          } : undefined 
      };
      
      const updated = updateMockPatient(patient.id, updates);
      if (updated) {
          setPatient(updated);
          setIsEditPatientOpen(false);
      }
      setIsSavingPatient(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (file && id) {
        // 1. Validation: File Size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setUploadError(`O arquivo é muito grande (${(file.size / (1024*1024)).toFixed(2)}MB). O limite máximo é de ${MAX_FILE_SIZE_MB}MB.`);
            e.target.value = ''; // Reset input
            return;
        }

        // 2. Validation: File Type
        const allowedTypes = [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Formato de arquivo inválido. Por favor, envie apenas arquivos PDF ou Word (.doc, .docx).');
            e.target.value = ''; // Reset input
            return;
        }

        // Simulate Upload Process
        setIsUploading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newDoc: ConsentDocument = {
            id: `doc_${Date.now()}`,
            patientId: id,
            fileName: file.name,
            fileType: file.name.endsWith('.pdf') ? 'pdf' : 'docx',
            uploadDate: new Date().toISOString(),
            uploadedBy: 'Admin (Você)',
            url: URL.createObjectURL(file) // Create a fake local URL
        };

        addMockDocument(newDoc);
        setDocuments([newDoc, ...documents]);
        
        setIsUploading(false);
        // Clear input
        e.target.value = '';
    }
  };

  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const pid = e.target.value;
      setNewProtocolId(pid);
      
      const proto = MOCK_PROTOCOLS.find(p => p.id === pid);
      if (proto) {
          if (proto.category === ProtocolCategory.MONITORING) {
              setPlannedDoses(0);
          } else {
              setPlannedDoses(3); // Default reset
          }
      }
  };

  // Helper to check selected protocol type
  const isMedicationProtocol = useMemo(() => {
      const proto = MOCK_PROTOCOLS.find(p => p.id === newProtocolId);
      return proto?.category === ProtocolCategory.MEDICATION;
  }, [newProtocolId]);

  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newProtocolId) return;
    
    setIsSavingTreatment(true);
    // Simula delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newTreatment: Treatment = {
        id: `t_${Date.now()}`,
        patientId: id,
        protocolId: newProtocolId,
        status: TreatmentStatus.ONGOING,
        startDate: newStartDate,
        plannedDosesBeforeConsult: Number(plannedDoses),
    };

    const updatedList = addMockTreatment(newTreatment);
    
    // Atualiza estado local de tratamentos
    setTreatments(updatedList.filter(t => t.patientId === id));
    
    // Recarrega o paciente para atualizar o status (Ativo/Inativo) que pode ter mudado
    const updatedPatient = MOCK_PATIENTS.find(p => p.id === id);
    if(updatedPatient) setPatient(updatedPatient);

    setIsSavingTreatment(false);
    setIsTreatmentModalOpen(false);
    
    // Reset Form
    setNewProtocolId('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Link to="/pacientes" className="hover:text-pink-600">Pacientes</Link>
                <span>/</span>
                <span>Detalhes</span>
            </div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-800">{patient.fullName}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${patient.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {patient.active ? 'Ativo' : 'Inativo'}
                </span>
                <button 
                    onClick={handleOpenEditPatient}
                    className="text-slate-400 hover:text-pink-600 transition-colors"
                    title="Editar Dados do Paciente"
                >
                    <Edit size={18} />
                </button>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => {
                    setUploadError(null);
                    setIsDocsModalOpen(true);
                }}
                className="flex items-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
                <UploadCloud size={18} className="mr-2 text-pink-600" />
                Termos de Consentimento
                {documents.length > 0 && (
                    <span className="ml-2 bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {documents.length}
                    </span>
                )}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                    <User size={18} className="mr-2 text-pink-500" />
                    Dados Pessoais
                </h3>
                <div className="space-y-3 text-sm">
                    <div>
                        <span className="text-slate-500 block">Nascimento</span>
                        <span className="font-medium text-slate-800">{formatDate(patient.birthDate)}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Sexo</span>
                        <span className="font-medium text-slate-800">{patient.gender === 'F' ? 'Feminino' : 'Masculino'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Responsável</span>
                        <div className="font-medium text-slate-800">{patient.guardian.fullName}</div>
                        <div className="text-slate-600">{patient.guardian.relationship}</div>
                        <div className="text-pink-600 mt-1">{patient.guardian.phonePrimary}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                    <MapPin size={18} className="mr-2 text-pink-500" />
                    Endereço
                </h3>
                {patient.address ? (
                    <div className="text-sm text-slate-600 space-y-1">
                        <p>{patient.address.street}, {patient.address.number}</p>
                        <p>{patient.address.neighborhood}</p>
                        <p>{patient.address.city} - {patient.address.state}</p>
                        <p>{patient.address.zipCode}</p>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 italic">Endereço não cadastrado.</p>
                )}
            </div>
        </div>

        {/* Treatments Column */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-slate-800 flex items-center">
                        <Activity size={18} className="mr-2 text-pink-500" />
                        Tratamentos Ativos
                    </h3>
                    <button 
                        onClick={() => setIsTreatmentModalOpen(true)}
                        className="text-sm text-pink-600 font-medium hover:underline flex items-center"
                    >
                        <Pill size={16} className="mr-1" />
                        Novo Tratamento
                    </button>
                </div>
                
                <div className="space-y-4">
                    {treatments.map(treatment => {
                        const appliedDoses = MOCK_DOSES.filter(d => d.treatmentId === treatment.id && d.status === DoseStatus.APPLIED).length;
                        return (
                        <div key={treatment.id} className="border border-slate-100 rounded-lg p-4 hover:border-pink-200 hover:shadow-md transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800">{getProtocolName(treatment.protocolId)}</h4>
                                    <p className="text-sm text-slate-500 mt-1">Início: {formatDate(treatment.startDate)}</p>
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold border ${getTreatmentStatusColor(treatment.status)}`}>
                                            {treatment.status}
                                        </span>
                                        
                                        {/* Status de Doses - Apenas se > 0 */}
                                        {treatment.plannedDosesBeforeConsult > 0 && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold flex items-center">
                                                <Syringe size={12} className="mr-1" />
                                                Doses: {appliedDoses}/{treatment.plannedDosesBeforeConsult}
                                            </span>
                                        )}

                                        {treatment.nextConsultationDate && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                                Próx. Consulta: {formatDate(treatment.nextConsultationDate)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Link 
                                    to={`/tratamento/${treatment.id}`} 
                                    className="flex items-center text-sm font-medium text-pink-600 hover:text-pink-800"
                                >
                                    Gerenciar
                                    <ArrowRight size={16} className="ml-1" />
                                </Link>
                            </div>
                        </div>
                    )})}
                    {treatments.length === 0 && (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500">
                            Nenhum tratamento ativo iniciado.
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
                    <FileText size={18} className="mr-2 text-pink-500" />
                    Observações Clínicas
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                    {patient.clinicalNotes || "Nenhuma observação registrada."}
                </p>
            </div>
        </div>
      </div>

      {/* Modal Termos de Consentimento */}
      {isDocsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                         <h3 className="font-bold text-lg text-slate-800">Termos de Consentimento</h3>
                         <p className="text-xs text-slate-500">Gerencie os documentos assinados deste paciente.</p>
                    </div>
                    <button onClick={() => setIsDocsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Error Message */}
                    {uploadError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                            {uploadError}
                        </div>
                    )}

                    {/* Upload Area */}
                    <div className="mb-8 relative">
                         {isUploading && (
                             <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 rounded-xl">
                                 <Loader2 size={32} className="text-pink-600 animate-spin mb-2" />
                                 <p className="text-sm font-semibold text-slate-600">Enviando arquivo...</p>
                             </div>
                         )}
                        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 transition-all group ${uploadError ? 'border-red-300 bg-red-50/30' : 'border-slate-300 hover:bg-pink-50 hover:border-pink-300'}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className={`w-8 h-8 mb-3 ${uploadError ? 'text-red-400' : 'text-slate-400 group-hover:text-pink-500'}`} />
                                <p className="mb-1 text-sm text-slate-500"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                                <p className="text-xs text-slate-400">PDF ou Word (Máx. {MAX_FILE_SIZE_MB}MB)</p>
                            </div>
                            <input 
                                type="file" 
                                className="hidden" 
                                disabled={isUploading}
                                accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={handleFileUpload}
                            />
                        </label>
                    </div>

                    {/* List */}
                    <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                            Documentos Arquivados 
                            <span className="ml-2 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{documents.length}</span>
                        </h4>
                        <div className="space-y-3">
                            {documents.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    Nenhum documento anexado ainda.
                                </div>
                            ) : (
                                documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex items-center overflow-hidden">
                                            <div className="p-2 bg-pink-50 rounded-lg mr-3 flex-shrink-0">
                                                <File size={20} className="text-pink-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                                    <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{doc.uploadedBy}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <a 
                                                href={doc.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Baixar"
                                            >
                                                <Download size={18} />
                                            </a>
                                            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir (Demo)">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Modal NOVO TRATAMENTO */}
      {isTreatmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Iniciar Novo Tratamento</h3>
                    <button onClick={() => setIsTreatmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSaveTreatment} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Protocolo / Diagnóstico</label>
                        <select 
                            required
                            value={newProtocolId}
                            onChange={handleProtocolChange}
                            className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                        >
                            <option value="" disabled>Selecione o protocolo...</option>
                            {MOCK_PROTOCOLS.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.frequencyDays} dias)</option>
                            ))}
                        </select>
                         <p className="text-xs text-slate-500 mt-1">Configure novos em "Protocolos" no menu.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data de Início</label>
                            <input 
                                type="date" 
                                required
                                value={newStartDate}
                                onChange={e => setNewStartDate(e.target.value)}
                                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                            />
                        </div>
                        <div className={!isMedicationProtocol && newProtocolId ? "opacity-50" : ""}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Doses por Ciclo (Consulta)</label>
                            <input 
                                type="number" 
                                min="0"
                                max="12"
                                required
                                disabled={!isMedicationProtocol && newProtocolId !== ''}
                                value={plannedDoses}
                                onChange={e => setPlannedDoses(Number(e.target.value))}
                                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                            />
                             <span className="text-xs text-slate-500">
                                 {(!isMedicationProtocol && newProtocolId) ? "Não aplicável para este protocolo." : "Geralmente 1, 2 ou 3."}
                             </span>
                        </div>
                    </div>
                    
                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isSavingTreatment}
                            className="w-full flex items-center justify-center px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium shadow-lg shadow-pink-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingTreatment ? <Loader2 size={18} className="mr-2 animate-spin" /> : <CheckCircle2 size={18} className="mr-2" />}
                            {isSavingTreatment ? 'Criando...' : 'Criar Tratamento'}
                        </button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* Modal EDITAR PACIENTE */}
      {isEditPatientOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Editar Dados do Paciente</h3>
                    <button onClick={() => setIsEditPatientOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSavePatientEdit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full border-slate-300 rounded-lg" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Responsável</label>
                        <input type="text" value={editGuardianName} onChange={e => setEditGuardianName(e.target.value)} className="w-full border-slate-300 rounded-lg" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone de Contato</label>
                        <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full border-slate-300 rounded-lg" required />
                    </div>
                    
                    {/* Endereço Completo com Busca de CEP */}
                    <div className="border-t border-slate-100 pt-4 mt-2">
                         <h4 className="text-sm font-bold text-pink-600 mb-2">Endereço</h4>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2 relative">
                                <label className="block text-xs font-medium text-slate-500 mb-1">CEP</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={editZipCode} 
                                        onChange={handleEditZipCodeChange} 
                                        className="w-full border-slate-300 rounded-lg" 
                                        maxLength={9}
                                        placeholder="00000-000"
                                    />
                                    {isLoadingCep && (
                                        <div className="absolute right-2 top-2.5">
                                            <Loader2 size={16} className="animate-spin text-pink-600"/>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Rua / Logradouro</label>
                                <input type="text" value={editStreet} onChange={e => setEditStreet(e.target.value)} className="w-full border-slate-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Número</label>
                                <input id="edit_addr_number" type="text" value={editNumber} onChange={e => setEditNumber(e.target.value)} className="w-full border-slate-300 rounded-lg" />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Bairro</label>
                                <input type="text" value={editNeighborhood} onChange={e => setEditNeighborhood(e.target.value)} className="w-full border-slate-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Cidade</label>
                                <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} className="w-full border-slate-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                                <input type="text" value={editState} onChange={e => setEditState(e.target.value)} className="w-full border-slate-300 rounded-lg" maxLength={2} />
                            </div>
                         </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Observações Clínicas</label>
                        <textarea value={editClinicalNotes} onChange={e => setEditClinicalNotes(e.target.value)} rows={3} className="w-full border-slate-300 rounded-lg" />
                    </div>
                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isSavingPatient}
                            className="w-full flex items-center justify-center bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingPatient ? <Loader2 size={18} className="mr-2 animate-spin" /> : null}
                            {isSavingPatient ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
             </div>
          </div>
      )}
    </div>
  );
};

export default PatientDetail;
