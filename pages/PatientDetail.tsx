
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientsApi, treatmentsApi, protocolsApi, dosesApi, dismissedLogsApi } from '../services/api';
import { formatDate, getTreatmentStatusColor, addDays, diffInDays } from '../constants';
import { User, MapPin, FileText, Activity, ArrowRight, UploadCloud, X, File, Download, Trash2, CheckCircle2, Pill, Edit, AlertCircle, Loader2, Syringe, Save, MessageCircle, Clock, RefreshCw, History, Plus, Edit2 } from 'lucide-react';
import { ConsentDocument, Treatment, SurveyStatus, TreatmentStatus, DoseStatus, ProtocolCategory, PatientFull, Protocol, Dose } from '../types';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  // Data states
  const [patient, setPatient] = useState<PatientFull | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [dismissedLogs, setDismissedLogs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<ConsentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Event Observation State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventObservation, setEventObservation] = useState('');
  const [isSavingObservation, setIsSavingObservation] = useState(false);

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

  // Load data from API
  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [patientRes, treatmentsRes, protocolsRes, dosesRes, dismissedRes, docsRes] = await Promise.all([
        patientsApi.getById(id),
        treatmentsApi.getAll({ patientId: id }),
        protocolsApi.getAll(),
        dosesApi.getAll({ limit: 500 }),
        dismissedLogsApi.getAll(),
        patientsApi.getDocuments(id)
      ]);

      // getById returns the patient object directly, not wrapped in { data: ... }
      setPatient(patientRes);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setDoses(dosesRes.data || []);
      setDismissedLogs(dismissedRes.data || []);
      setDocuments(docsRes.data || []);
    } catch (err: any) {
      console.error('Error loading patient:', err);
      setError(err.message || 'Erro ao carregar paciente');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Timeline Events Logic
  const timelineEvents = useMemo(() => {
    if (!patient) return [];
    const events: any[] = [];
    const TODAY = new Date();
    const activeTreatments = treatments.filter(t => t.status === TreatmentStatus.ONGOING);

    activeTreatments.forEach(t => {
      const proto = protocols.find(p => p.id === t.protocolId);
      if (!proto) return;

      if (proto.category === ProtocolCategory.MEDICATION || proto.category === 'MEDICATION') {
        const treatmentDoses = doses.filter(d => d.treatmentId === t.id);

        const pendingDoses = treatmentDoses.filter(d => d.status === DoseStatus.PENDING);
        pendingDoses.forEach(d => {
          events.push({
            id: d.id,
            date: new Date(d.applicationDate),
            type: 'dose',
            title: `Dose ${d.cycleNumber}`,
            subtitle: proto.medicationType,
            status: diffInDays(new Date(d.applicationDate), TODAY) < 0 ? 'late' : 'pending',
            treatmentId: t.id
          });
        });

        if (pendingDoses.length === 0) {
          const lastDose = treatmentDoses
            .filter(d => d.status === DoseStatus.APPLIED)
            .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())[0];

          let nextDate: Date;
          let nextCycle = 1;

          if (lastDose) {
            nextDate = addDays(new Date(lastDose.applicationDate), proto.frequencyDays || 30);
            nextCycle = lastDose.cycleNumber + 1;
          } else {
            nextDate = new Date(t.startDate);
          }

          if (diffInDays(nextDate, TODAY) > -60) {
            events.push({
              id: `proj_${t.id}`,
              date: nextDate,
              type: 'dose',
              title: `Dose ${nextCycle} (Prevista)`,
              subtitle: proto.medicationType,
              status: diffInDays(nextDate, TODAY) < 0 ? 'late' : 'projected',
              treatmentId: t.id
            });
          }
        }
      }

      if (proto.milestones) {
        proto.milestones.forEach((m: any) => {
          const contactDate = addDays(new Date(t.startDate), m.day);
          const contactId = `${t.id}_m_${m.day}`;

          const isDone = dismissedLogs.some(log => log.contactId === contactId);

          if (!isDone) {
            const diff = diffInDays(contactDate, TODAY);
            if (diff > -10 && diff < 90) {
              events.push({
                id: contactId,
                date: contactDate,
                type: 'message',
                title: `Contato dia ${m.day}`,
                subtitle: m.message,
                status: diff < 0 ? 'late' : 'pending',
                treatmentId: t.id
              });
            }
          }
        });
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [treatments, patient, protocols, doses, dismissedLogs]);

  // Past/Completed Events Logic
  const completedEvents = useMemo(() => {
    if (!patient) return [];
    const events: any[] = [];

    treatments.forEach(t => {
      const proto = protocols.find(p => p.id === t.protocolId);
      if (!proto) return;

      // Applied doses
      const treatmentDoses = doses.filter(d => d.treatmentId === t.id);
      const appliedDoses = treatmentDoses.filter(d => d.status === DoseStatus.APPLIED || d.status === DoseStatus.NOT_ACCEPTED);

      appliedDoses.forEach(d => {
        events.push({
          id: d.id,
          date: new Date(d.applicationDate),
          type: 'dose',
          title: `Dose ${d.cycleNumber}`,
          subtitle: proto.medicationType || proto.name,
          status: d.status === DoseStatus.APPLIED ? 'applied' : 'not_accepted',
          treatmentId: t.id,
          observation: d.surveyComment || '',
          doseId: d.id
        });
      });

      // Completed milestones/contacts
      if (proto.milestones) {
        proto.milestones.forEach((m: any) => {
          const contactId = `${t.id}_m_${m.day}`;
          const dismissedLog = dismissedLogs.find(log => log.contactId === contactId);

          if (dismissedLog) {
            const contactDate = addDays(new Date(t.startDate), m.day);
            events.push({
              id: contactId,
              date: contactDate,
              type: 'message',
              title: `Contato dia ${m.day}`,
              subtitle: m.message,
              status: 'completed',
              treatmentId: t.id,
              observation: dismissedLog.feedback?.text || '',
              dismissedAt: dismissedLog.dismissedAt
            });
          }
        });
      }
    });

    // Sort by date descending (most recent first)
    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [treatments, patient, protocols, doses, dismissedLogs]);

  const getProtocolName = (pid: string) => {
    return protocols.find(p => p.id === pid)?.name || 'Protocolo Desconhecido';
  };

  const handleSaveEventObservation = async (eventId: string, doseId?: string) => {
    if (!eventObservation.trim()) {
      setEditingEventId(null);
      return;
    }

    setIsSavingObservation(true);
    try {
      if (doseId) {
        // Update dose surveyComment
        await dosesApi.update(doseId, { surveyComment: eventObservation });
      }
      await loadData();
      setEditingEventId(null);
      setEventObservation('');
    } catch (err: any) {
      console.error('Error saving observation:', err);
      alert('Erro ao salvar observacao: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingObservation(false);
    }
  };

  const handleOpenEditObservation = (eventId: string, currentObservation: string) => {
    setEditingEventId(eventId);
    setEventObservation(currentObservation);
  };

  const handleOpenEditPatient = () => {
    if (!patient) return;
    setEditName(patient.fullName);
    setEditGuardianName(patient.guardian?.fullName || '');
    setEditPhone(patient.guardian?.phonePrimary || '');
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
    if (!patient || !id) return;

    setIsSavingPatient(true);

    try {
      // Update patient basic info
      await patientsApi.update(id, {
        fullName: editName,
        clinicalNotes: editClinicalNotes
      });

      // Update guardian
      await patientsApi.updateGuardian(id, {
        fullName: editGuardianName,
        phonePrimary: editPhone
      });

      // Update address if provided
      if (editStreet) {
        await patientsApi.upsertAddress(id, {
          street: editStreet,
          number: editNumber,
          city: editCity,
          neighborhood: editNeighborhood,
          state: editState,
          zipCode: editZipCode
        });
      }

      await loadData();
      setIsEditPatientOpen(false);
    } catch (err: any) {
      console.error('Error updating patient:', err);
      alert('Erro ao atualizar paciente: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingPatient(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (file && id) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`O arquivo e muito grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). O limite maximo e de ${MAX_FILE_SIZE_MB}MB.`);
        e.target.value = '';
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        setUploadError('Formato de arquivo invalido. Por favor, envie apenas arquivos PDF ou Word (.doc, .docx).');
        e.target.value = '';
        return;
      }

      setIsUploading(true);

      try {
        await patientsApi.uploadDocument(id, {
          fileName: file.name,
          fileType: file.name.endsWith('.pdf') ? 'pdf' : 'docx',
          fileUrl: `/uploads/${id}/${file.name}`
        });

        await loadData();
      } catch (err: any) {
        console.error('Error uploading document:', err);
        setUploadError('Erro ao enviar documento: ' + (err.message || 'Erro desconhecido'));
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await patientsApi.deleteDocument(docId);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert('Erro ao excluir documento: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleProtocolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setNewProtocolId(pid);

    const proto = protocols.find(p => p.id === pid);
    if (proto) {
      if (proto.category === ProtocolCategory.MONITORING || proto.category === 'MONITORING') {
        setPlannedDoses(0);
      } else {
        setPlannedDoses(3);
      }
    }
  };

  const isMedicationProtocol = useMemo(() => {
    const proto = protocols.find(p => p.id === newProtocolId);
    return proto?.category === ProtocolCategory.MEDICATION || proto?.category === 'MEDICATION';
  }, [newProtocolId, protocols]);

  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newProtocolId) return;

    setIsSavingTreatment(true);

    try {
      await treatmentsApi.create({
        patientId: id,
        protocolId: newProtocolId,
        status: TreatmentStatus.ONGOING,
        startDate: newStartDate,
        plannedDosesBeforeConsult: Number(plannedDoses),
      });

      await loadData();
      setIsTreatmentModalOpen(false);
      setNewProtocolId('');
      setNewStartDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error('Error creating treatment:', err);
      alert('Erro ao criar tratamento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingTreatment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando paciente...</span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="text-center py-20">
        <User size={48} className="mx-auto text-red-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Paciente nao encontrado</h3>
        <p className="text-slate-500 mb-4">{error || 'O paciente solicitado nao existe.'}</p>
        <Link to="/pacientes" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
          Voltar para Pacientes
        </Link>
      </div>
    );
  }

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
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
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

      {/* Timeline Events */}
      {patient.active && timelineEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center">
            <Clock size={18} className="mr-2 text-pink-500" />
            Proximos Eventos Programados
          </h3>
          <div className="relative">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 z-0"></div>

            <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent px-2">
              {timelineEvents.map((evt) => {
                const isLate = evt.status === 'late';
                const isDose = evt.type === 'dose';

                return (
                  <div key={evt.id} className="relative z-10 flex flex-col items-center min-w-[140px] text-center flex-shrink-0 group">
                    <div className={`mb-2 text-xs font-bold ${isLate ? 'text-red-600' : 'text-slate-500'}`}>
                      {formatDate(evt.date)}
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-all mb-3 ${isLate ? 'bg-red-50 border-red-500 text-red-600' :
                      'bg-white border-blue-500 text-blue-600'
                      }`}>
                      {isDose ? <Syringe size={14} /> : <MessageCircle size={14} />}
                    </div>

                    <Link
                      to={evt.type === 'message' ? '/' : `/tratamento/${evt.treatmentId}`}
                      className={`w-full p-2 rounded-lg border text-left transition-all hover:shadow-md ${isLate ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}
                    >
                      <p className={`text-xs font-bold truncate ${isLate ? 'text-red-800' : 'text-slate-800'}`}>
                        {evt.title}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5" title={evt.subtitle}>
                        {evt.subtitle}
                      </p>
                      {isLate && (
                        <span className="inline-block mt-1 text-[9px] font-bold text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-200">
                          Atrasado
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })}
              <div className="min-w-[20px]"></div>
            </div>
          </div>
        </div>
      )}

      {/* Completed Events History - Horizontal Timeline */}
      {completedEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center">
            <History size={18} className="mr-2 text-green-500" />
            Eventos Realizados
          </h3>
          <div className="relative">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 z-0"></div>

            <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent px-2">
              {completedEvents.map((evt) => {
                const isDose = evt.type === 'dose';
                const isEditing = editingEventId === evt.id;

                return (
                  <div key={evt.id} className="relative z-10 flex flex-col items-center min-w-[160px] text-center flex-shrink-0 group">
                    <div className="mb-2 text-xs font-bold text-slate-500">
                      {formatDate(evt.date)}
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-all mb-3 ${
                      evt.status === 'applied' ? 'bg-green-50 border-green-500 text-green-600' :
                      evt.status === 'not_accepted' ? 'bg-orange-50 border-orange-500 text-orange-600' :
                      'bg-blue-50 border-blue-500 text-blue-600'
                    }`}>
                      {isDose ? <Syringe size={14} /> : <MessageCircle size={14} />}
                    </div>

                    <div className="w-full p-3 rounded-lg border bg-slate-50 border-slate-100 text-left transition-all hover:shadow-md hover:border-green-200">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs font-bold text-slate-800 truncate flex-1">
                          {evt.title}
                        </p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                          evt.status === 'applied' ? 'bg-green-100 text-green-700' :
                          evt.status === 'not_accepted' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {evt.status === 'applied' ? 'Aplicada' :
                           evt.status === 'not_accepted' ? 'Nao Realizada' : 'Concluido'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2" title={evt.subtitle}>
                        {evt.subtitle}
                      </p>

                      {/* Observation Display/Edit */}
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={eventObservation}
                            onChange={(e) => setEventObservation(e.target.value)}
                            placeholder="Observacao..."
                            className="w-full text-[10px] border-slate-300 rounded focus:ring-pink-500 focus:border-pink-500 resize-none p-1.5"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveEventObservation(evt.id, evt.doseId)}
                              disabled={isSavingObservation}
                              className="flex-1 flex items-center justify-center px-2 py-1 text-[10px] font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {isSavingObservation ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingEventId(null);
                                setEventObservation('');
                              }}
                              className="px-2 py-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {evt.observation && (
                            <div className="mt-2 p-1.5 bg-white rounded border border-slate-200">
                              <p className="text-[10px] text-slate-600 line-clamp-2">{evt.observation}</p>
                            </div>
                          )}
                          {isDose && (
                            <button
                              onClick={() => handleOpenEditObservation(evt.id, evt.observation || '')}
                              className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-pink-600 py-1 rounded hover:bg-pink-50 transition-colors"
                            >
                              {evt.observation ? <Edit2 size={10} /> : <Plus size={10} />}
                              {evt.observation ? 'Editar' : 'Obs.'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="min-w-[20px]"></div>
            </div>
          </div>
        </div>
      )}

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
                <span className="font-medium text-slate-800">{patient.birthDate ? formatDate(patient.birthDate) : '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sexo</span>
                <span className="font-medium text-slate-800">{patient.gender === 'F' ? 'Feminino' : patient.gender === 'M' ? 'Masculino' : '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Responsavel</span>
                <div className="font-medium text-slate-800">{patient.guardian?.fullName || '-'}</div>
                <div className="text-slate-600">{patient.guardian?.relationship || ''}</div>
                <div className="text-pink-600 mt-1">{patient.guardian?.phonePrimary || '-'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
              <MapPin size={18} className="mr-2 text-pink-500" />
              Endereco
            </h3>
            {patient.address ? (
              <div className="text-sm text-slate-600 space-y-1">
                <p>{patient.address.street}, {patient.address.number}</p>
                <p>{patient.address.neighborhood}</p>
                <p>{patient.address.city} - {patient.address.state}</p>
                <p>{patient.address.zipCode}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Endereco nao cadastrado.</p>
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
                const appliedDoses = doses.filter(d => d.treatmentId === treatment.id && d.status === DoseStatus.APPLIED).length;
                return (
                  <div key={treatment.id} className="border border-slate-100 rounded-lg p-4 hover:border-pink-200 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{getProtocolName(treatment.protocolId)}</h4>
                        <p className="text-sm text-slate-500 mt-1">Inicio: {formatDate(treatment.startDate)}</p>
                        <div className="mt-2 flex gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold border ${getTreatmentStatusColor(treatment.status)}`}>
                            {treatment.status}
                          </span>

                          {treatment.plannedDosesBeforeConsult > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold flex items-center">
                              <Syringe size={12} className="mr-1" />
                              Doses: {appliedDoses}/{treatment.plannedDosesBeforeConsult}
                            </span>
                          )}

                          {treatment.nextConsultationDate && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              Prox. Consulta: {formatDate(treatment.nextConsultationDate)}
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
                );
              })}
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
              Observacoes Clinicas
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {patient.clinicalNotes || "Nenhuma observacao registrada."}
            </p>
          </div>
        </div>
      </div>

      {/* Modal Documents */}
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
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                  {uploadError}
                </div>
              )}

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
                    <p className="text-xs text-slate-400">PDF ou Word (Max. {MAX_FILE_SIZE_MB}MB)</p>
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
                              <span>-</span>
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
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
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

      {/* Modal New Treatment */}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Protocolo / Diagnostico</label>
                <select
                  required
                  value={newProtocolId}
                  onChange={handleProtocolChange}
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="" disabled>Selecione o protocolo...</option>
                  {protocols.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.frequencyDays} dias)</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Configure novos em "Protocolos" no menu.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Inicio</label>
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
                    {(!isMedicationProtocol && newProtocolId) ? "Nao aplicavel para este protocolo." : "Geralmente 1, 2 ou 3."}
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

      {/* Modal Edit Patient */}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Responsavel</label>
                <input type="text" value={editGuardianName} onChange={e => setEditGuardianName(e.target.value)} className="w-full border-slate-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone de Contato</label>
                <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full border-slate-300 rounded-lg" required />
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <h4 className="text-sm font-bold text-pink-600 mb-2">Endereco</h4>
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
                          <Loader2 size={16} className="animate-spin text-pink-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Rua / Logradouro</label>
                    <input type="text" value={editStreet} onChange={e => setEditStreet(e.target.value)} className="w-full border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Numero</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Observacoes Clinicas</label>
                <textarea value={editClinicalNotes} onChange={e => setEditClinicalNotes(e.target.value)} rows={3} className="w-full border-slate-300 rounded-lg" />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingPatient}
                  className="w-full flex items-center justify-center bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingPatient ? <Loader2 size={18} className="mr-2 animate-spin" /> : null}
                  {isSavingPatient ? 'Salvando...' : 'Salvar Alteracoes'}
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
