import React, { useState, useEffect } from 'react';
import { protocolsApi, medicationsApi } from '../services/api';
import { Protocol, ProtocolMilestone, ProtocolCategory, MedicationBase } from '../types';
import { Plus, Trash2, ClipboardList, Clock, Target, MessageCircle, Calendar, AlertCircle, X, Edit2, Pill, MessageSquare, Loader2 } from 'lucide-react';
import VariablesPanel from '../components/ui/VariablesPanel';

// Helper to convert backend protocol to frontend format
const convertProtocol = (data: any): Protocol => ({
  id: data.id,
  name: data.name,
  category: data.category === 'MEDICATION' ? ProtocolCategory.MEDICATION : ProtocolCategory.MONITORING,
  medicationType: data.medicationType || '',
  frequencyDays: data.frequencyDays,
  goal: data.goal,
  message: data.message,
  milestones: data.milestones?.map((m: any) => ({
  day: m.day,
  message: m.message,
  })),
  // March 2026: per-dose message configuration
  dose1MessageEnabled: data.dose1MessageEnabled ?? true,
  dose1ExtraMessage: data.dose1ExtraMessage,
  lastDoseMessageEnabled: data.lastDoseMessageEnabled ?? true,
  lastDoseExtraMessage: data.lastDoseExtraMessage,
});

