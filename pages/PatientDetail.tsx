
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientsApi, treatmentsApi, protocolsApi, dosesApi, dismissedLogsApi, patientEventsApi, settingsApi, clinicalNotesApi, PatientEvent } from '../services/api';
import { formatDate, getTreatmentStatusColor, addDays, diffInDays, formatConsultationPeriod } from '../constants';
import { User, MapPin, FileText, Activity, ArrowRight, UploadCloud, X, File, Download, Trash2, CheckCircle2, Pill, Edit, AlertCircle, Loader2, Syringe, Save, MessageCircle, Clock, RefreshCw, History, Plus, Edit2, Calendar } from 'lucide-react';
import { ConsentDocument, Treatment, SurveyStatus, TreatmentStatus, DoseStatus, ProtocolCategory, PatientFull, Protocol, Dose, ClinicalNote } from '../types';
import FortnightSelector from '../components/ui/FortnightSelector';

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

  // Treatment Modal State (March 2026: 3-phase wizard)
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [newProtocolId, setNewProtocolId] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  // Phase 2: required, default 0 by design (forces conscious entry)
  const [plannedDoses, setPlannedDoses] = useState<number>(0);
  // Phase 1: auto-register Dose 1 with CONFIRM_APPLICATION status (default checked)
  const [autoCreateDose1, setAutoCreateDose1] = useState(true);
  // Phase 3: structured next consultation forecast (Quinzena selector)
  const [nextConsultMonth, setNextConsultMonth] = useState<number | null>(null);
  const [nextConsultYear, setNextConsultYear] = useState<number | null>(null);
  const [nextConsultFortnight, setNextConsultFortnight] = useState<1 | 2 | null>(null);
  const [isSavingTreatment, setIsSavingTreatment] = useState(false);

  // Edit Patient Modal State
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  // Document Upload State
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [consentStatus, setConsentStatus] = useState<'PENDING' | 'SIGNED' | 'REFUSED'>('PENDING');

  // Event Observation State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventObservation, setEventObservation] = useState('');
  const [isSavingObservation, setIsSavingObservation] = useState(false);

  // Manual Event Modal State
  const [manualEvents, setManualEvents] = useState<PatientEvent[]>([]);
  const [isManualEventModalOpen, setIsManualEventModalOpen] = useState(false);
  const [manualEventTitle, setManualEventTitle] = useState('');
  const [manualEventDate, setManualEventDate] = useState('');
  const [manualEventDescription, setManualEventDescription] = useState('');
  const [isSavingManualEvent, setIsSavingManualEvent] = useState(false);

  // Form states for Patient Edit
  const [editName, setEditName] = useState('');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  // Address Edit fields
  const [editStreet, setEditStreet] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editComplement, setEditComplement] = useState('');
  const [editCondominium, setEditCondominium] = useState('');
  const [editReferencePoint, setEditReferencePoint] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editState, setEditState] = useState('');
  const [editZipCode, setEditZipCode] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Adherence settings (loaded from API)
  const [adherenceSettings, setAdherenceSettings] = useState<Record<string, string>>({});

  // Clinical Notes states
  const [clinicalNotesList, setClinicalNotesList] = useState<ClinicalNote[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Load data from API
  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [patientRes, treatmentsRes, protocolsRes, dosesRes, dismissedRes, docsRes, eventsRes, adherenceRes, notesRes] = await Promise.all([
        patientsApi.getById(id),
        treatmentsApi.getAll({ patientId: id }),
        protocolsApi.getAll(),
        dosesApi.getAll({ limit: 1000 }),
        dismissedLogsApi.getAll(),
        patientsApi.getDocuments(id),
        patientEventsApi.getByPatient(id),
        settingsApi.getAdherenceSettings(),
        clinicalNotesApi.getByPatient(id)
      ]);

      // getById returns the patient object directly, not wrapped in { data: ... }
      setPatient(patientRes);
      setTreatments(treatmentsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setDoses(dosesRes.data || []);
      setDismissedLogs(dismissedRes.data || []);
      setDocuments(docsRes.data || []);
      setManualEvents(eventsRes.data || []);
      setAdherenceSettings(adherenceRes.data || {});
      setClinicalNotesList(notesRes.data || []);
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

        // Helper to parse ISO date string without timezone shift
        const parseLocalDate = (dateStr: string) => {
          const dateOnly = dateStr.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        const pendingDoses = treatmentDoses.filter(d => d.status === DoseStatus.PENDING);
        pendingDoses.forEach(d => {
          const doseDate = parseLocalDate(d.applicationDate);
          events.push({
            id: d.id,
            date: doseDate,
            type: 'dose',
            title: `Dose ${d.cycleNumber}`,
            subtitle: proto.medicationType,
            status: diffInDays(doseDate, TODAY) < 0 ? 'late' : 'pending',
            treatmentId: t.id
          });
        });

        if (pendingDoses.length === 0) {
          // Check if all planned doses have been applied
          const appliedCount = treatmentDoses.filter(d => d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE).length;
          const plannedCount = t.plannedDosesBeforeConsult || 0;

          // Only project next dose if there are more doses to be done
          if (plannedCount === 0 || appliedCount < plannedCount) {
            const lastDose = treatmentDoses
              .filter(d => d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE)
              .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())[0];

            let nextDate: Date;
            let nextCycle = 1;

            if (lastDose) {
              nextDate = parseLocalDate(lastDose.applicationDate);
              nextDate.setDate(nextDate.getDate() + (proto.frequencyDays || 30));
              nextCycle = lastDose.cycleNumber + 1;
            } else {
              nextDate = parseLocalDate(t.startDate);
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
      }

      if (proto.milestones) {
        const getLocalDate = (dateStr: string) => {
          const dateOnly = dateStr.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        const isMedication = proto.category === 'MEDICATION' || proto.category === ProtocolCategory.MEDICATION;

        let milestoneReferenceDate: Date | null = null;

        if (isMedication) {
          // MEDICATION protocols: messages based on actual dose application
          // Block if there are overdue pending doses
          const allTreatmentDoses = doses.filter(d => d.treatmentId === t.id);
          const overduePendingDoses = allTreatmentDoses.filter(d =>
            d.status === DoseStatus.PENDING && diffInDays(getLocalDate(d.applicationDate), TODAY) < 0
          );
          const appliedDoses = allTreatmentDoses.filter(d => d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE);
          const lastAppliedDose = appliedDoses
            .sort((a, b) => getLocalDate(b.applicationDate).getTime() - getLocalDate(a.applicationDate).getTime())[0];

          // Block: no applied dose or overdue pending doses
          if (!lastAppliedDose || overduePendingDoses.length > 0) {
            milestoneReferenceDate = null; // blocked
          } else {
            milestoneReferenceDate = getLocalDate(lastAppliedDose.applicationDate);
          }
        } else {
          // NON-MEDICATION protocols: messages based on treatment start date
          milestoneReferenceDate = getLocalDate(t.startDate);
        }

        if (milestoneReferenceDate) {
          proto.milestones.forEach((m: any) => {
            const contactDate = new Date(milestoneReferenceDate!);
            contactDate.setDate(contactDate.getDate() + m.day);

            const contactId = `${t.id}_m_${m.day}`;

            const isDone = dismissedLogs.some(log => log.contactId === contactId);

            if (!isDone) {
              const diff = diffInDays(contactDate, TODAY);
              // Show events from 10 days ago up to 365 days in the future
              if (diff > -10 && diff < 365) {
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
      }
    });

    // Add manual events
    const TODAY_MANUAL = new Date();
    manualEvents.forEach(evt => {
      const eventDate = new Date(evt.eventDate);
      const diff = diffInDays(eventDate, TODAY_MANUAL);
      // Show manual events from past 10 days to future 365 days
      if (diff > -10 && diff < 365) {
        events.push({
          id: `manual_${evt.id}`,
          date: eventDate,
          type: 'manual',
          title: evt.title,
          subtitle: evt.description || '',
          status: diff < 0 ? 'late' : 'pending',
          source: 'manual'
        });
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [treatments, patient, protocols, doses, dismissedLogs, manualEvents]);

  // Past/Completed Events Logic
  const completedEvents = useMemo(() => {
    if (!patient) return [];
    const events: any[] = [];
    const TODAY = new Date();
    TODAY.setHours(23, 59, 59, 999); // End of today

    treatments.forEach(t => {
      const proto = protocols.find(p => p.id === t.protocolId);
      if (!proto) return;

      // Applied doses - only show if date is in the past or today
      const treatmentDoses = doses.filter(d => d.treatmentId === t.id);
      const appliedDoses = treatmentDoses.filter(d =>
        (d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE || d.status === DoseStatus.NOT_ACCEPTED) &&
        new Date(d.applicationDate) <= TODAY
      );

      appliedDoses.forEach(d => {
        events.push({
          id: d.id,
          date: new Date(d.applicationDate),
          type: 'dose',
          title: `Dose ${d.cycleNumber}`,
          subtitle: proto.medicationType || proto.name,
          status: (d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE) ? 'applied' : 'not_accepted',
          treatmentId: t.id,
          observation: d.surveyComment || '',
          doseId: d.id
        });
      });

      // Completed milestones/contacts
      if (proto.milestones) {
        // For completed milestones, use the dismissedAt date minus milestone day as approximate reference
        // This ensures the timeline shows them near when they were actually sent
        proto.milestones.forEach((m: any) => {
          const contactId = `${t.id}_m_${m.day}`;
          const dismissedLog = dismissedLogs.find(log => log.contactId === contactId);

          if (dismissedLog) {
            // Use dismissedAt date as the contact date (when it was actually sent)
            const contactDate = new Date(dismissedLog.dismissedAt);
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

  // Calculate patient adherence level based on configurable settings
  // BOA: All doses on time, individual delays < X days
  // PARCIAL: 2 to Y doses APPLIED_LATE with delay > X days
  // RUIM: More than Y doses APPLIED_LATE with delay > Z days
  // ABANDONO: Last scheduled PENDING dose exceeded W days overdue
  const patientAdherenceLevel = useMemo(() => {
    if (!patient || treatments.length === 0) return null;

    const X = parseInt(adherenceSettings['adherence_max_delay_good'] || '3', 10);
    const Y = parseInt(adherenceSettings['adherence_max_late_doses_partial'] || '3', 10);
    const Z = parseInt(adherenceSettings['adherence_min_delay_bad'] || '5', 10);
    const W = parseInt(adherenceSettings['adherence_abandonment_days'] || '30', 10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let hasOngoingTreatment = false;
    let lateCount = 0;     // APPLIED_LATE doses with delay > X
    let veryLateCount = 0; // APPLIED_LATE doses with delay > Z
    let isAbandoned = false;

    treatments.forEach(t => {
      if (t.status !== TreatmentStatus.ONGOING) return;
      hasOngoingTreatment = true;

      const protocol = protocols.find(p => p.id === t.protocolId);
      if (!protocol) return;

      const treatmentDoses = doses.filter(d => d.treatmentId === t.id);
      const frequencyDays = protocol.frequencyDays || 28;

      // Parse start date correctly to avoid timezone issues
      const startDateStr = t.startDate.split('T')[0];
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);

      // Count APPLIED_LATE doses with delay thresholds
      treatmentDoses.forEach(dose => {
        if (dose.status === DoseStatus.APPLIED_LATE && dose.scheduledDate && dose.applicationDate) {
          const schedDay = new Date(dose.scheduledDate); schedDay.setHours(0, 0, 0, 0);
          const appDay = new Date(dose.applicationDate); appDay.setHours(0, 0, 0, 0);
          const delayDays = Math.floor((appDay.getTime() - schedDay.getTime()) / (1000 * 60 * 60 * 24));

          if (delayDays > X) lateCount++;
          if (delayDays > Z) veryLateCount++;
        }
      });

      // Check for abandonment: find last pending dose and check if overdue > W days
      const plannedCount = t.plannedDosesBeforeConsult || 0;
      for (let i = plannedCount - 1; i >= 0; i--) {
        const cycleNumber = i + 1;
        const scheduledDate = new Date(startDate);
        if (i > 0) {
          scheduledDate.setDate(scheduledDate.getDate() + frequencyDays * i);
        }

        const existingDose = treatmentDoses.find(d => d.cycleNumber === cycleNumber);

        if (existingDose && existingDose.status === DoseStatus.PENDING) {
          const daysOverdue = Math.floor((today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue > W) {
            isAbandoned = true;
          }
          break;
        } else if (!existingDose) {
          const daysOverdue = Math.floor((today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue > W) {
            isAbandoned = true;
          }
          break;
        } else if (existingDose.status === DoseStatus.APPLIED || existingDose.status === DoseStatus.APPLIED_LATE) {
          continue;
        } else {
          break;
        }
      }
    });

    if (!hasOngoingTreatment) return null;

    // Classify by priority
    if (isAbandoned) return 'ABANDONO';
    if (veryLateCount > Y) return 'RUIM';
    if (lateCount >= 2 && lateCount <= Y) return 'PARCIAL';
    return 'BOA';
  }, [patient, treatments, doses, protocols, adherenceSettings]);

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

    setEditStreet(patient.address?.street || '');
    setEditNumber(patient.address?.number || '');
    setEditComplement(patient.address?.complement || '');
    setEditCondominium(patient.address?.condominium || '');
    setEditReferencePoint(patient.address?.referencePoint || '');
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
          complement: editComplement || undefined,
          condominium: editCondominium || undefined,
          referencePoint: editReferencePoint || undefined,
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
          fileUrl: `/uploads/${id}/${file.name}`,
          status: 'SIGNED' // When uploading a file, automatically mark as SIGNED
        });

        await loadData();
        setConsentStatus('PENDING'); // Reset status after upload
      } catch (err: any) {
        console.error('Error uploading document:', err);
        setUploadError('Erro ao enviar documento: ' + (err.message || 'Erro desconhecido'));
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleSaveConsentStatus = async () => {
    if (!id) return;
    if (consentStatus === 'PENDING') {
      setUploadError('Por favor, selecione ASSINADO ou RECUSADO.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      await patientsApi.uploadDocument(id, {
        status: consentStatus
      });

      await loadData();
      setConsentStatus('PENDING'); // Reset status after save
    } catch (err: any) {
      console.error('Error saving consent status:', err);
      setUploadError('Erro ao salvar status: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsUploading(false);
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

    // Phase 2 validation: planned doses must be > 0 for medication protocols (per spec)
    if (isMedicationProtocol && plannedDoses <= 0) {
      alert('Informe a quantidade de Doses Planejadas (campo obrigatório).');
      return;
    }

    setIsSavingTreatment(true);

    try {
      await treatmentsApi.create({
        patientId: id,
        protocolId: newProtocolId,
        status: TreatmentStatus.ONGOING,
        startDate: newStartDate,
        plannedDosesBeforeConsult: Number(plannedDoses),
        // Phase 1: auto-register Dose 1 (only meaningful for medication protocols)
        autoCreateDose1: isMedicationProtocol && autoCreateDose1,
        // Phase 3: structured forecast — only sent when all 3 fields filled
        ...(nextConsultMonth && nextConsultYear && nextConsultFortnight ? {
          nextConsultationMonth: nextConsultMonth,
          nextConsultationYear: nextConsultYear,
          nextConsultationFortnight: nextConsultFortnight,
        } : {}),
      });

      await loadData();
      setIsTreatmentModalOpen(false);
      setNewProtocolId('');
      setNewStartDate(new Date().toISOString().split('T')[0]);
      setPlannedDoses(0);
      setAutoCreateDose1(true);
      setNextConsultMonth(null);
      setNextConsultYear(null);
      setNextConsultFortnight(null);
    } catch (err: any) {
      console.error('Error creating treatment:', err);
      alert('Erro ao criar tratamento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingTreatment(false);
    }
  };

  // Handle Save Manual Event
  const handleSaveManualEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !manualEventTitle || !manualEventDate) return;

    // Validate date is not in the past - parse date without timezone shift
    const [year, month, day] = manualEventDate.split('-').map(Number);
    const eventDateObj = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDateObj < today) {
      alert('A data do evento não pode ser no passado.');
      return;
    }

    setIsSavingManualEvent(true);

    try {
      // Send date with noon time to avoid timezone issues
      await patientEventsApi.create(id, {
        title: manualEventTitle,
        eventDate: `${manualEventDate}T12:00:00.000Z`,
        description: manualEventDescription || undefined,
      });

      await loadData();
      setIsManualEventModalOpen(false);
      setManualEventTitle('');
      setManualEventDate('');
      setManualEventDescription('');
    } catch (err: any) {
      console.error('Error creating manual event:', err);
      alert('Erro ao criar evento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingManualEvent(false);
    }
  };

  // Handle Delete Manual Event
  const handleDeleteManualEvent = async (eventId: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    try {
      // Extract actual event ID from the prefixed ID
      const actualId = eventId.replace('manual_', '');
      await patientEventsApi.delete(actualId);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting manual event:', err);
      alert('Erro ao excluir evento: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // Clinical Notes handlers
  const handleAddNote = async () => {
    if (!id || !newNoteContent.trim()) return;
    setIsSavingNote(true);
    try {
      await clinicalNotesApi.create(id, newNoteContent.trim());
      const res = await clinicalNotesApi.getByPatient(id);
      setClinicalNotesList(res.data || []);
      setNewNoteContent('');
      setIsAddingNote(false);
    } catch (err: any) {
      alert('Erro ao adicionar observacao: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleStartEditNote = (note: ClinicalNote) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleSaveEditNote = async () => {
    if (!id || !editingNoteId || !editingNoteContent.trim()) return;
    setIsSavingNote(true);
    try {
      await clinicalNotesApi.update(editingNoteId, editingNoteContent.trim());
      const res = await clinicalNotesApi.getByPatient(id);
      setClinicalNotesList(res.data || []);
      setEditingNoteId(null);
      setEditingNoteContent('');
    } catch (err: any) {
      alert('Erro ao editar observacao: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id || !confirm('Tem certeza que deseja excluir esta observacao?')) return;
    try {
      await clinicalNotesApi.delete(noteId);
      const res = await clinicalNotesApi.getByPatient(id);
      setClinicalNotesList(res.data || []);
    } catch (err: any) {
      alert('Erro ao excluir observacao: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // Handle Remove Protocol Message from Flow (marks as dismissed without feedback)
  const handleRemoveMessageFromFlow = async (contactId: string) => {
    if (!confirm('Tem certeza que deseja remover esta mensagem do fluxo?')) return;

    try {
      await dismissedLogsApi.dismiss(contactId);
      await loadData();
    } catch (err: any) {
      console.error('Error removing message from flow:', err);
      alert('Erro ao remover mensagem: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // Handle Delete Treatment
  const handleDeleteTreatment = async (treatmentId: string, protocolName: string) => {
    const confirmed = confirm(
      `Tem certeza que deseja excluir o tratamento "${protocolName}"?\n\nEsta ação não pode ser desfeita e todas as doses associadas serão removidas.`
    );

    if (!confirmed) return;

    try {
      await treatmentsApi.delete(treatmentId);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting treatment:', err);
      alert('Erro ao excluir tratamento: ' + (err.message || 'Erro desconhecido'));
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
            <span className="text-lg font-bold text-slate-500">#{patient.patientNumber}</span>
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
          {(patient as any)?.lateApplicationCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                <AlertCircle size={14} className="mr-1" />
                {(patient as any).lateApplicationCount} dose(s) com atraso
              </span>
              {(patient as any)?.totalDelayDays > 0 && (
                <span className="flex items-center text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <Clock size={14} className="mr-1" />
                  {(patient as any).totalDelayDays} dia(s) de atraso total
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setUploadError(null);
              setIsDocsModalOpen(true);
            }}
            className="flex items-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <UploadCloud size={18} className="mr-2 text-pink-600" />
            Termos
            {documents.length > 0 && (
              <span className="ml-2 bg-pink-100 text-pink-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {documents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Timeline Events — March 2026: visível para pacientes ativos E inativos.
          Agendar Evento Manual deve funcionar independente do status do paciente. */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-700 flex items-center">
              <Clock size={18} className="mr-2 text-pink-500" />
              Proximos Eventos Programados
            </h3>
            <button
              onClick={() => setIsManualEventModalOpen(true)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={16} className="mr-1" />
              Agendar Evento Manual
            </button>
          </div>

          {timelineEvents.length > 0 ? (
            <div className="relative">
              <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 z-0"></div>

              <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent px-2">
                {timelineEvents.map((evt) => {
                  const isLate = evt.status === 'late';
                  const isDose = evt.type === 'dose';
                  const isManual = evt.type === 'manual';

                  return (
                    <div key={evt.id} className="relative z-10 flex flex-col items-center w-[120px] text-center flex-shrink-0 group">
                      <div className={`mb-2 text-xs font-bold ${isLate ? 'text-red-600' : 'text-slate-500'}`}>
                        {formatDate(evt.date)}
                      </div>

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm transition-all mb-3 ${isLate ? 'bg-red-50 border-red-500 text-red-600' :
                        isManual ? 'bg-amber-50 border-amber-500 text-amber-600' :
                        'bg-white border-blue-500 text-blue-600'
                        }`}>
                        {isDose ? <Syringe size={14} /> : isManual ? <Calendar size={14} /> : <MessageCircle size={14} />}
                      </div>

                      {isManual ? (
                        <div
                          className={`w-full p-2 rounded-lg border text-left transition-all hover:shadow-md h-[90px] overflow-hidden relative ${isLate ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100 hover:border-amber-200'}`}
                          title={evt.subtitle}
                        >
                          <button
                            onClick={() => handleDeleteManualEvent(evt.id)}
                            className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir evento"
                          >
                            <Trash2 size={12} />
                          </button>
                          <p className={`text-xs font-bold truncate ${isLate ? 'text-red-800' : 'text-slate-800'}`}>
                            {evt.title}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {evt.subtitle}
                          </p>
                          <span className="inline-block mt-1 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                            Manual
                          </span>
                          {isLate && (
                            <span className="inline-block ml-1 text-[9px] font-bold text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-200">
                              Atrasado
                            </span>
                          )}
                        </div>
                      ) : evt.type === 'message' ? (
                        <div
                          className={`w-full p-2 rounded-lg border text-left transition-all hover:shadow-md h-[90px] overflow-hidden relative ${isLate ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}
                          title={evt.subtitle}
                        >
                          <button
                            onClick={() => handleRemoveMessageFromFlow(evt.id)}
                            className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover do fluxo"
                          >
                            <X size={12} />
                          </button>
                          <p className={`text-xs font-bold truncate ${isLate ? 'text-red-800' : 'text-slate-800'}`}>
                            {evt.title}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {evt.subtitle}
                          </p>
                          {isLate && (
                            <span className="inline-block mt-1 text-[9px] font-bold text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-200">
                              Atrasado
                            </span>
                          )}
                        </div>
                      ) : (
                        <Link
                          to={`/tratamento/${evt.treatmentId}`}
                          className={`w-full p-2 rounded-lg border text-left transition-all hover:shadow-md h-[90px] overflow-hidden ${isLate ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}
                          title={evt.subtitle}
                        >
                          <p className={`text-xs font-bold truncate ${isLate ? 'text-red-800' : 'text-slate-800'}`}>
                            {evt.title}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {evt.subtitle}
                          </p>
                          {isLate && (
                            <span className="inline-block mt-1 text-[9px] font-bold text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-200">
                              Atrasado
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                  );
                })}
                <div className="min-w-[20px]"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum evento programado</p>
            </div>
          )}
        </div>

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
                  <div key={evt.id} className="relative z-10 flex flex-col items-center w-[120px] text-center flex-shrink-0 group">
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

                    <div
                      className="w-full p-2 rounded-lg border bg-slate-50 border-slate-100 text-left transition-all hover:shadow-md hover:border-green-200 h-[90px] overflow-hidden relative"
                      title={evt.subtitle}
                    >
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {evt.title}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                        {evt.subtitle}
                      </p>
                      <span className={`inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        evt.status === 'applied' ? 'bg-green-100 text-green-700' :
                        evt.status === 'not_accepted' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {evt.status === 'applied' ? 'Aplicada' :
                         evt.status === 'not_accepted' ? 'Nao Realizada' : 'Concluido'}
                      </span>
                      {isDose && (
                        <button
                          onClick={() => handleOpenEditObservation(evt.id, evt.observation || '')}
                          className="absolute bottom-1 right-1 p-0.5 text-slate-400 hover:text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={evt.observation ? 'Editar observação' : 'Adicionar observação'}
                        >
                          {evt.observation ? <Edit2 size={10} /> : <Plus size={10} />}
                        </button>
                      )}
                    </div>

                    {/* Observation Edit Modal (appears below card when editing) */}
                    {isEditing && (
                      <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white rounded-lg border border-slate-200 shadow-lg z-20">
                        <textarea
                          value={eventObservation}
                          onChange={(e) => setEventObservation(e.target.value)}
                          placeholder="Observacao..."
                          className="w-full text-[10px] border-slate-300 rounded focus:ring-pink-500 focus:border-pink-500 resize-none p-1.5"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-1 mt-1">
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
                    )}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <User size={18} className="mr-2 text-pink-500" />
                Dados Pessoais
              </h3>
              {patientAdherenceLevel && (
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                  patientAdherenceLevel === 'BOA' ? 'bg-green-100 text-green-700 border-green-200' :
                  patientAdherenceLevel === 'PARCIAL' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  patientAdherenceLevel === 'RUIM' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {patientAdherenceLevel === 'BOA' ? 'BOA ADESAO' :
                   patientAdherenceLevel === 'PARCIAL' ? 'PARCIAL' :
                   patientAdherenceLevel === 'RUIM' ? 'RUIM' :
                   'ABANDONO'}
                </span>
              )}
            </div>
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
                {patient.address.complement && <p>{patient.address.complement}</p>}
                {patient.address.condominium && <p>Condominio: {patient.address.condominium}</p>}
                <p>{patient.address.neighborhood}</p>
                <p>{patient.address.city} - {patient.address.state}</p>
                <p>{patient.address.zipCode}</p>
                {patient.address.referencePoint && <p className="text-slate-500 italic">Ref: {patient.address.referencePoint}</p>}
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
                const appliedDoses = doses.filter(d => d.treatmentId === treatment.id && (d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE)).length;
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

                          {/* March 2026: prefer the new structured Quinzena format if present */}
                          {(treatment.nextConsultationMonth && treatment.nextConsultationYear && treatment.nextConsultationFortnight) ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              Próx. Consulta: {formatConsultationPeriod(
                                treatment.nextConsultationMonth,
                                treatment.nextConsultationYear,
                                treatment.nextConsultationFortnight,
                              )}
                            </span>
                          ) : treatment.nextConsultationDate && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              Próx. Consulta: {formatDate(treatment.nextConsultationDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          to={`/tratamento/${treatment.id}`}
                          className="flex items-center text-sm font-medium text-pink-600 hover:text-pink-800"
                        >
                          Gerenciar
                          <ArrowRight size={16} className="ml-1" />
                        </Link>
                        <button
                          onClick={() => handleDeleteTreatment(treatment.id, getProtocolName(treatment.protocolId))}
                          className="flex items-center text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Excluir
                        </button>
                      </div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center">
                <FileText size={18} className="mr-2 text-pink-500" />
                Observacoes Clinicas
              </h3>
              {!isAddingNote && (
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="flex items-center text-xs font-medium text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={14} className="mr-1" />
                  Adicionar
                </button>
              )}
            </div>

            {/* Add new note form */}
            {isAddingNote && (
              <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500 mb-2"
                  placeholder="Digite a observacao clinica..."
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setIsAddingNote(false); setNewNoteContent(''); }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    disabled={isSavingNote}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={isSavingNote || !newNoteContent.trim()}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-lg disabled:opacity-50"
                  >
                    {isSavingNote ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Save size={12} className="mr-1" />}
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {/* Notes list */}
            {clinicalNotesList.length > 0 ? (
              <div className="space-y-3">
                {clinicalNotesList.map(note => (
                  <div key={note.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">
                          {new Date(note.createdAt).toLocaleDateString('pt-BR')} {new Date(note.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {note.updatedAt !== note.createdAt && new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 60000 && (
                          <span className="text-[10px] text-slate-400 italic">(editado)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEditNote(note)}
                          className="p-1 text-slate-400 hover:text-pink-600 rounded"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          value={editingNoteContent}
                          onChange={(e) => setEditingNoteContent(e.target.value)}
                          rows={3}
                          className="w-full border-slate-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500 mb-2"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditingNoteId(null); setEditingNoteContent(''); }}
                            className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                            disabled={isSavingNote}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveEditNote}
                            disabled={isSavingNote || !editingNoteContent.trim()}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-lg disabled:opacity-50"
                          >
                            {isSavingNote ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Save size={12} className="mr-1" />}
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Nenhuma observacao registrada.</p>
            )}
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
                    <p className="text-sm font-semibold text-slate-600">Processando...</p>
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

              {/* Status Selection - Alternative to file upload */}
              <div className="mb-8 border-t border-slate-200 pt-6">
                <div className="flex items-center justify-center mb-3">
                  <div className="flex-1 border-t border-slate-200"></div>
                  <span className="px-4 text-xs text-slate-400 uppercase tracking-wide">Ou marque o status</span>
                  <div className="flex-1 border-t border-slate-200"></div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label className={`relative flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${consentStatus === 'SIGNED' ? 'bg-green-50 border-green-500 ring-2 ring-green-500' : 'bg-white border-slate-200 hover:border-green-300'}`}>
                    <input
                      type="radio"
                      name="consentStatus"
                      value="SIGNED"
                      checked={consentStatus === 'SIGNED'}
                      onChange={(e) => setConsentStatus(e.target.value as 'SIGNED')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <CheckCircle2 size={24} className={`mx-auto mb-2 ${consentStatus === 'SIGNED' ? 'text-green-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${consentStatus === 'SIGNED' ? 'text-green-700' : 'text-slate-600'}`}>ASSINADO</span>
                    </div>
                  </label>

                  <label className={`relative flex items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${consentStatus === 'REFUSED' ? 'bg-red-50 border-red-500 ring-2 ring-red-500' : 'bg-white border-slate-200 hover:border-red-300'}`}>
                    <input
                      type="radio"
                      name="consentStatus"
                      value="REFUSED"
                      checked={consentStatus === 'REFUSED'}
                      onChange={(e) => setConsentStatus(e.target.value as 'REFUSED')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <X size={24} className={`mx-auto mb-2 ${consentStatus === 'REFUSED' ? 'text-red-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${consentStatus === 'REFUSED' ? 'text-red-700' : 'text-slate-600'}`}>RECUSADO</span>
                    </div>
                  </label>
                </div>

                <button
                  onClick={handleSaveConsentStatus}
                  disabled={isUploading || consentStatus === 'PENDING'}
                  className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      Concluir Termo de Consentimento
                    </>
                  )}
                </button>
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
                        <div className="flex items-center overflow-hidden flex-1">
                          <div className="p-2 bg-pink-50 rounded-lg mr-3 flex-shrink-0">
                            <File size={20} className="text-pink-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName || 'Sem arquivo anexado'}</p>
                              {doc.status === 'SIGNED' && (
                                <span className="flex items-center text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                                  <CheckCircle2 size={10} className="mr-0.5" /> ASSINADO
                                </span>
                              )}
                              {doc.status === 'REFUSED' && (
                                <span className="flex items-center text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                                  <X size={10} className="mr-0.5" /> RECUSADO
                                </span>
                              )}
                              {doc.status === 'PENDING' && (
                                <span className="flex items-center text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                                  <Clock size={10} className="mr-0.5" /> PENDENTE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                              <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                              <span>-</span>
                              <span>{doc.uploadedBy}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Baixar"
                            >
                              <Download size={18} />
                            </a>
                          )}
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

      {/* Modal New Treatment — March 2026 wizard (3 phases) */}
      {isTreatmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full mr-2">+ NOVO</span>
                <h3 className="font-bold text-lg text-slate-800 inline">Iniciar Tratamento</h3>
              </div>
              <button onClick={() => setIsTreatmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveTreatment} className="p-6 space-y-5 overflow-y-auto">
              {/* Protocol select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Protocolo / Diagnóstico <span className="text-red-500">*</span>
                </label>
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

              {/* Phase 1: Start date + auto-create Dose 1 checkbox */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data de Início <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min="2020-01-01"
                  max="2030-12-31"
                  value={newStartDate}
                  onChange={e => setNewStartDate(e.target.value)}
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                />

                {/* Phase 1: Auto-register Dose 1 (only for medication protocols) */}
                {(isMedicationProtocol || !newProtocolId) && (
                  <label
                    className={`mt-3 flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      autoCreateDose1
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={autoCreateDose1}
                      onChange={(e) => setAutoCreateDose1(e.target.checked)}
                      className="mt-0.5 w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-800">Dose 1 aplicada na Data Início</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Registra automaticamente a 1ª dose ao criar o tratamento (status "Confirmar Aplicação").
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Phase 2: Doses Planejadas (required, default 0 by design) */}
              <div className={!isMedicationProtocol && newProtocolId ? "opacity-50" : ""}>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Doses Planejadas <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-semibold text-pink-600">Obrigatório</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPlannedDoses(Math.max(0, plannedDoses - 1))}
                    disabled={!isMedicationProtocol && newProtocolId !== ''}
                    className="px-4 py-3 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Diminuir doses planejadas"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    required
                    disabled={!isMedicationProtocol && newProtocolId !== ''}
                    value={plannedDoses}
                    onChange={e => setPlannedDoses(Number(e.target.value))}
                    className="flex-1 text-center border-0 bg-transparent text-2xl font-bold focus:ring-0 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setPlannedDoses(plannedDoses + 1)}
                    disabled={!isMedicationProtocol && newProtocolId !== ''}
                    className="px-4 py-3 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Aumentar doses planejadas"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1 text-center">
                  {(!isMedicationProtocol && newProtocolId)
                    ? "Não aplicável para este protocolo."
                    : "O valor inicia em 0. Preencha com a quantidade exata."}
                </p>
              </div>

              {/* Phase 3: Próxima Consulta — month/year + Quinzena selector */}
              <FortnightSelector
                month={nextConsultMonth}
                year={nextConsultYear}
                fortnight={nextConsultFortnight}
                onChange={(m, y, f) => {
                  setNextConsultMonth(m);
                  setNextConsultYear(y);
                  setNextConsultFortnight(f);
                }}
              />

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
                    <label className="block text-xs font-medium text-slate-500 mb-1">Complemento <span className="text-slate-400">(opcional)</span></label>
                    <input type="text" value={editComplement} onChange={e => setEditComplement(e.target.value)} className="w-full border-slate-300 rounded-lg" placeholder="Apto, Bloco, etc." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Condominio <span className="text-slate-400">(opcional)</span></label>
                    <input type="text" value={editCondominium} onChange={e => setEditCondominium(e.target.value)} className="w-full border-slate-300 rounded-lg" placeholder="Nome do condominio" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Ponto de Referencia <span className="text-slate-400">(opcional)</span></label>
                    <input type="text" value={editReferencePoint} onChange={e => setEditReferencePoint(e.target.value)} className="w-full border-slate-300 rounded-lg" placeholder="Proximo a..." />
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

      {/* Manual Event Modal */}
      {isManualEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center">
                <Plus size={20} className="mr-2 text-blue-600" />
                <h3 className="font-bold text-lg text-slate-800">Agendar Novo Evento</h3>
              </div>
              <button
                onClick={() => {
                  setIsManualEventModalOpen(false);
                  setManualEventTitle('');
                  setManualEventDate('');
                  setManualEventDescription('');
                }}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveManualEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titulo do Evento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualEventTitle}
                  onChange={e => setManualEventTitle(e.target.value)}
                  placeholder="Ex: Entrega de Laudo, Lembrete de Exame..."
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data Programada <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={manualEventDate}
                  onChange={e => setManualEventDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descricao / Notas
                </label>
                <textarea
                  value={manualEventDescription}
                  onChange={e => setManualEventDescription(e.target.value)}
                  rows={3}
                  placeholder="Detalhes sobre o evento programado..."
                  className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsManualEventModalOpen(false);
                    setManualEventTitle('');
                    setManualEventDate('');
                    setManualEventDescription('');
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingManualEvent || !manualEventTitle || !manualEventDate}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSavingManualEvent ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Calendar size={18} className="mr-2" />}
                  {isSavingManualEvent ? 'Salvando...' : 'Agendar Evento'}
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
