
import React, { useState, useEffect } from 'react';
import { DiagnosisService } from '../services/mockData';
import { Diagnosis } from '../types';
import { Plus, Trash2, Tag, Stethoscope, Loader2, Edit2, X, Check } from 'lucide-react';
import { getDiagnosisColor, DIAGNOSIS_PALETTE } from '../constants';

const DiagnosisList: React.FC = () => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DIAGNOSIS_PALETTE[0].class);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
        const d = await DiagnosisService.getAll();
        setDiagnoses(d);
    }
    fetch();
  }, []);

  const resetForm = () => {
      setName('');
      setSelectedColor(DIAGNOSIS_PALETTE[0].class);
      setEditingId(null);
  };

  const handleEdit = (diag: Diagnosis) => {
      setName(diag.name);
      // Se não tiver cor salva, tenta achar pelo hash ou usa o default
      setSelectedColor(diag.color || getDiagnosisColor(diag.name));
      setEditingId(diag.id);
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);

    if (editingId) {
        // Update
        const updates = { name: name.trim(), color: selectedColor };
        const updatedList = await DiagnosisService.update(editingId, updates);
        setDiagnoses(updatedList);
    } else {
        // Create
        const newItem: Diagnosis = {
            id: `diag_${Date.now()}`,
            name: name.trim(),
            color: selectedColor
        };
        const updatedList = await DiagnosisService.create(newItem);
        setDiagnoses(updatedList);
    }

    setIsSaving(false);
    resetForm();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (window.confirm('Tem certeza que deseja excluir este diagnóstico?')) {
          const updated = await DiagnosisService.delete(id);
          setDiagnoses(updated);
          if (editingId === id) resetForm();
      }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Stethoscope size={28} className="mr-3 text-pink-600" />
            Gestão de Diagnósticos
        </h1>
        <p className="text-slate-500 mt-1">Cadastre as condições clínicas e escolha uma cor para facilitar a identificação.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSave} className="space-y-6 mb-8 border-b border-slate-100 pb-8">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 text-lg">
                      {editingId ? 'Editar Diagnóstico' : 'Novo Diagnóstico'}
                  </h3>
                  {editingId && (
                      <button type="button" onClick={resetForm} className="text-sm text-slate-500 hover:text-slate-700 flex items-center bg-slate-100 px-3 py-1 rounded-lg">
                          <X size={14} className="mr-1"/> Cancelar Edição
                      </button>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Diagnóstico</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: Puberdade Precoce, Obesidade..."
                        className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                        disabled={isSaving}
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Paleta de Cor</label>
                      <div className="flex flex-wrap gap-3">
                          {DIAGNOSIS_PALETTE.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setSelectedColor(option.class)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${option.dot} ${selectedColor === option.class ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                                title={option.label}
                              >
                                  {selectedColor === option.class && <Check size={14} className="text-white" />}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="flex justify-end">
                <button 
                    type="submit" 
                    disabled={!name.trim() || isSaving}
                    className="bg-pink-600 text-white px-6 py-2.5 rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center shadow-sm"
                >
                    {isSaving ? <Loader2 size={18} className="mr-2 animate-spin"/> : (editingId ? <Edit2 size={18} className="mr-2"/> : <Plus size={18} className="mr-2" />)}
                    {editingId ? (isSaving ? 'Salvando...' : 'Salvar Alterações') : (isSaving ? 'Adicionando...' : 'Adicionar')}
                </button>
              </div>
          </form>

          <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Diagnósticos Cadastrados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diagnoses.map(diag => {
                      // Usa a cor salva ou o fallback
                      const colorClass = diag.color || getDiagnosisColor(diag.name);
                      return (
                          <div key={diag.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-lg bg-slate-50 hover:border-pink-200 transition-colors group">
                              <div className="flex items-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
                                    <Tag size={14} className="mr-2" />
                                    {diag.name}
                                  </span>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={() => handleEdit(diag)}
                                    className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-all cursor-pointer"
                                    title="Editar"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => handleDelete(diag.id, e)}
                                    className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all cursor-pointer"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                              </div>
                          </div>
                      );
                  })}
                  {diagnoses.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-slate-400 border border-dashed rounded-lg">
                          Nenhum diagnóstico cadastrado.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default DiagnosisList;
