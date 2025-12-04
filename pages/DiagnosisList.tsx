
import React, { useState, useEffect } from 'react';
import { getDiagnoses, addMockDiagnosis, deleteMockDiagnosis } from '../services/mockData';
import { Diagnosis } from '../types';
import { Plus, Trash2, Tag, Stethoscope, Loader2 } from 'lucide-react';
import { getDiagnosisColor } from '../constants';

const DiagnosisList: React.FC = () => {
  // Inicializa vazio e carrega no useEffect para garantir consistência
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Carrega diagnósticos atualizados ao montar
  useEffect(() => {
    setDiagnoses(getDiagnoses());
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagnosis.trim()) return;

    setIsSaving(true);
    // Pequeno delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 300));

    const newItem: Diagnosis = {
        id: `diag_${Date.now()}`,
        name: newDiagnosis.trim()
    };

    // Salva no mock e recebe a lista atualizada
    const updatedList = addMockDiagnosis(newItem);
    
    // Atualiza o estado visual com a lista retornada
    setDiagnoses(updatedList);
    
    // Limpa o campo
    setNewDiagnosis('');
    setIsSaving(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      // Impede propagação se houver cliques aninhados
      e.stopPropagation();
      e.preventDefault();
      
      if (window.confirm('Tem certeza que deseja excluir este diagnóstico?')) {
          const updated = deleteMockDiagnosis(id);
          setDiagnoses(updated);
      }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Stethoscope size={28} className="mr-3 text-pink-600" />
            Gestão de Diagnósticos
        </h1>
        <p className="text-slate-500 mt-1">Cadastre as condições clínicas atendidas pela clínica.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleAdd} className="flex gap-4 items-end mb-8">
              <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Novo Diagnóstico</label>
                  <input 
                    type="text" 
                    value={newDiagnosis} 
                    onChange={e => setNewDiagnosis(e.target.value)}
                    placeholder="Ex: Puberdade Precoce, Obesidade..."
                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                    disabled={isSaving}
                  />
              </div>
              <button 
                type="submit" 
                disabled={!newDiagnosis.trim() || isSaving}
                className="bg-pink-600 text-white px-6 py-2.5 rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center shadow-sm"
              >
                  {isSaving ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Plus size={18} className="mr-2" />}
                  {isSaving ? 'Adicionando...' : 'Adicionar'}
              </button>
          </form>

          <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Diagnósticos Cadastrados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {diagnoses.map(diag => (
                      <div key={diag.id} className="flex justify-between items-center p-4 border border-slate-100 rounded-lg bg-slate-50 hover:border-pink-200 transition-colors">
                          <div className="flex items-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDiagnosisColor(diag.name)}`}>
                                <Tag size={14} className="mr-2" />
                                {diag.name}
                              </span>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => handleDelete(diag.id, e)}
                            className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all cursor-pointer"
                            title="Excluir Diagnóstico"
                          >
                              <Trash2 size={18} />
                          </button>
                      </div>
                  ))}
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
