
import React, { useState, useEffect } from 'react';
import { ProtocolService, MedicationBaseService } from '../services/mockData';
import { Protocol, ProtocolMilestone, ProtocolCategory, MedicationBase } from '../types';
import { Plus, Trash2, ClipboardList, Clock, Target, MessageCircle, Calendar, AlertCircle, X, Edit2, Pill, MessageSquare, Loader2 } from 'lucide-react';

const MedicationList: React.FC = () => {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [medications, setMedications] = useState<MedicationBase[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const fetch = async () => {
        const [p, m] = await Promise.all([ProtocolService.getAll(), MedicationBaseService.getAll()]);
        setProtocols(p);
        setMedications(m);
    };
    fetch();
  }, []);
  
  const [category, setCategory] = useState<ProtocolCategory>(ProtocolCategory.MEDICATION);
  const [name, setName] = useState('');
  const [medication, setMedication] = useState('');
  const [frequency, setFrequency] = useState('28');
  const [goal, setGoal] = useState('');
  const [message, setMessage] = useState('');

  const [milestones, setMilestones] = useState<ProtocolMilestone[]>([]);
  const [newMileDay, setNewMileDay] = useState('');
  const [newMileMsg, setNewMileMsg] = useState('');

  const handleAddMilestone = () => {
      if (!newMileDay || !newMileMsg) return;
      const newItem: ProtocolMilestone = {
          day: Number(newMileDay),
          message: newMileMsg
      };
      setMilestones([...milestones, newItem].sort((a, b) => a.day - b.day));
      setNewMileDay('');
      setNewMileMsg('');
  };

  const removeMilestone = (index: number) => {
      const newList = [...milestones];
      newList.splice(index, 1);
      setMilestones(newList);
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
  };

  const handleEdit = (proto: Protocol) => {
      setEditingId(proto.id);
      setCategory(proto.category || ProtocolCategory.MEDICATION);
      setName(proto.name);
      setMedication(proto.medicationType); 
      setFrequency(String(proto.frequencyDays));
      setGoal(proto.goal || '');
      setMessage(proto.message || '');
      setMilestones(proto.milestones || []);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSaving(true);
    
    let fullMedicationName = '';
    if (category === ProtocolCategory.MEDICATION) {
        fullMedicationName = medication || 'Sem medicação definida';
    } else {
        fullMedicationName = '';
    }
    
    if (editingId) {
        const updates: Partial<Protocol> = {
            name,
            category,
            medicationType: fullMedicationName,
            frequencyDays: Number(frequency),
            goal,
            message,
            milestones
        };
        const updated = await ProtocolService.update(editingId, updates);
        setProtocols(updated);
    } else {
        const newItem: Protocol = {
            id: `proto_${Date.now()}`,
            name: name,
            category,
            medicationType: fullMedicationName,
            frequencyDays: Number(frequency),
            goal: goal,
            message: message,
            milestones: milestones
        };
        await ProtocolService.create(newItem);
        setProtocols(await ProtocolService.getAll());
    }
    
    setIsSaving(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
      if (window.confirm('Tem certeza que deseja excluir este protocolo?')) {
          const updated = await ProtocolService.delete(id);
          setProtocols(updated);
          if (editingId === id) resetForm();
      }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ClipboardList size={28} className="mr-3 text-pink-600" />
            Gestão de Protocolos
        </h1>
        <p className="text-slate-500 mt-1">Gerencie os protocolos de medicamentos e réguas de relacionamento.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6 mb-8 border-b border-slate-100 pb-8">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 text-lg">
                      {editingId ? 'Editar Protocolo' : 'Novo Protocolo'}
                  </h3>
                  {editingId && (
                      <button type="button" onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-700 flex items-center bg-slate-100 px-3 py-1 rounded-lg">
                          <X size={14} className="mr-1"/> Cancelar Edição
                      </button>
                  )}
              </div>
              
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
                                {medications.map(med => (
                                    <option key={med.id} value={`${med.activeIngredient} ${med.dosage}`.trim()}>
                                        {med.activeIngredient} {med.dosage}
                                    </option>
                                ))}
                            </select>
                            {medications.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Cadastre medicamentos na aba "Estoque" primeiro.</p>
                            )}
                        </div>
                    </>
                  ) : (
                      <div className="lg:col-span-1"></div>
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
                        placeholder="Instruções gerais para a equipe ou paciente..."
                        className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                      />
                  </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-3 flex items-center">
                      <Calendar size={18} className="mr-2 text-pink-600" />
                      Régua de Contato / Mensagens Automáticas
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                      Adicione lembretes ou mensagens que devem ser enviadas em dias específicos do ciclo.
                  </p>

                  <div className="flex gap-2 items-end mb-3">
                      <div className="w-24">
                          <label className="block text-xs font-bold text-slate-500 uppercase">Dia</label>
                          <input 
                              type="number" 
                              min="1"
                              value={newMileDay}
                              onChange={e => setNewMileDay(e.target.value)}
                              placeholder="Dia"
                              className="block w-full border-slate-300 rounded-lg text-sm"
                          />
                      </div>
                      <div className="flex-1">
                           <label className="block text-xs font-bold text-slate-500 uppercase">Mensagem / Ação</label>
                           <input 
                              type="text" 
                              value={newMileMsg}
                              onChange={e => setNewMileMsg(e.target.value)}
                              placeholder="Ex: Lembrete de agendamento..."
                              className="block w-full border-slate-300 rounded-lg text-sm"
                          />
                      </div>
                      <button 
                        type="button" 
                        onClick={handleAddMilestone}
                        disabled={!newMileDay || !newMileMsg}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                      >
                          Adicionar
                      </button>
                  </div>

                  {milestones.length > 0 && (
                      <div className="space-y-2">
                          {milestones.map((ms, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-md">
                                  <div className="flex items-center gap-3 text-sm">
                                      <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded font-bold text-xs w-16 text-center">
                                          Dia {ms.day}
                                      </span>
                                      <span className="text-slate-700">{ms.message}</span>
                                  </div>
                                  <button type="button" onClick={() => removeMilestone(idx)} className="text-slate-400 hover:text-red-500">
                                      <X size={16} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="flex justify-end pt-2">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-pink-600 text-white px-6 py-2.5 rounded-lg hover:bg-pink-700 font-medium flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 size={18} className="mr-2 animate-spin"/> : (editingId ? <Edit2 size={18} className="mr-2"/> : <Plus size={18} className="mr-2"/>)}
                    {editingId ? (isSaving ? 'Salvando...' : 'Salvar Alterações') : (isSaving ? 'Adicionando...' : 'Adicionar Protocolo')}
                </button>
              </div>
          </form>

          <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Protocolos Ativos</h3>
              <div className="grid grid-cols-1 gap-4">
                  {protocols.map(proto => (
                      <div key={proto.id} className="border border-slate-100 rounded-xl bg-slate-50 p-4 hover:border-pink-200 transition-colors group relative">
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
                          
                          {proto.milestones && proto.milestones.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-slate-200/50">
                                  <span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Régua de Contato</span>
                                  <div className="flex flex-wrap gap-2">
                                      {proto.milestones.map((m, idx) => (
                                          <div key={idx} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 flex items-center" title={m.message}>
                                              <span className="font-bold mr-1 text-pink-600">D{m.day}:</span>
                                              <span className="truncate max-w-[150px]">{m.message}</span>
                                          </div>
                                      ))}
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