const MedicationList: React.FC = () => {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [medications, setMedications] = useState<MedicationBase[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from API
  useEffect(() => {
  loadData();
  }, []);

  const loadData = async () => {
  try {
    setIsLoading(true);
    setError(null);
    const [protocolsRes, medicationsRes] = await Promise.all([
    protocolsApi.getAll(),
    medicationsApi.getAll()
    ]);
    // Convert backend protocols to frontend format
    setProtocols((protocolsRes.data || []).map(convertProtocol));
    setMedications(medicationsRes.data || []);
  } catch (err: any) {
    setError(err.message || 'Erro ao carregar dados');
    console.error('Failed to load data:', err);
  } finally {
    setIsLoading(false);
  }
  };

  // Form State
  const [category, setCategory] = useState<ProtocolCategory>(ProtocolCategory.MEDICATION);
  const [name, setName] = useState('');
  const [medication, setMedication] = useState('');
  const [frequency, setFrequency] = useState('28');
  const [goal, setGoal] = useState('');
  const [message, setMessage] = useState('');

  // Milestones State
  const [milestones, setMilestones] = useState<ProtocolMilestone[]>([]);
  const [newMileDay, setNewMileDay] = useState('');
  const [newMileMsg, setNewMileMsg] = useState('');

  // March 2026: per-dose message config state
  const [dose1MessageEnabled, setDose1MessageEnabled] = useState(true);
  const [dose1ExtraMessage, setDose1ExtraMessage] = useState('');
  const [lastDoseMessageEnabled, setLastDoseMessageEnabled] = useState(true);
  const [lastDoseExtraMessage, setLastDoseExtraMessage] = useState('');

  // March 2026: support editing existing milestones (image 15 — missing edit button bug)
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState<number | null>(null);

  // March 2026: track which message field is currently focused so the Campos Personalizados
  // panel can insert variables into the right textarea.
  type MessageField = 'message' | 'milestone' | 'dose1Extra' | 'lastDoseExtra';
  const [activeField, setActiveField] = useState<MessageField>('message');

  const insertVariable = (tag: string) => {
    const append = (prev: string) => prev + (prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '') + tag;
    switch (activeField) {
      case 'milestone':
        setNewMileMsg(append);
        break;
      case 'dose1Extra':
        setDose1ExtraMessage(append);
        break;
      case 'lastDoseExtra':
        setLastDoseExtraMessage(append);
        break;
      case 'message':
      default:
        setMessage(append);
        break;
    }
  };

  const handleAddMilestone = () => {
  if (!newMileDay || !newMileMsg) return;
  const newItem: ProtocolMilestone = {
    day: Number(newMileDay),
    message: newMileMsg
  };
  if (editingMilestoneIdx !== null) {
    // Update mode — replace at index
    const updated = [...milestones];
    updated[editingMilestoneIdx] = newItem;
    setMilestones(updated.sort((a, b) => a.day - b.day));
    setEditingMilestoneIdx(null);
  } else {
    setMilestones([...milestones, newItem].sort((a, b) => a.day - b.day));
  }
  setNewMileDay('');
  setNewMileMsg('');
  };

  const handleEditMilestone = (idx: number) => {
  const ms = milestones[idx];
  setNewMileDay(String(ms.day));
  setNewMileMsg(ms.message);
  setEditingMilestoneIdx(idx);
  };

  const removeMilestone = (index: number) => {
  const newList = [...milestones];
  newList.splice(index, 1);
  setMilestones(newList);
  if (editingMilestoneIdx === index) {
    setEditingMilestoneIdx(null);
    setNewMileDay('');
    setNewMileMsg('');
  }
  };

  const resetForm = () => {
  setEditingId(null);
  setCategory(ProtocolCategory.MEDICATION);
  setName('');
  setMedication('');
  setGoal('');
  setMessage('');
  setMilestones([]);
  setFrequency('28');
  // March 2026 per-dose config defaults
  setDose1MessageEnabled(true);
  setDose1ExtraMessage('');
  setLastDoseMessageEnabled(true);
  setLastDoseExtraMessage('');
  };

  const handleEdit = (proto: Protocol) => {
  setEditingId(proto.id);
  setCategory(proto.category || ProtocolCategory.MEDICATION);
  setName(proto.name);
  // Find medication ID by matching the medicationType name
  if (proto.medicationType) {
    const matchedMed = medications.find(m =>
    `${m.activeIngredient} ${m.dosage}`.trim() === proto.medicationType
    );
    setMedication(matchedMed?.id || '');
  } else {
    setMedication('');
  }
  setFrequency(String(proto.frequencyDays));
  setGoal(proto.goal || '');
  setMessage(proto.message || '');
  setMilestones(proto.milestones || []);
  // March 2026 per-dose config
  setDose1MessageEnabled(proto.dose1MessageEnabled ?? true);
  setDose1ExtraMessage(proto.dose1ExtraMessage || '');
  setLastDoseMessageEnabled(proto.lastDoseMessageEnabled ?? true);
  setLastDoseExtraMessage(proto.lastDoseExtraMessage || '');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  // Frontend validation
  const validationErrors: string[] = [];

  if (!name.trim()) {
    validationErrors.push('Nome do protocolo é obrigatório');
  }

  if (!category) {
    validationErrors.push('Categoria é obrigatória');
  }

  if (!frequency || Number(frequency) < 1) {
    validationErrors.push('Frequência (dias) é obrigatória e deve ser maior que 0');
  }

  // For MEDICATION category, medication type is recommended but not strictly required
  if (category === ProtocolCategory.MEDICATION && !medication) {
    validationErrors.push('Medicamento é recomendado para protocolos medicamentosos');
  }

  if (validationErrors.length > 0) {
    setError(validationErrors.join('. '));
    return;
  }

  setIsSaving(true);

  try {
    let fullMedicationName = '';
    if (category === ProtocolCategory.MEDICATION && medication) {
    // Find the medication by ID and get its full name
    const selectedMed = medications.find(m => m.id === medication);
    if (selectedMed) {
      fullMedicationName = `${selectedMed.activeIngredient} ${selectedMed.dosage}`.trim();
    }
    }

    // Convert frontend enum to backend string
    const backendCategory = category === ProtocolCategory.MEDICATION ? 'MEDICATION' : 'MONITORING';

    const protocolData = {
    name: name.trim(),
    category: backendCategory,
    medicationType: fullMedicationName,
    frequencyDays: Number(frequency),
    goal: goal || '',
    message: message || '',
    milestones,
    // March 2026 per-dose configuration
    dose1MessageEnabled,
    dose1ExtraMessage: dose1ExtraMessage || null,
    lastDoseMessageEnabled,
    lastDoseExtraMessage: lastDoseExtraMessage || null,
    };

    if (editingId) {
    const updated = await protocolsApi.update(editingId, protocolData);
    setProtocols(prev => prev.map(p => p.id === editingId ? convertProtocol(updated) : p));
    } else {
    const created = await protocolsApi.create(protocolData);
    setProtocols(prev => [...prev, convertProtocol(created)]);
    }

    resetForm();
  } catch (err: any) {
    setError(err.message || 'Erro ao salvar protocolo');
    console.error('Failed to save protocol:', err);
  } finally {
    setIsSaving(false);
  }
  };

  const handleDelete = async (id: string) => {
  if (!window.confirm('Tem certeza que deseja excluir este protocolo?')) return;

  try {
    await protocolsApi.delete(id);
    setProtocols(prev => prev.filter(p => p.id !== id));
    if (editingId === id) resetForm();
  } catch (err: any) {
    setError(err.message || 'Erro ao excluir protocolo');
    console.error('Failed to delete protocol:', err);
  }
  };

  if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
    <Loader2 size={32} className="animate-spin text-pink-600" />
    <span className="ml-3 text-slate-600">Carregando protocolos...</span>
    </div>
  );
  }

  return (
  <div className="space-y-6 max-w-5xl mx-auto">
    <div>
    <h1 className="text-2xl font-bold text-slate-800 flex items-center">
      <ClipboardList size={28} className="mr-3 text-pink-600" />
      Gestão de Protocolos
    </h1>
    <p className="text-slate-500 mt-1">Gerencie os protocolos de medicamentos e réguas de relacionamento.</p>
    </div>

    {error && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
      <AlertCircle size={20} className="text-red-600 mr-3" />
      <span className="text-red-700">{error}</span>
      <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">&times;</button>
    </div>
    )}

    {/* March 2026: Campos Personalizados — disponíveis para inserir nas mensagens do protocolo.
        Clique numa tag para inserir no campo de mensagem em foco. */}
    <VariablesPanel onInsert={insertVariable} />

    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <form onSubmit={handleSubmit} className="space-y-6 mb-8 border-b border-slate-100 pb-8">
      <div className="flex justify-between items-center">
      <h3 className="font-bold text-slate-700 text-lg">
        {editingId ? 'Editar Protocolo' : 'Novo Protocolo'}
      </h3>
      {editingId && (
        <button type="button" onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-700 flex items-center bg-slate-100 px-3 py-1 rounded-lg">
        <X size={14} className="mr-1" /> Cancelar Edição
        </button>
      )}
      </div>

      {/* Category Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className={`cursor-pointer border rounded-lg p-4 flex items-center transition-all ${category === ProtocolCategory.MEDICATION ? 'border-pink-500 bg-pink-50' : 'border-slate-200 hover:border-pink-300'}`}
        onClick={() => setCategory(ProtocolCategory.MEDICATION)}
      >
        <div className={`p-2 rounded-full mr-3 ${category === ProtocolCategory.MEDICATION ? 'bg-pink-100 text-pink-600' : 'bg-slate-100 text-slate-400'}`}>
        <Pill size={20} />
        </div>
        <div>
        <p className="font-bold text-slate-800">Medicamentoso</p>
        <p className="text-xs text-slate-500">Envolve aplicação de doses e controle de estoque.</p>
        </div>
      </div>
      <div className={`cursor-pointer border rounded-lg p-4 flex items-center transition-all ${category === ProtocolCategory.MONITORING ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
        onClick={() => setCategory(ProtocolCategory.MONITORING)}
      >
        <div className={`p-2 rounded-full mr-3 ${category === ProtocolCategory.MONITORING ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
        <MessageSquare size={20} />
        </div>
        <div>
        <p className="font-bold text-slate-800">Régua de Contato</p>
        <p className="text-xs text-slate-500">Apenas acompanhamento, mensagens e procedimentos.</p>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Protocolo</label>
        <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={category === ProtocolCategory.MEDICATION ? "Ex: Puberdade Precoce - Mensal" : "Ex: Acompanhamento Nutricional"}
        className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
        required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
        {category === ProtocolCategory.MEDICATION ? 'Intervalo (Dias)' : 'Duração do Ciclo (Dias)'}
        </label>
        <input
        type="number"
        min="1"
        value={frequency}
        onChange={e => setFrequency(e.target.value)}
        className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
        placeholder="Qtd dias"
        required
        />
        <div className="flex gap-1 mt-1.5 flex-wrap">
        <button type="button" onClick={() => setFrequency('28')} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200">28d (Mensal)</button>
        <button type="button" onClick={() => setFrequency('84')} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200">84d (Trim.)</button>
        <button type="button" onClick={() => setFrequency('168')} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded border border-slate-200">168d (Sem.)</button>
        </div>
      </div>

      {/* Conditional Fields based on Category */}
      {category === ProtocolCategory.MEDICATION ? (
        <>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Medicamento (Cadastrado em Estoque)</label>
          <select
          value={medication}
          onChange={e => setMedication(e.target.value)}
          className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
          >
          <option value="">Selecione o Medicamento...</option>
          {medications.map(med => {
            const medName = `${med.activeIngredient} ${med.dosage}`.trim();
            return (
            <option key={med.id} value={med.id}>
              {medName}
            </option>
            );
          })}
          </select>
          {medications.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Cadastre medicamentos na aba "Estoque" primeiro.</p>
          )}
        </div>
        </>
      ) : (
        <div className="lg:col-span-1">
        {/* Empty spacer for alignment if needed */}
        </div>
      )}

      <div className="lg:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Meta Terapêutica</label>
        <input
        type="text"
        value={goal}
        onChange={e => setGoal(e.target.value)}
        placeholder="Ex: Supressão puberal"
        className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
        />
      </div>
      <div className="lg:col-span-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Mensagem Padrão / Instrução (Geral)</label>
        <textarea
        rows={2}
        value={message}
        onChange={e => setMessage(e.target.value)}
        onFocus={() => setActiveField('message')}
        placeholder="Instruções gerais para a equipe ou paciente..."
        className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
        />
        <p className="text-[10px] text-slate-400 mt-1 italic">
          Suporta variáveis como {'{nome_paciente}'}, {'{data_proxima_dose}'} — veja o painel "Campos Personalizados" abaixo.
        </p>
      </div>
      </div>

      {/* Seção Régua de Contato (Milestones) */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <h4 className="font-bold text-slate-700 mb-3 flex items-center">
        <Calendar size={18} className="mr-2 text-pink-600" />
        Régua de Contato / Mensagens Automáticas
      </h4>
      <p className="text-xs text-slate-500 mb-4">
        Adicione lembretes ou mensagens que devem ser enviadas em dias específicos do ciclo.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 items-start">
        <div className="md:col-span-1">
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dia do Ciclo</label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-slate-400 text-sm font-bold">D</span>
          <input
          type="number"
          min="1"
          value={newMileDay}
          onChange={e => setNewMileDay(e.target.value)}
          placeholder="0"
          className="block w-full pl-7 border-slate-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500"
          />
        </div>
        </div>
        <div className="md:col-span-5">
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
          Mensagem / Ação (WhatsApp)
        </label>
        <textarea
          rows={6}
          value={newMileMsg}
          onChange={e => setNewMileMsg(e.target.value)}
          onFocus={() => setActiveField('milestone')}
          placeholder={`Olá, {nome_responsavel}! Tudo bem?\n\nLembrete: a próxima dose do(a) {nome_paciente} está prevista para {data_proxima_dose}.`}
          className="block w-full border-slate-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500 font-mono"
        />
        <div className="flex flex-col md:flex-row justify-between items-center mt-2 gap-3">
          <p className="text-[10px] text-slate-400">
          Suporta Emojis (💊, 🛵), formatação WhatsApp (*negrito*, _itálico_) e variáveis ({'{nome_paciente}'}, etc).
          </p>
          <div className="flex gap-2 w-full md:w-auto">
            {editingMilestoneIdx !== null && (
              <button
                type="button"
                onClick={() => { setEditingMilestoneIdx(null); setNewMileDay(''); setNewMileMsg(''); }}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleAddMilestone}
              disabled={!newMileDay || !newMileMsg}
              className="flex-1 md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center shadow-sm"
            >
              {editingMilestoneIdx !== null ? <Edit2 size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
              {editingMilestoneIdx !== null ? 'Atualizar Mensagem' : 'Adicionar à Régua'}
            </button>
          </div>
        </div>
        </div>
      </div>

      {milestones.length > 0 && (
        <div className="space-y-3 mt-6 border-t border-slate-200 pt-4">
        {milestones.map((ms, idx) => (
          <div key={idx} className="flex items-start justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm hover:border-pink-200 transition-colors">
          <div className="flex items-start gap-4 text-sm w-full">
            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded font-bold text-xs whitespace-nowrap mt-0.5 border border-pink-200">
            Dia {ms.day}
            </span>
            <p className="text-slate-700 whitespace-pre-wrap flex-1 text-xs leading-relaxed font-mono">
            {ms.message}
            </p>
          </div>
          {/* March 2026: edit + trash actions side-by-side. Edit first by convention. */}
          <button
            type="button"
            onClick={() => handleEditMilestone(idx)}
            className="text-slate-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg ml-2 transition-colors"
            title="Editar Mensagem"
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => removeMilestone(idx)}
            className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg ml-2 transition-colors"
            title="Remover Mensagem"
          >
            <Trash2 size={16} />
          </button>
          </div>
        ))}
        </div>
      )}
      </div>

      {/* March 2026: Per-Dose Configuration (Dose 1 / Última Dose) — only for medication protocols */}
      {category === ProtocolCategory.MEDICATION && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-1 flex items-center">
            <Target size={18} className="mr-2 text-pink-600" />
            Configuração por Dose Especial
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            Personalize o envio de mensagens para a primeira e última dose do tratamento.
          </p>

          {/* Summary table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2 text-left">Dose</th>
                  <th className="px-4 py-2 text-left">Msg Padrão</th>
                  <th className="px-4 py-2 text-left">Msg Extra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-2 font-medium text-slate-700">Dose 1</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center text-xs font-medium ${dose1MessageEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${dose1MessageEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {dose1MessageEnabled ? 'Ativa' : 'Desativada'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{dose1ExtraMessage ? 'Configurada' : '—'}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-slate-700">Doses 2..N-1</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center text-xs font-medium text-emerald-600">
                      <span className="w-2 h-2 rounded-full mr-1.5 bg-emerald-500" />
                      Sempre ativa
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">N/A</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-slate-700">Última Dose</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center text-xs font-medium ${lastDoseMessageEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${lastDoseMessageEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {lastDoseMessageEnabled ? 'Ativa' : 'Desativada'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{lastDoseExtraMessage ? 'Configurada' : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dose 1 card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 mb-3">
            <div className="flex items-center mb-3">
              <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-2">DOSE 1</span>
              <span className="font-bold text-slate-700">Início do Tratamento</span>
            </div>

            {/* Toggle */}
            <label className="flex items-start gap-3 mb-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <button
                type="button"
                onClick={() => setDose1MessageEnabled(!dose1MessageEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  !dose1MessageEnabled ? 'bg-slate-700' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={!dose1MessageEnabled}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${!dose1MessageEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              <div>
                <p className="font-semibold text-slate-700 text-sm">Não enviar mensagens padrão na Dose 1</p>
                <p className="text-xs text-slate-500 mt-0.5">Paciente acabou de sair do consultório — lembrete pode ser desnecessário.</p>
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mensagem extra — Dose 1 <span className="text-xs text-slate-400 font-normal">Opcional</span>
            </label>
            <textarea
              rows={3}
              value={dose1ExtraMessage}
              onChange={(e) => setDose1ExtraMessage(e.target.value)}
              onFocus={() => setActiveField('dose1Extra')}
              placeholder="Ex: Boas-vindas ao tratamento, orientações iniciais, o que esperar..."
              className="block w-full border-slate-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500"
            />
            <p className="text-[10px] text-slate-400 mt-1 italic">
              Enviada apenas na primeira dose. Suporta variáveis: {'{nome_responsavel}'}, {'{nome_paciente}'}, {'{nome_medico}'}, {'{data_proxima_dose}'}, {'{data_proxima_consulta}'}.
            </p>
          </div>

          {/* Última Dose card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded mr-2">ÚLTIMA DOSE</span>
              <span className="font-bold text-slate-700">Encerramento</span>
            </div>

            <label className="flex items-start gap-3 mb-3 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <button
                type="button"
                onClick={() => setLastDoseMessageEnabled(!lastDoseMessageEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  !lastDoseMessageEnabled ? 'bg-slate-700' : 'bg-slate-300'
                }`}
                role="switch"
                aria-checked={!lastDoseMessageEnabled}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${!lastDoseMessageEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              <div>
                <p className="font-semibold text-slate-700 text-sm">Não enviar mensagens padrão na Última Dose</p>
                <p className="text-xs text-slate-500 mt-0.5">Tratamento encerrado — mensagens de acompanhamento não se aplicam.</p>
              </div>
            </label>

            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mensagem extra — Última Dose <span className="text-xs text-slate-400 font-normal">Opcional</span>
            </label>
            <textarea
              rows={3}
              value={lastDoseExtraMessage}
              onChange={(e) => setLastDoseExtraMessage(e.target.value)}
              onFocus={() => setActiveField('lastDoseExtra')}
              placeholder="Ex: Orientações de encerramento, lembrete de retorno, próximos passos..."
              className="block w-full border-slate-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500"
            />
            <p className="text-[10px] text-slate-400 mt-1 italic">
              Enviada apenas na última dose (baseado no campo "Doses Planejadas" do tratamento).
            </p>
          </div>

          {/* How it works helper */}
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <span className="font-bold">💡 Como funciona:</span> O sistema identifica automaticamente a última dose pelo campo "Doses Planejadas" do tratamento. Se Doses Planejadas = 4, a Dose 4 é a última. As configurações acima são aplicadas automaticamente.
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
      <button
        type="submit"
        disabled={isSaving}
        className="bg-pink-600 text-white px-6 py-2.5 rounded-lg hover:bg-pink-700 font-medium flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : (editingId ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />)}
        {editingId ? (isSaving ? 'Salvando...' : 'Salvar Alterações') : (isSaving ? 'Adicionando...' : 'Adicionar Protocolo')}
      </button>
      </div>
    </form>

    <div>
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Protocolos Ativos</h3>
      <div className="grid grid-cols-1 gap-4">
      {protocols.map(proto => (
        <div key={proto.id} className="border border-slate-100 rounded-xl bg-slate-50 p-4 hover:border-pink-200 transition-colors group relative">
        {/* Badge Category */}
        <div className="absolute top-4 right-14">
          {proto.category === ProtocolCategory.MONITORING ? (
          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Régua Contato</span>
          ) : (
          <span className="bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Medicamento</span>
          )}
        </div>

        <div className="flex justify-between items-start pr-20">
          <div>
          <h4 className="font-bold text-slate-800 text-lg">{proto.name}</h4>
          {proto.medicationType && (
            <p className="text-slate-600 font-medium">{proto.medicationType}</p>
          )}
          </div>
          <div className="flex gap-2 absolute top-4 right-4">
          <button
            onClick={() => handleEdit(proto)}
            className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-all"
            title="Editar"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => handleDelete(proto.id)}
            className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
            title="Excluir"
          >
            <Trash2 size={18} />
          </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200/60">
          <div className="flex items-center text-sm text-slate-600">
          <Clock size={16} className="mr-2 text-pink-500" />
          <span>Ciclo: <span className="font-semibold">{proto.frequencyDays} dias</span></span>
          </div>
          {proto.goal && (
          <div className="flex items-center text-sm text-slate-600">
            <Target size={16} className="mr-2 text-blue-500" />
            <span>Meta: {proto.goal}</span>
          </div>
          )}
          {proto.message && (
          <div className="flex items-center text-sm text-slate-600 md:col-span-3 lg:col-span-1">
            <AlertCircle size={16} className="mr-2 text-orange-500" />
            <span className="truncate" title={proto.message}>{proto.message}</span>
          </div>
          )}
        </div>

        {/* Exibir Milestones se houver */}
        {proto.milestones && proto.milestones.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200/50">
          <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Régua de Contato ({proto.milestones.length} msgs)</span>
          <div className="flex flex-col gap-2">
            {proto.milestones.slice(0, 3).map((m, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded px-3 py-2 text-xs text-slate-600 flex items-start" title={m.message}>
              <span className="font-bold mr-2 text-pink-600 whitespace-nowrap">D{m.day}:</span>
              <span className="truncate flex-1">{m.message.substring(0, 80)}{m.message.length > 80 ? '...' : ''}</span>
            </div>
            ))}
            {proto.milestones.length > 3 && (
            <p className="text-[10px] text-slate-400 italic pl-1">+ {proto.milestones.length - 3} mensagens...</p>
            )}
          </div>
          </div>
        )}
        </div>
      ))}
      {protocols.length === 0 && (
        <div className="text-center py-8 text-slate-400 border border-dashed rounded-lg">
        Nenhum protocolo cadastrado.
        </div>
      )}
      </div>
    </div>
    </div>
  </div>
  );
};

export default MedicationList;
