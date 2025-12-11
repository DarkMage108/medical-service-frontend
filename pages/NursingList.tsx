import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  treatmentsApi, patientsApi, protocolsApi, dosesApi
} from '../services/api';
import {
  ProtocolCategory, TreatmentStatus, DoseStatus, SurveyStatus, Treatment, PatientFull, Protocol, Dose
} from '../types';
import {
  Syringe, User, Phone, MapPin, Calendar, Clock, Star, RefreshCw, Loader2, AlertCircle, CheckCircle2, XCircle, Search, Trophy
} from 'lucide-react';
import { formatDate } from '../constants';
import SectionCard from '../components/ui/SectionCard';
import Modal from '../components/ui/Modal';

interface NursingItem {
  doseId: string;
  dose: Dose;
  treatmentId: string;
  patientId: string;
  patientName: string;
  guardianName: string;
  guardianRelationship?: string;
  phone: string;
  address: string;
  cep: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: DoseStatus;
  lotNumber?: string;
  expiryDate?: string;
  surveyScore?: number;
  surveyComment?: string;
  protocolName: string;
}

// Status label mapping (Pendente -> Agendado)
const STATUS_LABELS: Record<DoseStatus, string> = {
  [DoseStatus.PENDING]: 'Agendado',
  [DoseStatus.APPLIED]: 'Aplicado',
  [DoseStatus.NOT_ACCEPTED]: 'Recusado',
};

const STATUS_COLORS: Record<DoseStatus, string> = {
  [DoseStatus.PENDING]: 'bg-blue-100 text-blue-700 border-blue-200',
  [DoseStatus.APPLIED]: 'bg-green-100 text-green-700 border-green-200',
  [DoseStatus.NOT_ACCEPTED]: 'bg-red-100 text-red-700 border-red-200',
};

