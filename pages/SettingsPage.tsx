import React, { useState, useEffect } from 'react';
import { Settings, Loader2, Save, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { settingsApi } from '../services/api';

interface SettingField {
  key: string;
  label: string;
  description: string;
  value: string;
}

const ADHERENCE_FIELDS: { key: string; label: string; description: string }[] = [
  {
    key: 'adherence_max_delay_good',
    label: 'Atraso maximo para BOA adesao (X)',
    description: 'Doses com atraso individual inferior a X dias sao consideradas dentro do padrao.',
  },
  {
    key: 'adherence_max_late_doses_partial',
    label: 'Maximo de doses atrasadas para PARCIAL (Y)',
    description: 'De 2 a Y doses com atraso superior a X dias classificam como ADESAO PARCIAL.',
  },
  {
    key: 'adherence_min_delay_bad',
    label: 'Atraso minimo para RUIM (Z)',
    description: 'Mais de Y doses com atraso superior a Z dias classificam como ADESAO RUIM.',
  },
  {
    key: 'adherence_abandonment_days',
    label: 'Dias sem aplicacao para ABANDONO (W)',
    description: 'Se a ultima dose programada nao foi aplicada e ja excedeu W dias, classifica como ABANDONO.',
  },
];

const SettingsPage: React.FC = () => {
  const [fields, setFields] = useState<SettingField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await settingsApi.getAll();
      const settings = res.data || [];
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => { settingsMap[s.key] = s.value; });

      setFields(ADHERENCE_FIELDS.map(f => ({
        ...f,
        value: settingsMap[f.key] || '',
      })));
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setError(err.message || 'Erro ao carregar configuracoes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, value } : f));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const settings: Record<string, string> = {};
      fields.forEach(f => { settings[f.key] = f.value; });
      await settingsApi.update(settings);
      setSuccessMessage('Configuracoes salvas com sucesso!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Erro ao salvar configuracoes');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-pink-600 mr-3" />
        <span className="text-slate-600">Carregando configuracoes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configuracoes</h1>
          <p className="text-slate-500">Parametros configuraveis do sistema</p>
        </div>
        <button
          onClick={loadSettings}
          disabled={isLoading}
          className="flex items-center px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Check size={20} className="text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700">{successMessage}</span>
        </div>
      )}

      {/* Adherence Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800 flex items-center">
            <Settings size={18} className="mr-2 text-pink-500" />
            Regras de Adesao do Paciente
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Defina os limiares para classificacao automatica de adesao dos pacientes.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Rules explanation */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-2">
            <p><span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 mr-1">BOA</span> Todas as doses aplicadas com atrasos individuais inferiores a <strong>X</strong> dias.</p>
            <p><span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 mr-1">PARCIAL</span> De 2 a <strong>Y</strong> doses aplicadas com atraso superior a <strong>X</strong> dias.</p>
            <p><span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-700 mr-1">RUIM</span> Mais de <strong>Y</strong> doses aplicadas com atraso superior a <strong>Z</strong> dias.</p>
            <p><span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 mr-1">ABANDONO</span> Ultima dose programada nao aplicada e ja excedeu <strong>W</strong> dias.</p>
          </div>

          {/* Settings fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map(field => (
              <div key={field.key} className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  {field.label}
                </label>
                <input
                  type="number"
                  min="1"
                  value={field.value}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 text-lg font-bold text-center"
                  style={{ maxWidth: '120px' }}
                />
                <p className="text-xs text-slate-500">{field.description}</p>
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-2.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 size={18} className="mr-2 animate-spin" />
              ) : (
                <Save size={18} className="mr-2" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar Configuracoes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
