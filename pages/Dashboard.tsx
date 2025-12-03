
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_DOSES, MOCK_PATIENTS, MOCK_TREATMENTS, MOCK_DOCUMENTS, MOCK_PROTOCOLS, updateMockDose, MOCK_DISMISSED_CONTACTS, dismissMockContact } from '../services/mockData';
import { DoseStatus, SurveyStatus, Dose, TreatmentStatus, ProtocolCategory, PaymentStatus } from '../types';
import { getStatusColor, diffInDays, formatDate, getDiagnosisColor, addDays } from '../constants';
import { AlertCircle, CheckCircle2, UserX, MessageCircle, ChevronRight, Activity, Calendar, Clock, UserCheck, FileWarning, UploadCloud, Edit, MessageSquare, Phone, CalendarRange, Syringe, MapPin, Copy, Check, X, Bike, Stethoscope, Save, Loader2, Star, User, ExternalLink, Trophy } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Estado local para Doses para permitir atualização em tempo real (inline editing)
  const [doses, setDoses] = useState<Dose[]>(MOCK_DOSES);
  // Estado local para mensagens concluídas/dispensadas
  const [dismissedContacts, setDismissedContacts] = useState<string[]>(MOCK_DISMISSED_CONTACTS);

  // Estados para o Modal de Endereço
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [selectedGuardianName, setSelectedGuardianName] = useState('');
  const [selectedDoseId, setSelectedDoseId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDelivered, setIsDelivered] = useState(false);

  // Estados para o Modal de Edição Completa (Enfermeira/Dose)
  const [doseModalOpen, setDoseModalOpen] = useState(false);
  const [editingDoseId, setEditingDoseId] = useState<string | null>(null);
  const [isSavingDose, setIsSavingDose] = useState(false);
  
  // Estados para o Modal de Mensagem (Régua de Contato)
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isMessageCopied, setIsMessageCopied] = useState(false);
  
  // Form States para o Modal de Dose
  const [editDoseDate, setEditDoseDate] = useState('');
  const [editDoseLot, setEditDoseLot] = useState('');
  const [editDoseStatus, setEditDoseStatus] = useState<DoseStatus | ''>('');
  const [editDosePayment, setEditDosePayment] = useState<PaymentStatus | ''>('');
  const [editIsLast, setEditIsLast] = useState(false);
  
  const [editNurse, setEditNurse] = useState('no');
  const [editSurveyStatus, setEditSurveyStatus] = useState<SurveyStatus | ''>('');
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');


  // Sincronizar caso o MOCK mude externamente (opcional, mas boa prática se houver outras interações)
  useEffect(() => {
      setDoses(MOCK_DOSES);
      setDismissedContacts(MOCK_DISMISSED_CONTACTS);
  }, []);

  const handleQuickUpdate = (doseId: string, field: 'status' | 'paymentStatus', value: string) => {
      // Atualiza no backend simulado
      const updatedList = updateMockDose(doseId, { [field]: value });
      // Atualiza estado local para refletir na UI imediatamente
      if (updatedList) {
          setDoses(updatedList);
      }
  };

  // --- Helpers de Busca de Dados Relacionados ---

  const getPatient = (treatmentId: string) => {
    const treatment = MOCK_TREATMENTS.find(t => t.id === treatmentId);
    if (!treatment) return null;
    return MOCK_PATIENTS.find(p => p.id === treatment.patientId);
  };

  const getPatientByTreatmentId = (treatmentId: string) => {
      const t = MOCK_TREATMENTS.find(tr => tr.id === treatmentId);
      return t ? MOCK_PATIENTS.find(p => p.id === t.patientId) : null;
  }
  
  const getProtocolName = (treatmentId: string) => {
      const t = MOCK_TREATMENTS.find(tr => tr.id === treatmentId);
      if (!t) return '-';
      const p = MOCK_PROTOCOLS.find(proto => proto.id === t.protocolId);
      return p ? p.name : '-';
  }

  // --- Lógica de Endereço ---
  const handleViewAddress = (e: React.MouseEvent, treatmentId: string, doseId: string) => {
      e.stopPropagation(); // Evita navegar para a tela de detalhes
      const patient = getPatientByTreatmentId(treatmentId);
      
      if (patient && patient.address) {
          const a = patient.address;
          const fullText = `${a.street}, ${a.number}${a.complement ? ' - ' + a.complement : ''} - ${a.neighborhood}, ${a.city} - ${a.state}, CEP: ${a.zipCode}`;
          
          setSelectedAddress(fullText);
          setSelectedPatientName(patient.fullName);
          setSelectedGuardianName(patient.guardian.fullName);
          setSelectedDoseId(doseId);
          setAddressModalOpen(true);
          setIsCopied(false);
          setIsDelivered(false);
      } else {
          alert('Endereço não cadastrado para este paciente.');
      }
  };

  const handleCopyAddress = () => {
      navigator.clipboard.writeText(selectedAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConfirmDelivery = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked && selectedDoseId) {
          setIsDelivered(true);
          handleQuickUpdate(selectedDoseId, 'paymentStatus', PaymentStatus.PAID);
          
          // Fecha o modal após um breve delay visual
          setTimeout(() => {
              setAddressModalOpen(false);
              setIsDelivered(false);
          }, 800);
      }
  };

  // --- Lógica de Edição Completa de Dose (Modal) ---
  const handleOpenDoseModal = (e: React.MouseEvent, dose: Dose) => {
      e.stopPropagation();
      setEditingDoseId(dose.id);
      
      // Preencher form
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
      await new Promise(resolve => setTimeout(resolve, 800));

      // Encontrar frequência do protocolo para recalcular datas se necessário
      const dose = doses.find(d => d.id === editingDoseId);
      let frequency = 28; // fallback
      if (dose) {
          const treatment = MOCK_TREATMENTS.find(t => t.id === dose.treatmentId);
          if (treatment) {
              const proto = MOCK_PROTOCOLS.find(p => p.id === treatment.protocolId);
              if (proto) frequency = proto.frequencyDays;
          }
      }

      const isNurse = editNurse === 'yes';
       // Validar status da pesquisa se não tiver enfermeira
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

      const updatedList = updateMockDose(editingDoseId, updates, frequency);
      if (updatedList) {
          setDoses(updatedList);
      }

      setIsSavingDose(false);
      setDoseModalOpen(false);
  };

  // --- Lógica do Modal de Mensagem e Exclusão ---
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

  const handleDismissContact = (e: React.MouseEvent | null, contactId: string) => {
      if(e) e.stopPropagation();
      const updatedList = dismissMockContact(contactId);
      setDismissedContacts(updatedList); // Update local state to trigger filtering
      if(messageModalOpen) setMessageModalOpen(false);
  };

  // --- Lógica de Dados ---

  const TODAY = new Date();

  // 0. Estatísticas de Pacientes
  const patientStats = useMemo(() => {
    const total = MOCK_PATIENTS.length;
    const active = MOCK_PATIENTS.filter(p => p.active).length;
    const inactive = total - active;
    return { active, inactive, total };
  }, []);

  // 1. Doses em Atraso (Corrigido: Verifica apenas a ÚLTIMA dose de cada tratamento)
  const overdueDoses = useMemo(() => {
    const latestDosesMap: Record<string, Dose> = {};

    // 1. Agrupar: Encontrar a última dose aplicada de cada tratamento
    doses.forEach(dose => {
        if (dose.status !== DoseStatus.APPLIED) return;

        const existing = latestDosesMap[dose.treatmentId];
        // Se não tem registro ainda, ou se a dose atual é mais recente que a registrada
        if (!existing || new Date(dose.applicationDate) > new Date(existing.applicationDate)) {
            latestDosesMap[dose.treatmentId] = dose;
        }
    });

    // 2. Filtrar: Verificar quais dessas "últimas doses" estão vencidas hoje
    return Object.values(latestDosesMap).filter(d => {
        // Recalculamos dinamicamente a diferença para garantir precisão em relação ao dia atual
        const nextDate = new Date(d.calculatedNextDate);
        const diff = diffInDays(nextDate, TODAY);
        // Retornamos apenas se a próxima data já passou (diff < 0)
        return diff < 0;
    });
  }, [doses]);

  // 2. Não Aceitas (Não utilizado visualmente ainda, mas calculado)
  const notAccepted = useMemo(() => {
    return doses.filter(d => d.status === DoseStatus.NOT_ACCEPTED);
  }, [doses]);

  // 3. Aguardando Resposta da Pesquisa (Regra Atualizada: Enfermeira SIM + Status Pendente OU Nota 0)
  const pendingSurveys = useMemo(() => {
    return doses.filter(d => {
        // 1. Enfermeira: Sim (Obrigatório)
        if (!d.nurse) return false;

        // 2. Pesquisa: Aguardando, Enviado ou Não Enviado
        const isPendingStatus = 
            d.surveyStatus === SurveyStatus.WAITING || 
            d.surveyStatus === SurveyStatus.SENT || 
            d.surveyStatus === SurveyStatus.NOT_SENT;

        // 3. OU Se a Nota for igual a 0 (zero)
        const isZeroScore = !d.surveyScore || d.surveyScore === 0;

        return isPendingStatus || isZeroScore;
    });
  }, [doses]);

  // 4. Próximas Consultas (Retornos em 30 dias baseados na última dose)
  const approachingConsults = useMemo(() => {
      return doses.filter(d => {
          // A dose deve ser a última antes da consulta
          if (!d.isLastBeforeConsult) return false;
          
          // Se NÃO tiver data, é PENDENTE, então deve aparecer na lista para ser agendado
          if (!d.consultationDate) return true;
          
          const consultDate = new Date(d.consultationDate);
          const diff = diffInDays(consultDate, TODAY);
          
          // Exibe se estiver no futuro (>=0) e em menos de 30 dias
          return diff >= 0 && diff <= 30;
      }).sort((a, b) => {
          // Prioridade para quem não tem data (Pendente)
          if (!a.consultationDate) return -1;
          if (!b.consultationDate) return 1;
          return new Date(a.consultationDate).getTime() - new Date(b.consultationDate).getTime();
      });
  }, [doses]);

  // 5. NPS Enfermagem (Cálculo do Net Promoter Score)
  const npsMetrics = useMemo(() => {
    // Filtrar apenas respostas válidas (score > 0 e respondido)
    const answeredDoses = doses.filter(d => d.surveyScore !== undefined && d.surveyScore > 0 && d.surveyStatus === SurveyStatus.ANSWERED);
    const total = answeredDoses.length;

    if (total === 0) return { score: 0, total: 0 };

    let promoters = 0;
    let detractors = 0;

    answeredDoses.forEach(d => {
        const s = d.surveyScore || 0;
        if (s >= 9) promoters++; // 9-10
        else if (s <= 6) detractors++; // 0-6
    });

    // Fórmula NPS: % Promotores - % Detratores
    const nps = Math.round(((promoters - detractors) / total) * 100);

    return {
        score: nps,
        total: total
    };
  }, [doses]);

  // 6. Pacientes Ativos por Diagnóstico
  const patientsByDiagnosis = useMemo(() => {
    const counts: Record<string, number> = {};
    MOCK_PATIENTS.filter(p => p.active).forEach(p => {
        const diag = p.mainDiagnosis || 'Não Informado';
        counts[diag] = (counts[diag] || 0) + 1;
    });

    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Ordenar do maior para o menor
  }, []);

  // 7. Pendência de Termo de Consentimento
  const patientsMissingConsent = useMemo(() => {
    return MOCK_PATIENTS.filter(p => {
        if (!p.active) return false;
        
        const diag = (p.mainDiagnosis || '').toLowerCase();
        const isTarget = diag.includes('puberdade') || diag.includes('baixa estatura');
        
        if (!isTarget) return false;

        const hasDoc = MOCK_DOCUMENTS.some(doc => doc.patientId === p.id);
        return !hasDoc;
    });
  }, []);

  // 8. Janela de Atividade (Doses +/- 7 dias + Pendências Antigas)
  const highActivityDoses = useMemo(() => {
      const startRange = new Date();
      startRange.setDate(startRange.getDate() - 7);
      
      const endRange = new Date();
      endRange.setDate(endRange.getDate() + 7);

      return doses.filter(d => {
          const appDate = new Date(d.applicationDate);
          
          // 1. Está dentro da janela de +/- 7 dias?
          const inRange = appDate >= startRange && appDate <= endRange;
          
          // 2. Se for antigo (antes da janela), tem pendência?
          const isOld = appDate < startRange;
          const hasPendingStatus = d.status === DoseStatus.PENDING; // Atrasada é calculado visualmente, mas aqui checamos status base
          const hasPendingPayment = d.paymentStatus !== PaymentStatus.PAID;
          
          // Retorna se estiver na janela OU (for antigo E tiver pendência)
          return inRange || (isOld && (hasPendingStatus || hasPendingPayment));

      }).sort((a, b) => new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime());
  }, [doses]);

  // 9. Próximos Pontos de Contato (Régua de Relacionamento)
  const upcomingContacts = useMemo(() => {
      const contacts: any[] = [];
      const activeTreatments = MOCK_TREATMENTS.filter(t => t.status === TreatmentStatus.ONGOING);

      activeTreatments.forEach(t => {
          const proto = MOCK_PROTOCOLS.find(p => p.id === t.protocolId);
          if (!proto || !proto.milestones || proto.milestones.length === 0) return;

          const startDate = new Date(t.startDate);
          
          proto.milestones.forEach(m => {
              const contactId = `${t.id}_m_${m.day}`;
              
              // Se já foi dispensado/concluído pelo usuário, não exibe mais, independente da data
              if (dismissedContacts.includes(contactId)) return;

              const contactDate = addDays(startDate, m.day);
              const diff = diffInDays(contactDate, TODAY);

              // Exibir contatos futuros OU PASSADOS (atrasados) que não foram dispensados
              // A lógica de "sair da lista" agora é exclusivamente manual (botão OK)
              // Limitamos a 60 dias passados só para não poluir com coisas muito velhas
              if (diff >= -60) {
                  const patient = MOCK_PATIENTS.find(p => p.id === t.patientId);
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
  }, [dismissedContacts]);

  // Helper para Scroll suave
  const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
        <div className="flex gap-2">
            <select className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500">
                <option>Todos</option>
                <option>Últimos 30 dias</option>
                <option>Últimos 7 dias</option>
            </select>
        </div>
      </div>

      {/* KPI Cards / Botões de Navegação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        
        {/* Card Pacientes Ativos -> Navegar para Lista com Filtro */}
        <div 
            onClick={() => navigate('/pacientes', { state: { statusFilter: 'active' } })}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-green-600 transition-colors">Pacientes Ativos</h3>
            <div className="p-2 bg-green-50 rounded-lg">
                <UserCheck className="text-green-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{patientStats.active}</p>
          <p className="text-xs text-slate-400 mt-1">Em acompanhamento</p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-green-500"></div>
        </div>

        {/* Card Pacientes Inativos -> Navegar para Lista com Filtro */}
        <div 
            onClick={() => navigate('/pacientes', { state: { statusFilter: 'inactive' } })}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-gray-600 transition-colors">Pacientes Inativos</h3>
            <div className="p-2 bg-gray-50 rounded-lg">
                <UserX className="text-gray-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{patientStats.inactive}</p>
          <p className="text-xs text-slate-400 mt-1">Sem tratamento vigente</p>
        </div>

        {/* Card Pendência Termo -> Scroll para tabela */}
        <div 
            onClick={() => scrollToSection('section-consent')}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-cyan-600 transition-colors">Termo Pendente</h3>
            <div className="p-2 bg-cyan-50 rounded-lg">
                <FileWarning className="text-cyan-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{patientsMissingConsent.length}</p>
          <p className="text-xs text-slate-400 mt-1">Requer upload</p>
        </div>

        {/* Card Atraso -> Scroll para tabela */}
        <div 
            onClick={() => scrollToSection('section-overdue')}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-red-600 transition-colors">Doses em Atraso</h3>
            <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="text-red-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{overdueDoses.length}</p>
          <p className="text-xs text-slate-400 mt-1">Requer atenção</p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500"></div>
        </div>

        {/* Card Consultas Próximas -> Scroll para tabela */}
        <div 
            onClick={() => scrollToSection('section-consults')}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-purple-600 transition-colors">Agendar Consulta</h3>
            <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="text-purple-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{approachingConsults.length}</p>
          <p className="text-xs text-slate-400 mt-1">Consultas agendadas</p>
        </div>

        {/* Card Aguardando Pesquisa -> Scroll para tabela */}
        <div 
            onClick={() => scrollToSection('section-surveys')}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">Enviar Pesquisa</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
                <MessageCircle className="text-blue-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{pendingSurveys.length}</p>
          <p className="text-xs text-slate-400 mt-1">Status: Enviado</p>
        </div>

        {/* Card NPS Enfermagem -> Scroll para tabela de pesquisas (para resolver pendências) */}
        <div 
            onClick={() => scrollToSection('section-surveys')}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">NPS Enfermagem</h3>
            <div className="p-2 bg-emerald-50 rounded-lg">
                <Trophy className="text-emerald-600" size={20} />
            </div>
          </div>
          <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-slate-800">
                {npsMetrics.score}
              </p>
              <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">NPS</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Base: {npsMetrics.total} respostas</p>
              </div>
          </div>
        </div>
      </div>

      {/* Janela de Atividade (+/- 7 Dias) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/30 flex justify-between items-center">
            <h3 className="font-bold text-amber-900 flex items-center">
                <CalendarRange size={18} className="mr-2" />
                Janela de Atividade (Doses +/- 7 dias)
            </h3>
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-bold">
                {highActivityDoses.length}
            </span>
         </div>
         <div className="overflow-x-auto max-h-[500px]">
             <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0 z-10">
                     <tr>
                         <th className="px-6 py-3">Data</th>
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
                        <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Nenhuma dose programada para este período.</td></tr>
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
                                                    className="p-1 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
                                                    title="Ver Endereço e Entrega"
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
                                     
                                     {/* Edição Inline: Status Dose */}
                                     <td className="px-6 py-4">
                                         <select 
                                            value={dose.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleQuickUpdate(dose.id, 'status', e.target.value)}
                                            className={`text-xs px-2 py-1 rounded-full border-0 font-semibold cursor-pointer focus:ring-2 focus:ring-amber-500 ${getStatusColor(dose.status)}`}
                                         >
                                             {Object.values(DoseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                         </select>
                                     </td>

                                     {/* Edição Inline: Pagamento */}
                                     <td className="px-6 py-4">
                                         <select
                                            value={dose.paymentStatus}
                                            disabled={dose.status === DoseStatus.NOT_ACCEPTED}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleQuickUpdate(dose.id, 'paymentStatus', e.target.value)}
                                            className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer focus:ring-2 focus:ring-amber-500 ${getStatusColor(dose.paymentStatus)} ${dose.status === DoseStatus.NOT_ACCEPTED ? 'opacity-40 cursor-not-allowed' : ''}`}
                                         >
                                            {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                         </select>
                                     </td>

                                     {/* Botão de Enfermagem (Sempre Visível) para Edição Completa */}
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
                                             <Edit size={14} className="mr-1"/> Editar
                                         </button>
                                     </td>
                                 </tr>
                             );
                         })
                     )}
                 </tbody>
             </table>
         </div>
      </div>

      {/* Próximas Mensagens / Régua de Relacionamento */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/30 flex justify-between items-center">
            <h3 className="font-bold text-indigo-900 flex items-center">
                <MessageSquare size={18} className="mr-2" />
                Próximas Mensagens
            </h3>
            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-bold">
                {upcomingContacts.length}
            </span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                        <th className="px-6 py-3">Data Prevista</th>
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
                        upcomingContacts.map(contact => (
                            <tr 
                                key={contact.id} 
                                onClick={() => handleOpenMessageModal(contact)}
                                className="hover:bg-indigo-50/20 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4 font-bold text-slate-800">
                                    {formatDate(contact.date.toISOString())}
                                    <span className="block text-xs font-normal text-slate-500">
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
        </div>
      </div>

      {/* Middle Section: Diagnostics & Pending Surveys */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1: Pacientes por Diagnóstico */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-1">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                <Activity size={18} className="mr-2 text-pink-600" />
                Pacientes Ativos por Diagnóstico
            </h3>
            <div className="space-y-4">
                {patientsByDiagnosis.map((item, idx) => (
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
                            <div 
                                className={`h-2.5 rounded-full`}
                                style={{ width: `${(item.value / MOCK_PATIENTS.filter(p=>p.active).length) * 100}%` }}
                            >
                                <div className={`h-full w-full ${getDiagnosisColor(item.name).split(' ')[0]}`}></div>
                            </div>
                        </div>
                    </div>
                ))}
                {patientsByDiagnosis.length === 0 && (
                    <div className="text-center text-slate-400 py-4">Nenhum paciente ativo.</div>
                )}
            </div>
        </div>

        {/* Col 2: Aguardando Resposta da Pesquisa */}
        <div id="section-surveys" className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden lg:col-span-2">
            <div className="px-6 py-4 border-b border-slate-100 bg-blue-50/30 flex justify-between items-center">
                <h3 className="font-bold text-blue-900 flex items-center">
                    <MessageCircle size={18} className="mr-2" />
                    Aguardando Resposta da Pesquisa
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
                    {pendingSurveys.length}
                </span>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
                <table id="table-surveys" className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Paciente</th>
                            <th className="px-6 py-3">Responsável / Contato</th>
                            <th className="px-6 py-3 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pendingSurveys.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Nenhuma pesquisa pendente.</td></tr>
                        ) : (
                            pendingSurveys.map(dose => {
                                const patient = getPatientByTreatmentId(dose.treatmentId);
                                return (
                                    <tr 
                                        key={dose.id} 
                                        onClick={() => navigate(`/tratamento/${dose.treatmentId}`, { state: { editDoseId: dose.id } })}
                                        className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                                    >
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
            </div>
        </div>
      </div>

      {/* Lista de Pendências de Documentos (NOVA) */}
      <div id="section-consent" className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-cyan-50/30 flex justify-between items-center">
            <h3 className="font-bold text-cyan-900 flex items-center">
                <FileWarning size={18} className="mr-2" />
                Pendência: Termo de Consentimento
            </h3>
            <span className="bg-cyan-100 text-cyan-800 text-xs px-2 py-1 rounded-full font-bold">
                {patientsMissingConsent.length}
            </span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                        <th className="px-6 py-3">Paciente</th>
                        <th className="px-6 py-3">Diagnóstico</th>
                        <th className="px-6 py-3">Responsável</th>
                        <th className="px-6 py-3 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {patientsMissingConsent.length === 0 ? (
                         <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Todos os pacientes possuem termo anexado.</td></tr>
                    ) : (
                        patientsMissingConsent.map(patient => (
                            <tr 
                                key={patient.id} 
                                onClick={() => navigate(`/pacientes/${patient.id}`)}
                                className="hover:bg-cyan-50/20 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4 font-medium text-slate-800">
                                    {patient.fullName}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getDiagnosisColor(patient.mainDiagnosis)}`}>
                                        {patient.mainDiagnosis}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                    {patient.guardian.fullName}
                                    <div className="text-xs text-slate-400">{patient.guardian.phonePrimary}</div>
                                </td>
                                 <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center text-cyan-600 hover:text-cyan-800 text-xs font-bold">
                                        <UploadCloud size={14} className="mr-1"/> Anexar Termo
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Tabela de Consultas Próximas */}
      <div id="section-consults" className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-purple-50/30 flex justify-between items-center">
            <h3 className="font-bold text-purple-900 flex items-center">
                <Calendar size={18} className="mr-2" />
                Agendar Consulta
            </h3>
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-bold">
                {approachingConsults.length}
            </span>
        </div>
        <div className="overflow-x-auto">
            <table id="table-consults" className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                        <th className="px-6 py-3">Data Agendada</th>
                        <th className="px-6 py-3">Faltam</th>
                        <th className="px-6 py-3">Paciente</th>
                        <th className="px-6 py-3">Responsável</th>
                        <th className="px-6 py-3 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {approachingConsults.length === 0 ? (
                         <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Nenhuma consulta próxima agendada.</td></tr>
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
                                <tr 
                                    key={dose.id} 
                                    onClick={() => navigate(`/tratamento/${dose.treatmentId}`)}
                                    className="hover:bg-purple-50/20 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 font-bold text-purple-800">
                                        {hasDate ? formatDate(dose.consultationDate) : <span className="text-orange-600 animate-pulse">Pendente / A Agendar</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        {hasDate ? (
                                            <span className="flex items-center text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded w-fit">
                                                <Clock size={12} className="mr-1"/>
                                                {daysLeft} dias
                                            </span>
                                        ) : (
                                            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">Agendar</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {patient?.fullName}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {patient?.guardian.fullName}
                                        <div className="text-xs text-slate-400">{patient?.guardian.phonePrimary}</div>
                                    </td>
                                     <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center text-slate-400 hover:text-pink-600 transition-colors">
                                            Ver <ChevronRight size={16} className="ml-1"/>
                                        </span>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Tabela de Doses em Atraso */}
      <div id="section-overdue" className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-red-50/30 flex justify-between items-center">
            <h3 className="font-bold text-red-900 flex items-center">
                <AlertCircle size={18} className="mr-2" />
                Doses em Atraso
            </h3>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">
                {overdueDoses.length}
            </span>
        </div>
        <div className="overflow-x-auto">
            <table id="table-overdue" className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                        <th className="px-6 py-3">Paciente</th>
                        <th className="px-6 py-3">Contato</th>
                        <th className="px-6 py-3">Atraso (Últ. Dose)</th>
                        <th className="px-6 py-3 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {overdueDoses.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhuma dose atrasada.</td></tr>
                    ) : (
                        overdueDoses.map(dose => {
                            const patient = getPatient(dose.treatmentId);
                            // Recalcular dias para exibição na tabela
                            const nextDate = new Date(dose.calculatedNextDate);
                            const daysDiff = diffInDays(nextDate, TODAY);

                            return (
                                <tr 
                                    key={dose.id} 
                                    onClick={() => navigate(`/tratamento/${dose.treatmentId}`)}
                                    className="hover:bg-red-50/20 cursor-pointer transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{patient?.fullName || 'Desconhecido'}</div>
                                        <div className="text-xs text-slate-500">{patient?.mainDiagnosis}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700">{patient?.guardian.fullName}</div>
                                        <div className="text-xs font-mono text-slate-500">{patient?.guardian.phonePrimary}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-xs">
                                            {Math.abs(daysDiff)} dias
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center text-slate-400 group-hover:text-pink-600 transition-colors">
                                            Abrir <ChevronRight size={16} className="ml-1"/>
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODAL DE ENDEREÇO */}
      {addressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden relative">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="font-bold text-slate-800">Endereço de Entrega</h3>
                          <p className="text-xs text-slate-500">{selectedPatientName}</p>
                      </div>
                      <button onClick={() => setAddressModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="p-6">
                      <div className="mb-4">
                         <p className="text-xs uppercase font-bold text-slate-400 mb-1">Responsável</p>
                         <p className="font-bold text-slate-800 text-lg">{selectedGuardianName}</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 font-mono text-sm text-slate-700 break-words">
                          {selectedAddress}
                      </div>
                      
                      <div className="flex gap-2 flex-col">
                        <button 
                            onClick={handleCopyAddress}
                            className={`w-full flex items-center justify-center py-2.5 rounded-lg font-medium transition-colors ${isCopied ? 'bg-slate-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                            {isCopied ? <Check size={18} className="mr-2"/> : <Copy size={18} className="mr-2"/>}
                            {isCopied ? 'Endereço Copiado!' : 'Copiar Endereço'}
                        </button>

                        <label className={`mt-2 flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${isDelivered ? 'bg-green-100 border-green-300 text-green-800' : 'bg-green-50 border-green-200 hover:bg-green-100'}`}>
                           <div className="flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={isDelivered}
                                    onChange={handleConfirmDelivery}
                                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="ml-3 font-bold text-sm">Entregue (Confirmar Pagamento)</span>
                           </div>
                           {isDelivered && <CheckCircle2 size={20} className="text-green-600 animate-in zoom-in" />}
                        </label>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL DE EDIÇÃO COMPLETA DE DOSE (Via Ícone Enfermeira) */}
      {doseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center">
                            <Edit size={20} className="mr-2 text-pink-600"/>
                            Editar Detalhes da Dose
                        </h3>
                    </div>
                    <button onClick={() => setDoseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSaveDoseFull} className="p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Seção 1: Dados da Dose */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data da Aplicação</label>
                                <input 
                                    type="date" 
                                    required
                                    value={editDoseDate}
                                    onChange={(e) => setEditDoseDate(e.target.value)}
                                    className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lote / Validade</label>
                                <input 
                                    type="text" 
                                    value={editDoseLot}
                                    onChange={(e) => setEditDoseLot(e.target.value)}
                                    className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status da Dose</label>
                                <select 
                                    required
                                    value={editDoseStatus}
                                    onChange={(e) => setEditDoseStatus(e.target.value as DoseStatus)}
                                    className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {Object.values(DoseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Situação Pagamento</label>
                                <select 
                                    required={editDoseStatus !== DoseStatus.NOT_ACCEPTED}
                                    disabled={editDoseStatus === DoseStatus.NOT_ACCEPTED}
                                    value={editDosePayment}
                                    onChange={(e) => setEditDosePayment(e.target.value as PaymentStatus)}
                                    className={`w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 ${editDoseStatus === DoseStatus.NOT_ACCEPTED ? 'bg-slate-100 opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="lg:col-span-4 flex items-center mt-2">
                                <input 
                                    id="modalIsLast" 
                                    type="checkbox" 
                                    checked={editIsLast}
                                    onChange={(e) => setEditIsLast(e.target.checked)}
                                    className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500" 
                                />
                                <label htmlFor="modalIsLast" className="ml-2 text-sm font-medium text-slate-900">Esta é a última dose antes da consulta?</label>
                            </div>
                        </div>

                        {/* Seção 2: Acompanhamento */}
                        <div>
                            <h4 className="font-bold text-slate-700 mb-3 flex items-center text-sm uppercase tracking-wide">
                                <UserCheck size={16} className="mr-2 text-pink-600"/>
                                Acompanhamento e Satisfação
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">1. Enfermeira</label>
                                    <select 
                                        required
                                        value={editNurse}
                                        onChange={e => setEditNurse(e.target.value)}
                                        className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        <option value="yes">Sim</option>
                                        <option value="no">Não</option>
                                    </select>
                                </div>
                                
                                <div className={`md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 ${editNurse !== 'yes' ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">2. Pesquisa</label>
                                        <select 
                                            value={editSurveyStatus}
                                            onChange={e => setEditSurveyStatus(e.target.value as SurveyStatus)}
                                            className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                        >
                                            <option value="" disabled>Selecione...</option>
                                            {Object.values(SurveyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 flex items-end gap-2">
                                        <div className={`flex-1 transition-opacity ${editSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40 pointer-events-none' : ''}`}>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">3. Nota</label>
                                            <input 
                                                type="range" min="0" max="10" step="1"
                                                value={editScore}
                                                onChange={e => setEditScore(Number(e.target.value))}
                                                className="w-full accent-pink-600"
                                                disabled={editSurveyStatus !== SurveyStatus.ANSWERED}
                                            />
                                        </div>
                                        <span className={`w-10 h-10 flex items-center justify-center bg-white border border-slate-200 font-bold rounded-lg text-slate-700 mb-1 ${editSurveyStatus !== SurveyStatus.ANSWERED ? 'opacity-40' : ''}`}>
                                            {editScore}
                                        </span>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">4. Comentário</label>
                                        <input 
                                            type="text"
                                            value={editComment}
                                            onChange={e => setEditComment(e.target.value)}
                                            placeholder="Observação sobre o atendimento..."
                                            className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-6">
                        <button 
                            type="button" 
                            onClick={() => setDoseModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg mr-2"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSavingDose}
                            className="flex items-center px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {isSavingDose ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Save size={18} className="mr-2" />}
                            {isSavingDose ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* MODAL DE DETALHES DA MENSAGEM */}
      {messageModalOpen && selectedContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden relative">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                      <div>
                          <h3 className="font-bold text-indigo-900 flex items-center">
                              <MessageSquare size={20} className="mr-2"/>
                              Detalhes da Mensagem
                          </h3>
                      </div>
                      <button onClick={() => setMessageModalOpen(false)} className="text-indigo-400 hover:text-indigo-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      
                      {/* Área da Mensagem */}
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ação / Mensagem</label>
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative group">
                              <p className="text-slate-800 font-medium text-sm pr-8 leading-relaxed">
                                  {selectedContact.message}
                              </p>
                              <button 
                                  onClick={handleCopyMessage}
                                  className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Copiar mensagem"
                              >
                                  {isMessageCopied ? <Check size={16} /> : <Copy size={16} />}
                              </button>
                          </div>
                          {isMessageCopied && <p className="text-xs text-green-600 mt-1 font-bold animate-pulse">Mensagem copiada!</p>}
                      </div>

                      {/* Dados do Paciente e Contato */}
                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center gap-3 mb-4">
                              <div className="bg-pink-100 p-2 rounded-full text-pink-600">
                                  <User size={20} />
                              </div>
                              <div>
                                  <p className="text-xs text-slate-500">Paciente</p>
                                  <p className="font-bold text-slate-800">{selectedContact.patientName}</p>
                              </div>
                          </div>
                          
                          <div className="border-t border-slate-100 pt-3">
                               <div className="flex justify-between items-center">
                                   <div>
                                       <p className="text-xs text-slate-500 mb-1">Responsável</p>
                                       <p className="font-medium text-slate-800">{selectedContact.patientGuardian}</p>
                                   </div>
                                   <div className="text-right">
                                       <p className="text-xs text-slate-500 mb-1">Telefone</p>
                                       <button 
                                          onClick={() => {
                                              navigator.clipboard.writeText(selectedContact.patientPhone);
                                              // Optional: toast feedback for phone
                                          }}
                                          className="flex items-center font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                          title="Copiar telefone"
                                       >
                                           <Phone size={14} className="mr-1.5" />
                                           {selectedContact.patientPhone}
                                       </button>
                                   </div>
                               </div>
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                              onClick={() => {
                                  setMessageModalOpen(false);
                                  navigate(`/tratamento/${selectedContact.treatmentId}`);
                              }}
                              className="flex-1 flex items-center justify-center py-2.5 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                          >
                              <ExternalLink size={16} className="mr-2" />
                              Ir para Tratamento
                          </button>
                          <button 
                              onClick={() => handleDismissContact(null, selectedContact.id)}
                              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 shadow-lg shadow-green-200 transition-colors flex justify-center items-center"
                          >
                              <CheckCircle2 size={18} className="mr-2" />
                              Concluir / Enviado
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;
