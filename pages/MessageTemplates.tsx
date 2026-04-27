import React, { useState, useEffect } from 'react';
import { messageTemplatesApi } from '../services/api';
import { MessageTemplate, MessageTemplateTrigger, TemplateVariableDef } from '../types';
import { MessageSquare, Plus, Edit2, Trash2, X, AlertCircle, Loader2, Save } from 'lucide-react';
import VariablesPanel from '../components/ui/VariablesPanel';

// March 2026 spec — Admin page for configurable manual-send WhatsApp templates.
// See [E:/1/16.png] for the popup that uses these templates and [E:/1/17.png] for the variable list.

const TRIGGER_LABELS: Record<MessageTemplateTrigger, string> = {
  [MessageTemplateTrigger.CONSENT_TERM]: 'Termo de Consentimento',
  [MessageTemplateTrigger.SURVEY_PENDING]: 'Aguardando Resposta da Pesquisa',
  [MessageTemplateTrigger.SCHEDULE_CONSULTATION]: 'Agendar Consulta',
  [MessageTemplateTrigger.NEXT_DOSE]: 'Próximas Doses',
  [MessageTemplateTrigger.LATE_DOSE]: 'Doses Atrasadas',
  [MessageTemplateTrigger.GENERAL]: 'Geral',
};

const TRIGGER_COLORS: Record<MessageTemplateTrigger, string> = {
  [MessageTemplateTrigger.CONSENT_TERM]: 'bg-blue-100 text-blue-700 border-blue-200',
  [MessageTemplateTrigger.SURVEY_PENDING]: 'bg-amber-100 text-amber-700 border-amber-200',
  [MessageTemplateTrigger.SCHEDULE_CONSULTATION]: 'bg-purple-100 text-purple-700 border-purple-200',
  [MessageTemplateTrigger.NEXT_DOSE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  [MessageTemplateTrigger.LATE_DOSE]: 'bg-red-100 text-red-700 border-red-200',
  [MessageTemplateTrigger.GENERAL]: 'bg-slate-100 text-slate-700 border-slate-200',
};

const MessageTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [variables, setVariables] = useState<TemplateVariableDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formTrigger, setFormTrigger] = useState<MessageTemplateTrigger>(MessageTemplateTrigger.GENERAL);
  const [formContent, setFormContent] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tplRes, varsRes] = await Promise.all([
        messageTemplatesApi.getAll(),
        messageTemplatesApi.getVariables(),
      ]);
      setTemplates(tplRes.data || []);
      setVariables(varsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormTrigger(MessageTemplateTrigger.GENERAL);
    setFormContent('');
    setFormActive(true);
  };

  const handleEdit = (tpl: MessageTemplate) => {
    setEditingId(tpl.id);
    setFormName(tpl.name);
    setFormTrigger(tpl.trigger);
    setFormContent(tpl.content);
    setFormActive(tpl.active);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formContent.trim()) {
      alert('Nome e conteúdo são obrigatórios.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        await messageTemplatesApi.update(editingId, {
          name: formName.trim(),
          trigger: formTrigger,
          content: formContent,
          active: formActive,
        });
      } else {
        await messageTemplatesApi.create({
          name: formName.trim(),
          trigger: formTrigger,
          content: formContent,
          active: formActive,
        });
      }
      await loadData();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    try {
      await messageTemplatesApi.delete(id);
      await loadData();
      if (editingId === id) resetForm();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir');
    }
  };

  const insertVariable = (tag: string) => {
    setFormContent(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + tag);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600" />
        <span className="ml-3 text-slate-600">Carregando modelos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <MessageSquare size={28} className="mr-3 text-pink-600" />
          Modelos de Mensagem
        </h1>
        <p className="text-slate-500 mt-1">
          Configure mensagens pré-prontas para envio manual via WhatsApp. Suporta variáveis dinâmicas que são auto-preenchidas com dados do paciente e tratamento.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">&times;</button>
        </div>
      )}

      {/* Variables panel — reusable component, also used in Protocolos */}
      <VariablesPanel />

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700 text-lg">
              {editingId ? 'Editar Modelo' : 'Novo Modelo'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center bg-slate-100 px-3 py-1 rounded-lg"
              >
                <X size={14} className="mr-1" /> Cancelar Edição
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nome do Modelo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ex: Lembrete de pesquisa de satisfação"
                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select
                value={formTrigger}
                onChange={e => setFormTrigger(e.target.value as MessageTemplateTrigger)}
                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              >
                {Object.values(MessageTemplateTrigger).map(t => (
                  <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="block text-sm font-medium text-slate-700">
                Conteúdo <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400">Use variáveis como {'{nome_paciente}'} para personalizar</span>
            </div>
            <textarea
              required
              rows={6}
              value={formContent}
              onChange={e => setFormContent(e.target.value)}
              placeholder={`Olá, {nome_responsavel}! Tudo bem? 😊\nEstou passando para saber como o(a) {nome_paciente} está se sentindo.\nA próxima aplicação está prevista para {data_proxima_dose}.\n\nUm abraço!`}
              className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 font-mono text-sm"
            />
            {/* Quick variable insertion buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs text-slate-500 mr-1">Inserir:</span>
              {variables.map(v => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  className="text-[10px] bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded font-mono"
                >
                  {v.tag}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formActive}
              onChange={e => setFormActive(e.target.checked)}
              className="w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500"
            />
            <span className="text-sm text-slate-700">Modelo ativo (disponível para uso)</span>
          </label>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : editingId ? (
                <Save size={18} className="mr-2" />
              ) : (
                <Plus size={18} className="mr-2" />
              )}
              {editingId ? (isSaving ? 'Salvando...' : 'Salvar Alterações') : (isSaving ? 'Adicionando...' : 'Adicionar Modelo')}
            </button>
          </div>
        </form>
      </div>

      {/* Templates list */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Modelos Cadastrados ({templates.length})</h3>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-slate-400 border border-dashed rounded-lg">
            Nenhum modelo cadastrado. Crie o primeiro acima.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-200 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-800">{tpl.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${TRIGGER_COLORS[tpl.trigger]}`}>
                      {TRIGGER_LABELS[tpl.trigger]}
                    </span>
                    {!tpl.active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200 uppercase">Inativo</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(tpl)}
                      className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded p-3">{tpl.content}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageTemplates;