const NursingList: React.FC = () => {
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [npsDays, setNpsDays] = useState<30 | 60>(30);

  // Data states
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [patients, setPatients] = useState<PatientFull[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedItem, setSelectedItem] = useState<NursingItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<DoseStatus>(DoseStatus.PENDING);
  const [editApplicationDate, setEditApplicationDate] = useState('');
  const [editApplicationTime, setEditApplicationTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load data from API
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [treatmentsRes, patientsRes, protocolsRes, dosesRes] = await Promise.all([
        treatmentsApi.getAll({ limit: 200 }),
        patientsApi.getAll({ limit: 200 }),
        protocolsApi.getAll(),
        dosesApi.getAll({ limit: 1000 }),
      ]);

      setTreatments(treatmentsRes.data || []);
      setPatients(patientsRes.data || []);
      setProtocols(protocolsRes.data || []);
      setDoses(dosesRes.data || []);
    } catch (err: any) {
      console.error('Error loading nursing data:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate NPS
  const npsData = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - npsDays);

    const answeredDoses = doses.filter(d =>
      d.surveyStatus === SurveyStatus.ANSWERED &&
      d.surveyScore !== undefined &&
      new Date(d.applicationDate) >= cutoffDate
    );

    if (answeredDoses.length === 0) {
      return { score: null, total: 0, promoters: 0, detractors: 0, passives: 0 };
    }

    let promoters = 0;
    let detractors = 0;
    let passives = 0;

    answeredDoses.forEach(d => {
      const score = d.surveyScore!;
      if (score >= 9) promoters++;
      else if (score >= 7) passives++;
      else detractors++;
    });

    const nps = Math.round(((promoters - detractors) / answeredDoses.length) * 100);

    return {
      score: nps,
      total: answeredDoses.length,
      promoters,
      detractors,
      passives
    };
  }, [doses, npsDays]);

  // Build nursing items
  const nursingItems: NursingItem[] = useMemo(() => {
    const items: NursingItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter medication treatments
    const medTreatments = treatments.filter(t => {
      const proto = protocols.find(p => p.id === t.protocolId);
      return proto?.category === ProtocolCategory.MEDICATION || proto?.category === 'MEDICATION';
    });

    medTreatments.forEach(treatment => {
      const patient = patients.find(p => p.id === treatment.patientId);
      const protocol = protocols.find(p => p.id === treatment.protocolId);
      if (!patient || !protocol) return;

      // Filter doses for this treatment
      const treatmentDoses = doses.filter(d => d.treatmentId === treatment.id);

      treatmentDoses.forEach(dose => {
        const scheduledDate = new Date(dose.applicationDate);
        scheduledDate.setHours(0, 0, 0, 0);

        // Build address string
        const addr = patient.address;
        const addressStr = addr
          ? `${addr.street}, ${addr.number}${addr.complement ? ', ' + addr.complement : ''}, ${addr.neighborhood}, ${addr.city} - ${addr.state}`
          : 'Endereco nao cadastrado';
        const cepStr = addr?.zipCode
          ? `CEP: ${addr.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}`
          : '';

        items.push({
          doseId: dose.id,
          dose,
          treatmentId: treatment.id,
          patientId: patient.id,
          patientName: patient.fullName,
          guardianName: patient.guardian?.fullName || '',
          guardianRelationship: patient.guardian?.relationship || '',
          phone: patient.guardian?.phonePrimary || '',
          address: addressStr,
          cep: cepStr,
          scheduledDate,
          scheduledTime: new Date(dose.applicationDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: dose.status as DoseStatus,
          lotNumber: dose.lotNumber,
          expiryDate: dose.expiryDate,
          surveyScore: dose.surveyScore,
          surveyComment: dose.surveyComment,
          protocolName: protocol.name,
        });
      });
    });

    return items;
  }, [treatments, patients, protocols, doses]);

  // Filter items based on view mode and search
  const filteredItems = useMemo(() => {
    let items = nursingItems;

    // Filter by view mode
    if (viewMode === 'pending') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      items = items.filter(item =>
        item.status === DoseStatus.PENDING && item.scheduledDate <= today
      );
    } else {
      items = items.filter(item =>
        item.status === DoseStatus.APPLIED || item.status === DoseStatus.NOT_ACCEPTED
      );
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.patientName.toLowerCase().includes(search) ||
        item.guardianName.toLowerCase().includes(search) ||
        item.phone.includes(search.replace(/\D/g, ''))
      );
    }

    // Sort by date
    return items.sort((a, b) => {
      if (viewMode === 'pending') {
        return a.scheduledDate.getTime() - b.scheduledDate.getTime();
      }
      return b.scheduledDate.getTime() - a.scheduledDate.getTime();
    });
  }, [nursingItems, viewMode, searchTerm]);

  // Handle open modal
  const handleOpenModal = (item: NursingItem) => {
    setSelectedItem(item);
    setEditStatus(item.status);
    // Extract date part (YYYY-MM-DD)
    setEditApplicationDate(item.dose.applicationDate.split('T')[0]);
    // Extract time part (HH:MM)
    const timePart = item.dose.applicationDate.split('T')[1];
    setEditApplicationTime(timePart ? timePart.substring(0, 5) : '08:00');
    setIsModalOpen(true);
  };

  // Handle save status
  const handleSaveStatus = async () => {
    if (!selectedItem) return;

    setIsSaving(true);
    try {
      // Combine date and time into ISO format
      const applicationDateTime = `${editApplicationDate}T${editApplicationTime}:00`;

      await dosesApi.update(selectedItem.doseId, {
        status: editStatus,
        applicationDate: applicationDateTime,
      });

      // Update local state
      setDoses(prev => prev.map(d =>
        d.id === selectedItem.doseId
          ? { ...d, status: editStatus, applicationDate: applicationDateTime }
          : d
      ));

      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      console.error('Error updating dose:', err);
      alert('Erro ao atualizar status: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  // Format phone number
  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Get NPS color
  const getNpsColor = (score: number | null) => {
    if (score === null) return 'text-slate-400';
    if (score >= 70) return 'text-green-600';
    if (score >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando dados...</span>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Syringe size={28} className="mr-3 text-pink-600" />
            Enfermagem
          </h1>
          <p className="text-slate-500 mt-1">Gestao de visitas e aplicacoes de doses.</p>
        </div>

        {/* NPS Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <span className="text-xs text-slate-500 font-medium">NPS</span>
            <select
              value={npsDays}
              onChange={(e) => setNpsDays(Number(e.target.value) as 30 | 60)}
              className="text-xs border-none bg-transparent font-medium text-slate-700 focus:ring-0 cursor-pointer p-0"
            >
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Trophy size={20} className={getNpsColor(npsData.score)} />
            <div>
              <p className={`text-2xl font-bold ${getNpsColor(npsData.score)}`}>
                {npsData.score !== null ? npsData.score : '-'}
              </p>
              <p className="text-[10px] text-slate-400">({npsData.total} avaliacoes)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar paciente ou responsavel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              viewMode === 'pending'
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pendentes / Hoje
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              viewMode === 'history'
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Historico
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            title="Atualizar"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Syringe size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500">
              {viewMode === 'pending'
                ? 'Nenhuma aplicacao pendente para hoje.'
                : 'Nenhum historico encontrado.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.doseId}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Date Header */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-pink-500" />
                  <span className="font-bold text-slate-700">{formatDate(item.scheduledDate)}</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock size={14} />
                    {item.scheduledTime}
                  </span>
                </div>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Data e Hora da Dose</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_COLORS[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patient Info */}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <User size={12} /> Paciente
                  </p>
                  <p className="font-bold text-slate-800 text-lg">{item.patientName}</p>
                  <p className="text-sm text-slate-500">{item.protocolName}</p>
                </div>

                {/* Guardian Info */}
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <User size={12} /> Responsavel
                  </p>
                  <p className="font-bold text-slate-800">
                    {item.guardianName}
                    {item.guardianRelationship && (
                      <span className="font-normal text-slate-500"> ({item.guardianRelationship})</span>
                    )}
                  </p>
                  <p className="text-sm text-pink-600 flex items-center gap-1">
                    <Phone size={14} />
                    {formatPhone(item.phone)}
                  </p>
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MapPin size={12} /> Local de Aplicacao
                  </p>
                  <p className="text-slate-700">{item.address}</p>
                  <p className="text-xs text-slate-400">{item.cep}</p>
                </div>

                {/* Survey Score (if available) */}
                {item.surveyScore !== undefined && (
                  <div className="md:col-span-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-amber-500 fill-amber-500" />
                      <span className="font-bold text-amber-700">{item.surveyScore} / 10</span>
                      {item.surveyComment && (
                        <span className="text-sm text-slate-600 ml-2">"{item.surveyComment}"</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 pb-5">
                <button
                  onClick={() => handleOpenModal(item)}
                  className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  {item.status === DoseStatus.PENDING ? 'Registrar Aplicacao' : 'Ver Detalhes / Editar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Detalhes da Aplicacao"
        icon={<Syringe size={20} className="text-pink-600" />}
      >
        {selectedItem && (
          <div className="space-y-5">
            {/* Patient Info (Read Only) */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Paciente</p>
              <p className="font-bold text-slate-800 text-lg">{selectedItem.patientName}</p>
              <p className="text-sm text-slate-500">{selectedItem.protocolName}</p>
            </div>

            {/* Read Only Fields */}
            {(selectedItem.lotNumber || selectedItem.expiryDate) && (
              <div className="grid grid-cols-2 gap-4">
                {selectedItem.lotNumber && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Lote da Medicacao</p>
                    <p className="font-medium text-slate-700">{selectedItem.lotNumber}</p>
                  </div>
                )}
                {selectedItem.expiryDate && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Data de Validade</p>
                    <p className="font-medium text-slate-700">{formatDate(selectedItem.expiryDate)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Survey Score (Read Only) */}
            {selectedItem.surveyScore !== undefined && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-xs font-bold text-amber-700 uppercase mb-2">Nota da Pesquisa de Satisfacao</p>
                <div className="flex items-center gap-2">
                  <Star size={20} className="text-amber-500 fill-amber-500" />
                  <span className="text-2xl font-bold text-amber-700">{selectedItem.surveyScore}</span>
                  <span className="text-slate-500">/ 10</span>
                </div>
                {selectedItem.surveyComment && (
                  <p className="mt-2 text-sm text-slate-600 italic">"{selectedItem.surveyComment}"</p>
                )}
              </div>
            )}

            {/* Editable Fields */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Status da Aplicacao
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditStatus(DoseStatus.PENDING)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    editStatus === DoseStatus.PENDING
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock size={20} className="mx-auto mb-1" />
                  <span className="text-xs font-bold">Agendado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus(DoseStatus.APPLIED)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    editStatus === DoseStatus.APPLIED
                      ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 size={20} className="mx-auto mb-1" />
                  <span className="text-xs font-bold">Aplicado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus(DoseStatus.NOT_ACCEPTED)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    editStatus === DoseStatus.NOT_ACCEPTED
                      ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle size={20} className="mx-auto mb-1" />
                  <span className="text-xs font-bold">Recusado</span>
                </button>
              </div>
            </div>

            {/* Application Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Data da Aplicacao
                </label>
                <input
                  type="date"
                  value={editApplicationDate}
                  onChange={(e) => setEditApplicationDate(e.target.value)}
                  className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Horario da Aplicacao
                </label>
                <input
                  type="time"
                  value={editApplicationTime}
                  onChange={(e) => setEditApplicationTime(e.target.value)}
                  className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                disabled={isSaving}
                className="flex items-center px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-bold shadow-md shadow-pink-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NursingList;
