import React, { useState, useEffect } from 'react';
import { messageTemplatesApi, dismissedLogsApi } from '../../services/api';
import { MessageTemplate, MessageTemplateTrigger } from '../../types';
import { MessageSquare, X, Loader2, Check, ExternalLink, ArrowRight } from 'lucide-react';

// March 2026 spec — Action popup launched from dashboard tables.
// Pre-loads a template, secretary edits, then sends manually via WhatsApp.
// See [E:/1/16.png] for the mockup.

interface MessagePopupProps {
  open: boolean;
  onClose: () => void;
  // Treatment context for variable resolution
  treatmentId: string;
  doseId?: string;
  // Patient identification (March 2026: required to log the manual contact correctly)
  patientId: string;
  patientName: string;
  guardianName?: string;
  guardianPhone?: string;
  // Pre-filter templates by trigger (e.g. SURVEY_PENDING when launched from "aguardando pesquisa")
  defaultTrigger?: MessageTemplateTrigger;
  // Optional callback after WhatsApp send / mark as sent
  onMarkSent?: () => Promise<void> | void;
  // Title shown in the modal header
  title?: string;
  // Optional link to navigate "Ir para Tratamento"
  treatmentLink?: string;
}

const stripPhone = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

const MessagePopup: React.FC<MessagePopupProps> = ({
  open,
  onClose,
  treatmentId,
  doseId,
  patientId,
  patientName,
  guardianName,
  guardianPhone,
  defaultTrigger,
  onMarkSent,
  title = 'Detalhes da Mensagem',
  treatmentLink,
}) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [content, setContent] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoadingTemplates(true);
    messageTemplatesApi
      .getAll({ active: true, ...(defaultTrigger ? { trigger: defaultTrigger } : {}) })
      .then(res => {
        setTemplates(res.data || []);
        // Auto-select the first template matching the trigger
        if ((res.data || []).length > 0 && !selectedTemplateId) {
          const first = res.data[0];
          setSelectedTemplateId(first.id);
          resolveTemplate(first.id);
        }
      })
      .catch(() => setTemplates([]))
      .finally(() => setIsLoadingTemplates(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTrigger]);

  const resolveTemplate = async (templateId: string) => {
    if (!templateId || !treatmentId) return;
    setIsResolving(true);
    try {
      const res = await messageTemplatesApi.resolve({
        templateId,
        treatmentId,
        doseId,
      });
      setContent(res.rendered);
    } catch (err: any) {
      console.error('Failed to resolve template:', err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    if (id) resolveTemplate(id);
  };

  const handleSendWhatsApp = () => {
    const phone = stripPhone(guardianPhone);
    const text = encodeURIComponent(content);
    const url = phone
      ? `https://wa.me/55${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMarkSent = async () => {
    setIsMarking(true);
    try {
      // Log the manual contact so it doesn't reappear in pendings
      await dismissedLogsApi.createManual({
        patientId,
        patientName,
        patientPhone: guardianPhone,
        message: content,
      });
      if (onMarkSent) await onMarkSent();
      onClose();
    } catch (err: any) {
      console.error('Failed to mark sent:', err);
    } finally {
      setIsMarking(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center">
            <MessageSquare size={18} className="mr-2 text-pink-600" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Modelo de Mensagem
              </label>
              <select
                value={selectedTemplateId}
                onChange={e => handleSelectTemplate(e.target.value)}
                className="block w-full border-slate-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">— Selecione um modelo —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {isLoadingTemplates && (
            <div className="text-center text-sm text-slate-500 flex items-center justify-center py-4">
              <Loader2 size={16} className="animate-spin mr-2" /> Carregando modelos...
            </div>
          )}

          {/* Message content */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ação / Mensagem
              </label>
              {isResolving && <span className="text-xs text-slate-400 flex items-center"><Loader2 size={12} className="animate-spin mr-1" /> Aplicando variáveis...</span>}
            </div>
            <textarea
              rows={8}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Digite a mensagem ou selecione um modelo acima..."
              className="block w-full border-slate-300 rounded-lg text-sm focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Patient + guardian info */}
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Paciente</p>
              <p className="font-bold text-slate-800">{patientName}</p>
            </div>
            {guardianName && (
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Responsável</p>
                  <p className="font-medium text-slate-700">{guardianName}</p>
                </div>
                {guardianPhone && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase">Telefone</p>
                    <p className="text-sm text-slate-700">{guardianPhone}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!content.trim()}
            className="w-full flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-sm disabled:opacity-50"
          >
            <ExternalLink size={16} className="mr-2" />
            Contatar via WhatsApp
          </button>
          <div className="grid grid-cols-2 gap-2">
            {treatmentLink && (
              <a
                href={treatmentLink}
                className="flex items-center justify-center px-3 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-white"
              >
                <ArrowRight size={14} className="mr-1.5" />
                Ir para Tratamento
              </a>
            )}
            <button
              type="button"
              onClick={handleMarkSent}
              disabled={isMarking}
              className={`flex items-center justify-center px-3 py-2 text-sm border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50 ${treatmentLink ? '' : 'col-span-2'}`}
            >
              {isMarking ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Check size={14} className="mr-1.5" />}
              Concluir / Enviado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePopup;
