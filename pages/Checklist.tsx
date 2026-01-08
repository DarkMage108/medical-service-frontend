
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  treatmentsApi, patientsApi, protocolsApi, dosesApi, documentsApi, diagnosesApi
} from '../services/api';
import {
  ProtocolCategory, TreatmentStatus, DoseStatus, PaymentStatus, SurveyStatus, ConsentDocument, Treatment, PatientFull, Protocol, Dose, Diagnosis
} from '../types';
import {
  ListTodo, CheckCircle2, AlertCircle, XCircle, ArrowRight, FileText, CreditCard, Truck, Syringe, MessageCircle, X, Save, UploadCloud, Loader2, ExternalLink, Star, Clock, RefreshCw
} from 'lucide-react';
import { getDiagnosisColor, formatDate, PAYMENT_STATUS_LABELS } from '../constants';

type StepStatus = 'OK' | 'PENDING' | 'NA';
type StepType = 'consent' | 'payment' | 'delivery' | 'application' | 'survey';

interface ChecklistItem {
  treatmentId: string;
  patientId: string;
  doseId?: string;
  patientName: string;
  guardianName: string;
  phone: string;
  diagnosis: string;
  protocolName: string;
  steps: Record<StepType, StepStatus>;
  isComplete: boolean;
}

interface SelectedStepInfo {
  item: ChecklistItem;
  step: StepType;
}

