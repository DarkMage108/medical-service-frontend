import React, { useEffect, useState } from 'react';
import { messageTemplatesApi } from '../../services/api';
import { TemplateVariableDef } from '../../types';
import { MessageSquare, Copy, Check } from 'lucide-react';

// March 2026 — Reusable "Campos Personalizados" panel.
// Used both in Modelos de Mensagem (admin) and Protocolos (Medication/Régua de contato).
// Shows the available variable tags with a click-to-copy action.
//
// `onInsert` (optional) lets the host page wire the tags directly into its active textarea
// (e.g. quick-insert button next to message inputs).

interface VariablesPanelProps {
  onInsert?: (tag: string) => void;
  // Optional compact mode — smaller padding, no header subtitle.
  compact?: boolean;
}

const VariablesPanel: React.FC<VariablesPanelProps> = ({ onInsert, compact }) => {
  const [variables, setVariables] = useState<TemplateVariableDef[]>([]);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    messageTemplatesApi
      .getVariables()
      .then(res => { if (mounted) setVariables(res.data || []); })
      .catch(() => {})
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleCopy = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 1500);
    } catch {
      // Clipboard not available — silently ignore
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className={`bg-gradient-to-r from-violet-100 to-violet-50 border-b border-violet-200 flex items-center justify-between ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}>
        <div className="flex items-center">
          <span className="bg-violet-600 text-white rounded-lg p-2 mr-3">
            <MessageSquare size={compact ? 14 : 18} />
          </span>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Campos Personalizados</h3>
            {!compact && (
              <p className="text-xs text-slate-500">
                Use variáveis nas mensagens pré-prontas para auto-preencher dados do paciente e tratamento.
              </p>
            )}
          </div>
        </div>
        <span className="bg-violet-200 text-violet-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
          Variáveis Disponíveis: {variables.length}
        </span>
      </div>

      <div className={compact ? 'p-3' : 'p-5'}>
        <p className="text-xs text-slate-500 mb-3 text-right">
          {onInsert ? 'Clique para inserir uma tag' : 'Clique para copiar uma tag'}
        </p>
        {isLoading ? (
          <p className="text-center text-sm text-slate-400 py-4">Carregando variáveis...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Variável (Tag)</th>
                  <th className="px-3 py-2 text-left">Nome Técnico</th>
                  <th className="px-3 py-2 text-left">Retorna</th>
                  <th className="px-3 py-2 text-left">Fonte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variables.map(v => (
                  <tr key={v.tag} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onInsert ? onInsert(v.tag) : handleCopy(v.tag)}
                        className="inline-flex items-center bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-md px-2.5 py-1 font-mono text-xs transition-colors"
                        title={onInsert ? 'Inserir tag' : 'Copiar tag'}
                      >
                        {copiedTag === v.tag ? (
                          <><Check size={12} className="mr-1" /> Copiado!</>
                        ) : (
                          <><Copy size={12} className="mr-1" /> {v.tag}</>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{v.key}</td>
                    <td className="px-3 py-3">
                      <p className="text-slate-700">{v.returns}</p>
                      <p className="text-xs text-slate-400 italic">Ex: {v.example}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded">
                        {v.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariablesPanel;
