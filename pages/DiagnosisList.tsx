import React, { useState, useEffect } from 'react';
import { diagnosesApi } from '../services/api';
import { Diagnosis } from '../types';
import { Plus, Trash2, Tag, Stethoscope, Loader2, Check, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { getDiagnosisColor, DIAGNOSIS_COLORS } from '../constants';

const DiagnosisList: React.FC = () => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [selectedColor, setSelectedColor] = useState(DIAGNOSIS_COLORS[0]);
  const [requiresConsent, setRequiresConsent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load diagnoses from API on mount
  useEffect(() => {
    loadDiagnoses();
  }, []);

  const loadDiagnoses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await diagnosesApi.getAll();
      setDiagnoses(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar diagnosticos');
      console.error('Failed to load diagnoses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagnosis.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const newItem = await diagnosesApi.create({
        name: newDiagnosis.trim(),
        color: selectedColor,
        requiresConsent
      });

      // Add the new item to the list
      setDiagnoses(prev => [...prev, newItem]);

      // Clear the form
      setNewDiagnosis('');
      setRequiresConsent(false);
      // Randomize next color
      const randomNext = DIAGNOSIS_COLORS[Math.floor(Math.random() * DIAGNOSIS_COLORS.length)];
      setSelectedColor(randomNext);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar diagnostico');
      console.error('Failed to add diagnosis:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleConsent = async (diag: Diagnosis) => {
    try {
      setError(null);
      const updated = await diagnosesApi.update(diag.id, {
        requiresConsent: !diag.requiresConsent
      });
      setDiagnoses(prev => prev.map(d => d.id === diag.id ? { ...d, requiresConsent: updated.requiresConsent } : d));
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar diagnostico');
      console.error('Failed to update diagnosis:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (window.confirm('Tem certeza que deseja excluir este diagnostico?')) {
      try {
        setError(null);
        await diagnosesApi.delete(id);
        setDiagnoses(prev => prev.filter(d => d.id !== id));
      } catch (err: any) {
        setError(err.message || 'Erro ao excluir diagnostico');
        console.error('Failed to delete diagnosis:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600" />
        <span className="ml-3 text-slate-600">Carregando diagnosticos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Stethoscope size={28} className="mr-3 text-pink-600" />
            Gestao de Diagnosticos
          </h1>
          <p className="text-slate-500 mt-1">Cadastre as condicoes clinicas atendidas pela clinica.</p>
        </div>
        <button
          onClick={loadDiagnoses}
          disabled={isLoading}
          className="flex items-center px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle size={20} className="text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            X
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleAdd} className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">Novo Diagnostico</label>
              <input
                type="text"
                value={newDiagnosis}
                onChange={e => setNewDiagnosis(e.target.value)}
                placeholder="Ex: Puberdade Precoce, Obesidade..."
                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                disabled={isSaving}
              />
            </div>
            <div className="w-full md:w-auto flex items-end">
              <button
                type="submit"
                disabled={!newDiagnosis.trim() || isSaving}
                className="w-full md:w-auto bg-pink-600 text-white px-6 py-2.5 rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center shadow-sm h-[42px] mt-6"
              >
                {isSaving ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Plus size={18} className="mr-2" />}
                {isSaving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>

          {/* Color Selector */}
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cor da Etiqueta</label>
            <div className="flex flex-wrap gap-2">
              {DIAGNOSIS_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${color.split(' ')[0]} ${
                    selectedColor === color
                      ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                      : 'hover:scale-105 border border-transparent hover:border-slate-300'
                  }`}
                  title="Selecionar cor"
                >
                  {selectedColor === color && <Check size={14} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Requires Consent Checkbox */}
          <div className="mt-4">
            <label className="flex items-center cursor-pointer group">
              <input
                type="checkbox"
                checked={requiresConsent}
                onChange={e => setRequiresConsent(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                disabled={isSaving}
              />
              <span className="ml-3 text-sm text-slate-700 group-hover:text-slate-900">
                <FileText size={16} className="inline mr-1 text-pink-500" />
                Exige Termo de Consentimento
              </span>
            </label>
            <p className="mt-1 ml-8 text-xs text-slate-400">
              Marque se este diagnostico exige que o paciente assine um termo de consentimento.
            </p>
          </div>

          {/* Preview */}
          <div className="mt-4 flex items-center">
            <span className="text-xs text-slate-500 mr-2">Pre-visualizacao:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${selectedColor}`}>
              <Tag size={14} className="mr-2" />
              {newDiagnosis || 'Nome do Diagnostico'}
            </span>
            {requiresConsent && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                <FileText size={12} className="mr-1" />
                Termo
              </span>
            )}
          </div>
        </form>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Diagnosticos Cadastrados</h3>
          <div className="grid grid-cols-1 gap-3">
            {diagnoses.map(diag => (
              <div key={diag.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-lg bg-slate-50 hover:border-pink-200 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDiagnosisColor(diag.name, diag.color)}`}>
                    <Tag size={14} className="mr-2" />
                    {diag.name}
                  </span>
                  {diag.requiresConsent && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      <FileText size={12} className="mr-1" />
                      Exige Termo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center cursor-pointer" title="Exige Termo de Consentimento">
                    <input
                      type="checkbox"
                      checked={diag.requiresConsent || false}
                      onChange={() => handleToggleConsent(diag)}
                      className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                    />
                    <span className="ml-1.5 text-xs text-slate-500 hidden sm:inline">Termo</span>
                  </label>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(diag.id, e)}
                    className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all cursor-pointer"
                    title="Excluir Diagnostico"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {diagnoses.length === 0 && (
              <div className="text-center py-8 text-slate-400 border border-dashed rounded-lg">
                Nenhum diagnostico cadastrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisList;