const Checklist: React.FC = () => {
  const navigate = useNavigate();
  const [selectedStepInfo, setSelectedStepInfo] = useState<SelectedStepInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualScore, setManualScore] = useState<number>(10);

  // Data states
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [documents, setDocuments] = useState<ConsentDocument[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [manualComment, setManualComment] = useState<string>('');
  const [applicationDate, setApplicationDate] = useState<string>('');

  // Reset score, comment, and application date when selecting new item
  useEffect(() => {
    if (selectedStepInfo) {
      setManualScore(10);
      setManualComment('');

      // Set application date based on dose's scheduled date
      if (selectedStepInfo.item.doseId) {
        const dose = doses.find(d => d.id === selectedStepInfo.item.doseId);
        if (dose?.applicationDate) {
          setApplicationDate(new Date(dose.applicationDate).toISOString().split('T')[0]);
        } else {
          setApplicationDate(new Date().toISOString().split('T')[0]);
        }
      } else {
        setApplicationDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [selectedStepInfo, doses]);

  // Load data from API
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [treatmentsRes, patientsRes, protocolsRes, dosesRes, documentsRes, diagnosesRes] = await Promise.all([
        treatmentsApi.getAll({ limit: 100 }),
        patientsApi.getAll({ limit: 100 }),
        protocolsApi.getAll(),
        dosesApi.getAll({ limit: 500 }),
        documentsApi.getAll(),
        diagnosesApi.getAll()
      ]);

      setTreatments(treatmentsRes.data || []);
      setPatients(patientsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setDoses(dosesRes.data || []);
      setDocuments(documentsRes.data || []);
      setDiagnoses(diagnosesRes.data || []);
    } catch (err: any) {
      console.error('Error loading checklist data:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const checklistItems: ChecklistItem[] = useMemo(() => {
    const items: ChecklistItem[] = [];

    // Filter Medication Treatments
    const medTreatments = treatments.filter(t => {
      const proto = protocols.find(p => p.id === t.protocolId);
      return proto?.category === ProtocolCategory.MEDICATION || proto?.category === 'MEDICATION';
    });

    medTreatments.forEach(treatment => {
      const patient = patients.find(p => p.id === treatment.patientId);
      const protocol = protocols.find(p => p.id === treatment.protocolId);
      if (!patient || !protocol) return;

      // Filter out finished/refused treatments
      const invalidStatuses = [TreatmentStatus.FINISHED, TreatmentStatus.REFUSED];
      if (invalidStatuses.includes(treatment.status as TreatmentStatus)) return;

      // Get doses for this treatment
      const treatmentDoses = doses.filter(d => d.treatmentId === treatment.id)
        .sort((a, b) => new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime());

      const activeDose = treatmentDoses.find(d =>
        d.status !== DoseStatus.APPLIED ||
        d.paymentStatus !== PaymentStatus.PAID ||
        (d.nurse && d.surveyStatus !== SurveyStatus.ANSWERED && d.surveyStatus !== SurveyStatus.NOT_SENT)
      ) || treatmentDoses[treatmentDoses.length - 1];

      const steps: Record<StepType, StepStatus> = {
        consent: 'NA',
        payment: 'PENDING',
        delivery: 'PENDING',
        application: 'PENDING',
        survey: 'PENDING'
      };

      // 1. Consent term check - uses diagnosis configuration
      const diagnosisConfig = diagnoses.find(d => d.name === patient.mainDiagnosis);
      const requiresConsent = diagnosisConfig?.requiresConsent ?? false;

      if (requiresConsent) {
        const hasDoc = documents.some(d => d.patientId === patient.id);
        steps.consent = hasDoc ? 'OK' : 'PENDING';
      } else {
        steps.consent = 'NA';
      }

      // Dose Logic
      if (activeDose) {
        // Check if there's no purchase (purchased === false)
        const noPurchase = activeDose.purchased === false;

        if (noPurchase) {
          // No purchase means payment and delivery are not applicable
          steps.payment = 'NA';
          steps.delivery = 'NA';
        } else {
          const isPaid = activeDose.paymentStatus === PaymentStatus.PAID;
          steps.payment = isPaid ? 'OK' : 'PENDING';

          // Delivery status now uses the dedicated deliveryStatus field
          if (activeDose.deliveryStatus === 'delivered') {
            steps.delivery = 'OK';
          } else if (activeDose.deliveryStatus === 'waiting') {
            steps.delivery = 'PENDING';
          } else {
            steps.delivery = 'PENDING';
          }
        }

        const isApplied = activeDose.status === DoseStatus.APPLIED || activeDose.status === DoseStatus.NOT_ACCEPTED;
        steps.application = isApplied ? 'OK' : 'PENDING';

        // Survey logic: only applicable if there's a nurse
        if (!activeDose.nurse) {
          // Caso A: Sem enfermeira -> Não aplicável
          steps.survey = 'NA';
        } else if (activeDose.surveyStatus === SurveyStatus.ANSWERED) {
          // Caso C: Com enfermeira + resposta registrada -> Concluído/Verde
          steps.survey = 'OK';
        } else {
          // Caso B: Com enfermeira + sem resposta -> Pendente
          steps.survey = 'PENDING';
        }
      }

      const isComplete = Object.values(steps).every(s => s === 'OK' || s === 'NA');

      if (!isComplete) {
        items.push({
          treatmentId: treatment.id,
          patientId: patient.id,
          doseId: activeDose?.id,
          patientName: patient.fullName,
          guardianName: patient.guardian?.fullName || '',
          phone: patient.guardian?.phonePrimary || '',
          diagnosis: patient.mainDiagnosis || '',
          protocolName: protocol.name,
          steps,
          isComplete
        });
      }
    });

    return items;
  }, [treatments, patients, protocols, doses, documents, diagnoses]);

  // --- DRAWER ACTIONS ---

  const handleQuickUpdateDose = async (field: Partial<Dose>) => {
    if (!selectedStepInfo?.item.doseId) return;
    setIsProcessing(true);

    try {
      await dosesApi.update(selectedStepInfo.item.doseId, field);
      await loadData(); // Refresh data
    } catch (err: any) {
      console.error('Error updating dose:', err);
      alert('Erro ao atualizar dose: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setSelectedStepInfo(null);
    }
  };

  const handleMarkAsApplied = async () => {
    if (!selectedStepInfo?.item.doseId) return;
    if (!applicationDate) {
      alert('Por favor, informe a data de aplicação');
      return;
    }

    setIsProcessing(true);

    try {
      await dosesApi.update(selectedStepInfo.item.doseId, {
        status: DoseStatus.APPLIED,
        applicationDate: new Date(applicationDate).toISOString()
      });
      await loadData();
    } catch (err: any) {
      console.error('Error marking dose as applied:', err);
      alert('Erro ao marcar dose como aplicada: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setSelectedStepInfo(null);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedStepInfo?.item.doseId) return;
    setIsProcessing(true);

    try {
      await dosesApi.update(selectedStepInfo.item.doseId, { paymentStatus: PaymentStatus.PAID });
      await loadData();
    } catch (err: any) {
      console.error('Error confirming delivery:', err);
      alert('Erro ao confirmar entrega: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsProcessing(false);
      setSelectedStepInfo(null);
    }
  };

  const handleUploadTerm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && selectedStepInfo) {
      setIsProcessing(true);

      try {
        const file = e.target.files[0];
        await patientsApi.uploadDocument(selectedStepInfo.item.patientId, {
          fileName: file.name,
          fileType: file.name.endsWith('.pdf') ? 'pdf' : 'docx',
          fileUrl: `/uploads/${selectedStepInfo.item.patientId}/${file.name}`
        });
        await loadData();
      } catch (err: any) {
        console.error('Error uploading document:', err);
        alert('Erro ao enviar documento: ' + (err.message || 'Erro desconhecido'));
      } finally {
        setIsProcessing(false);
        setSelectedStepInfo(null);
      }
    }
  };

  const renderStep = (item: ChecklistItem, step: StepType, icon: React.ReactNode, label: string) => {
    const status = item.steps[step];
    let bgClass = '';
    let iconColor = '';
    let borderColor = '';

    if (status === 'OK') {
      bgClass = 'bg-green-50 hover:bg-green-100';
      iconColor = 'text-green-600';
      borderColor = 'border-green-200';
    } else if (status === 'PENDING') {
      bgClass = 'bg-white hover:bg-red-50';
      iconColor = 'text-red-500';
      borderColor = 'border-red-200';
    } else {
      bgClass = 'bg-slate-50 opacity-50 cursor-not-allowed';
      iconColor = 'text-slate-400';
      borderColor = 'border-slate-100';
    }

    return (
      <button
        onClick={() => {
          if (status !== 'NA') setSelectedStepInfo({ item, step });
        }}
        disabled={status === 'NA'}
        className={`flex flex-col items-center justify-center py-1 px-1 rounded-md border ${borderColor} ${bgClass} w-full transition-all relative group h-[48px]`}
      >
        <div className={`mb-0.5 ${iconColor}`}>
          {status === 'OK' ? <CheckCircle2 size={13} /> : (status === 'NA' ? <XCircle size={13} /> : <AlertCircle size={13} />)}
        </div>
        <div className={`text-[8px] uppercase font-bold tracking-wide text-center leading-tight ${status === 'NA' ? 'text-slate-400' : 'text-slate-700'}`}>
          {label}
        </div>
        {status === 'PENDING' && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></div>
        )}
      </button>
    );
  };

  const Connector = ({ status }: { status: StepStatus }) => (
    <div className={`h-[1px] w-2 md:w-4 flex-shrink-0 ${status === 'OK' ? 'bg-green-300' : 'bg-slate-200'}`}></div>
  );

  // --- DRAWER CONTENT RENDERER ---
  const renderDrawerContent = () => {
    if (!selectedStepInfo) return null;
    const { item, step } = selectedStepInfo;
    const status = item.steps[step];

    const header = (
      <div className="mb-6">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase mb-2 inline-block ${status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          Status: {status === 'OK' ? 'Concluido' : 'Pendente'}
        </span>
        <h2 className="text-xl font-bold text-slate-800">{item.patientName}</h2>
        <p className="text-sm text-slate-500">{item.protocolName}</p>
      </div>
    );

    switch (step) {
      case 'payment':
        return (
          <div>
            {header}
            <h3 className="font-bold text-slate-700 mb-3 flex items-center"><CreditCard size={18} className="mr-2" /> Status Financeiro</h3>

            {!item.doseId ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">
                <p className="font-bold flex items-center"><AlertCircle size={16} className="mr-2" /> Nenhuma dose ativa</p>
                <p className="mt-1">Nao ha doses geradas para este tratamento ainda. Acesse a ficha do tratamento para criar a primeira dose.</p>
                <button
                  onClick={() => navigate(`/tratamento/${item.treatmentId}`)}
                  className="mt-3 text-yellow-700 underline text-xs font-bold"
                >
                  Ir para Tratamento
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">Atualize a situacao do pagamento da dose atual.</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    PaymentStatus.WAITING_PIX,
                    PaymentStatus.WAITING_CARD,
                    PaymentStatus.WAITING_BOLETO,
                    PaymentStatus.PAID
                  ].map(st => (
                    <button
                      key={st}
                      onClick={() => handleQuickUpdateDose({ paymentStatus: st })}
                      disabled={isProcessing}
                      className="text-left px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-pink-300 text-slate-700 font-medium text-sm transition-all shadow-sm"
                    >
                      {PAYMENT_STATUS_LABELS[st]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case 'delivery':
        return (
          <div>
            {header}
            <h3 className="font-bold text-slate-700 mb-3 flex items-center"><Truck size={18} className="mr-2" /> Logistica / Entrega</h3>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
              <p className="text-sm text-orange-800 mb-1 font-bold">Confirmacao de Entrega</p>
              <p className="text-xs text-orange-700">Ao confirmar a entrega, o status financeiro sera automaticamente atualizado para <b>PAGO</b> se estiver aguardando.</p>
            </div>
            <button
              onClick={handleConfirmDelivery}
              disabled={isProcessing || status === 'OK' || !item.doseId}
              className="w-full flex items-center justify-center bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold shadow-md shadow-green-200 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
              Confirmar Entrega Realizada
            </button>
          </div>
        );

      case 'consent':
        return (
          <div>
            {header}
            <h3 className="font-bold text-slate-700 mb-3 flex items-center"><FileText size={18} className="mr-2" /> Termo de Consentimento</h3>
            {status === 'OK' ? (
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-green-700 font-medium flex items-center">
                <CheckCircle2 size={20} className="mr-2" /> Termo ja anexado.
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-pink-50 hover:border-pink-300 transition-all">
                {isProcessing ? (
                  <Loader2 className="animate-spin text-pink-600" />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 font-medium">Clique para enviar PDF</p>
                  </>
                )}
                <input type="file" className="hidden" accept=".pdf" onChange={handleUploadTerm} disabled={isProcessing} />
              </label>
            )}
          </div>
        );

      case 'application':
        return (
          <div>
            {header}
            <h3 className="font-bold text-slate-700 mb-3 flex items-center"><Syringe size={18} className="mr-2" /> Aplicacao da Dose</h3>

            {!item.doseId ? (
              <div className="text-slate-500 italic text-sm p-4 bg-slate-50 rounded border border-slate-100">
                Crie uma dose primeiro para registrar a aplicacao.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Application Date Field */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Data de Aplicacao <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={applicationDate}
                    onChange={(e) => setApplicationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white"
                  />
                  <p className="text-xs text-slate-600 mt-2 italic">
                    Confirme ou ajuste a data real da aplicacao
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleMarkAsApplied}
                    disabled={isProcessing || !applicationDate}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Salvando...' : 'Marcar como APLICADA'}
                  </button>
                  <button
                    onClick={() => handleQuickUpdateDose({ status: DoseStatus.PENDING })}
                    disabled={isProcessing}
                    className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                  >
                    Marcar como Pendente
                  </button>
                  <button
                    onClick={() => handleQuickUpdateDose({ status: DoseStatus.NOT_ACCEPTED })}
                    disabled={isProcessing}
                    className="w-full py-3 bg-slate-100 text-slate-500 rounded-lg font-medium hover:bg-slate-200"
                  >
                    Dose Nao Realizada
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'survey': {
        const currentDose = item.doseId ? doses.find(d => d.id === item.doseId) : null;
        const hasNurse = currentDose?.nurse || false;
        const isAnswered = currentDose?.surveyStatus === SurveyStatus.ANSWERED;

        return (
          <div>
            {header}
            <h3 className="font-bold text-slate-700 mb-3 flex items-center"><MessageCircle size={18} className="mr-2" /> Pesquisa de Satisfacao</h3>

            {/* Caso A: Sem enfermeira */}
            {!hasNurse && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-600">
                <p className="font-medium flex items-center">
                  <XCircle size={16} className="mr-2" />
                  Pesquisa nao aplicavel
                </p>
                <p className="text-xs mt-2">Esta dose nao teve acompanhamento de enfermeira.</p>
              </div>
            )}

            {/* Caso C: Com enfermeira + resposta registrada */}
            {hasNurse && isAnswered && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-700 font-bold flex items-center mb-3">
                  <CheckCircle2 size={18} className="mr-2" />
                  Resposta Registrada
                </p>
                <div className="bg-white p-3 rounded-lg border border-green-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-600">Nota:</span>
                    <span className="text-lg font-bold text-green-600 flex items-center">
                      <Star size={16} className="mr-1 fill-green-600" />
                      {currentDose?.surveyScore || '-'}/10
                    </span>
                  </div>
                  {currentDose?.surveyComment && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-xs font-medium text-slate-600 block mb-1">Comentário:</span>
                      <p className="text-sm text-slate-700 italic">{currentDose.surveyComment}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Caso B: Com enfermeira + sem resposta */}
            {hasNurse && !isAnswered && (
              <>
                <p className="text-xs text-slate-500 mb-4">Registre a avaliacao da enfermeira abaixo:</p>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700 flex items-center"><Star size={16} className="text-pink-500 mr-2" /> Nota</span>
                    <span className="text-2xl font-bold text-pink-600 bg-white px-3 py-1 rounded-lg border border-pink-100 shadow-sm">{manualScore}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={manualScore}
                    onChange={(e) => setManualScore(Number(e.target.value))}
                    className="w-full accent-pink-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium uppercase">
                    <span>1 (Ruim)</span>
                    <span>10 (Excelente)</span>
                  </div>

                  {/* Comment field */}
                  <div className="mt-4">
                    <label className="text-xs font-bold text-slate-600 mb-1 block">Comentario (opcional)</label>
                    <textarea
                      value={manualComment}
                      onChange={(e) => setManualComment(e.target.value)}
                      placeholder="Observacao sobre o atendimento..."
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handleQuickUpdateDose({ surveyStatus: SurveyStatus.ANSWERED, surveyScore: manualScore, surveyComment: manualComment || undefined })}
                    disabled={isProcessing || !item.doseId}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-50"
                  >
                    Registrar Resposta
                  </button>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => handleQuickUpdateDose({ surveyStatus: SurveyStatus.SENT })} disabled={isProcessing || !item.doseId} className="w-full py-2.5 bg-white text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 text-xs">
                      Marcar Enviado
                    </button>
                    <button onClick={() => handleQuickUpdateDose({ surveyStatus: SurveyStatus.NOT_SENT })} disabled={isProcessing || !item.doseId} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 text-xs">
                      Nao Enviar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }

      default:
        return <div className="text-slate-500">Selecione uma acao.</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando checklist...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto text-red-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Erro ao carregar dados</h3>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ListTodo size={28} className="mr-3 text-pink-600" />
            Checklist de Tratamentos
          </h1>
          <p className="text-slate-500 mt-1">Acompanhamento passo a passo. Clique nos itens para acao rapida.</p>
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

      <div className="space-y-4">
        {checklistItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 size={48} className="mx-auto text-green-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Tudo em dia!</h3>
            <p className="text-slate-500">Nao ha tratamentos pendentes no checklist no momento.</p>
          </div>
        ) : (
          checklistItems.map(item => (
            <div key={item.treatmentId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800 text-base">{item.patientName}</h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase ${getDiagnosisColor(item.diagnosis)}`}>
                      {item.diagnosis}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center">
                    <Pill size={10} className="mr-1" /> {item.protocolName}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/tratamento/${item.treatmentId}`)}
                  className="flex items-center text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg hover:bg-pink-100 transition-colors self-start md:self-auto"
                >
                  Abrir Ficha <ArrowRight size={14} className="ml-1" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="p-4 overflow-x-auto">
                <div className="flex items-center min-w-[600px] gap-1">
                  <div className="flex-1">
                    {renderStep(item, 'consent', <FileText />, 'Termo')}
                  </div>
                  <Connector status={item.steps.consent} />

                  <div className="flex-1">
                    {renderStep(item, 'payment', <CreditCard />, 'Pagamento')}
                  </div>
                  <Connector status={item.steps.payment} />

                  <div className="flex-1">
                    {renderStep(item, 'delivery', <Truck />, 'Entrega')}
                  </div>
                  <Connector status={item.steps.delivery} />

                  <div className="flex-1">
                    {renderStep(item, 'application', <Syringe />, 'Aplicacao')}
                  </div>
                  <Connector status={item.steps.application} />

                  <div className="flex-1">
                    {renderStep(item, 'survey', <MessageCircle />, 'Pesquisa')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- RIGHT DRAWER (POP-UP) --- */}
      {selectedStepInfo && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSelectedStepInfo(null)}
          ></div>

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out border-l border-slate-200 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Acao Rapida</h3>
              <button onClick={() => setSelectedStepInfo(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {renderDrawerContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Checklist;
