import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MOCK_PATIENTS, MOCK_DIAGNOSES, addMockPatient, deleteMockPatient } from '../services/mockData';
import { PatientFull } from '../types';
import { Search, Plus, ChevronRight, X, Save, User, Phone, FileText, MapPin, Calendar, AlignLeft, Loader2, Trash2, Filter, Activity } from 'lucide-react';
import { getDiagnosisColor } from '../constants';

const PatientList: React.FC = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [patients, setPatients] = useState<PatientFull[]>(MOCK_PATIENTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Força a atualização dos dados ao montar o componente
  useEffect(() => {
    setPatients(MOCK_PATIENTS);
  }, []);

  // Verifica se veio algum filtro do Dashboard via navegação
  useEffect(() => {
      const state = location.state as any;
      if (state) {
          if (state.diagnosisFilter) {
              setDiagnosisFilter(state.diagnosisFilter);
          }
          if (state.statusFilter) {
              setStatusFilter(state.statusFilter);
          }
          // Limpa o state do history para não ficar preso no filtro ao dar refresh
          window.history.replaceState({}, document.title);
      }
  }, [location]);

  // --- Form States ---
  
  // Dados Pessoais
  const [newName, setNewName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');

  // Responsável
  const [newGuardian, setNewGuardian] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  // Endereço
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Observações
  const [clinicalNotes, setClinicalNotes] = useState('');

  // --- OTIMIZAÇÃO DE PERFORMANCE ---
  
  // 1. Pré-processamento dos dados pesquisáveis
  // Esta lista só é recriada se 'patients' mudar (add/edit/delete), e NÃO a cada tecla digitada na busca.
  const processedPatients = useMemo(() => {
    const normalize = (str: string) => 
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return patients.map(p => ({
        ...p,
        // Pré-calcula strings de busca para evitar processamento repetitivo no filtro
        _searchName: normalize(p.fullName),
        _searchGuardian: normalize(p.guardian.fullName),
        _searchPhone: p.guardian.phonePrimary.replace(/\D/g, '') // Apenas números
    }));
  }, [patients]);

  // 2. Filtragem eficiente usando os dados pré-processados
  const filteredPatients = useMemo(() => {
    const normalize = (str: string) => 
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const term = searchTerm.trim();
    const normalizedTerm = normalize(term);
    const numericTerm = term.replace(/\D/g, ''); // Extrai números da busca
    const hasSearch = term.length > 0;
    const hasNumericSearch = numericTerm.length > 2; // Só busca telefone se tiver pelo menos 3 números

    return processedPatients.filter(p => {
        // 1. Filtro por Texto (Nome ou Telefone)
        let matchesSearch = true;
        if (hasSearch) {
            const nameMatch = p._searchName.includes(normalizedTerm);
            const guardianMatch = p._searchGuardian.includes(normalizedTerm);
            
            // Busca inteligente de telefone: só compara se o usuário digitou números suficientes
            const phoneMatch = hasNumericSearch && p._searchPhone.includes(numericTerm);
            
            matchesSearch = nameMatch || guardianMatch || phoneMatch;
        }

        if (!matchesSearch) return false;

        // 2. Filtro por Diagnóstico
        if (diagnosisFilter && p.mainDiagnosis !== diagnosisFilter) {
            return false;
        }

        // 3. Filtro por Status
        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'active';
            if (p.active !== isActive) return false;
        }

        return true;
    });
  }, [processedPatients, searchTerm, diagnosisFilter, statusFilter]);

  const resetForm = () => {
    setNewName('');
    setBirthDate('');
    setGender('');
    setNewDiagnosis('');
    setNewGuardian('');
    setNewPhone('');
    setRelationship('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setZipCode('');
    setClinicalNotes('');
  };

  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '');
      setZipCode(e.target.value); 

      if (value.length === 8) {
          setIsLoadingCep(true);
          try {
              const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
              const data = await response.json();
              
              if (!data.erro) {
                  setStreet(data.logradouro);
                  setNeighborhood(data.bairro);
                  setCity(data.localidade);
                  setState(data.uf);
                  document.getElementById('addr_number')?.focus();
              }
          } catch (error) {
              console.error("Erro ao buscar CEP", error);
          } finally {
              setIsLoadingCep(false);
          }
      }
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simula delay de API
    await new Promise(resolve => setTimeout(resolve, 800));

    const newId = `pat_${Date.now()}`;
    const newPatient: PatientFull = {
        id: newId,
        fullName: newName,
        birthDate: birthDate || undefined,
        gender: gender as 'M' | 'F' | 'Other',
        mainDiagnosis: newDiagnosis || 'Não informado',
        clinicalNotes: clinicalNotes,
        // CORREÇÃO: Paciente novo nasce ATIVO
        active: true, 
        guardian: {
            id: `g_${newId}`,
            patientId: newId,
            fullName: newGuardian,
            phonePrimary: newPhone,
            relationship: relationship
        },
        address: street ? {
            id: `addr_${newId}`,
            patientId: newId,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            zipCode
        } : undefined
    };

    const updatedList = addMockPatient(newPatient);
    setPatients(updatedList);
    
    setIsSaving(false);
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeletePatient = (id: string) => {
      if(window.confirm("Tem certeza que deseja excluir este paciente? Todos os dados vinculados serão perdidos.")){
          const updatedList = deleteMockPatient(id);
          setPatients(updatedList);
      }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
          <p className="text-slate-500">Gerenciamento de base de pacientes</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          Novo Paciente
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-400" />
            </div>
            <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <div className="relative w-full md:w-56">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter size={18} className="text-slate-400" />
            </div>
            <select
                value={diagnosisFilter}
                onChange={(e) => setDiagnosisFilter(e.target.value)}
                className="block w-full pl-10 pr-8 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 appearance-none bg-white"
            >
                <option value="">Todos Diagnósticos</option>
                {MOCK_DIAGNOSES.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                ))}
            </select>
        </div>

        <div className="relative w-full md:w-48">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Activity size={18} className="text-slate-400" />
            </div>
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-10 pr-8 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 appearance-none bg-white"
            >
                <option value="all">Todos Status</option>
                <option value="active">Apenas Ativos</option>
                <option value="inactive">Apenas Inativos</option>
            </select>
        </div>
        
        {(searchTerm || diagnosisFilter || statusFilter !== 'all') && (
             <button 
                onClick={() => { setSearchTerm(''); setDiagnosisFilter(''); setStatusFilter('all'); }}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
                Limpar
            </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Diagnóstico</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{patient.fullName}</div>
                    <div className="text-xs text-slate-500">ID: {patient.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">{patient.guardian.fullName}</div>
                    <div className="text-xs text-slate-500">{patient.guardian.phonePrimary}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDiagnosisColor(patient.mainDiagnosis)}`}>
                      {patient.mainDiagnosis}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${patient.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {patient.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                        <Link 
                        to={`/pacientes/${patient.id}`}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                        title="Ver Detalhes"
                        >
                        <ChevronRight size={20} />
                        </Link>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeletePatient(patient.id);
                            }}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir Paciente"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPatients.length === 0 && (
            <div className="p-8 text-center text-slate-500">
                {(searchTerm || diagnosisFilter || statusFilter !== 'all') ? "Nenhum paciente encontrado com estes filtros." : "Nenhum paciente cadastrado."}
            </div>
        )}
      </div>

      {/* Modal - Novo Paciente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Novo Paciente</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSavePatient} className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Seção 1: Dados Pessoais */}
                    <div>
                        <h4 className="flex items-center text-sm font-semibold text-pink-600 mb-3 border-b border-pink-100 pb-1">
                            <User size={16} className="mr-2" />
                            Dados Pessoais
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                    placeholder="Ex: Maria Alice..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar size={18} className="text-slate-400" />
                                    </div>
                                    <input 
                                        type="date"
                                        value={birthDate}
                                        onChange={e => setBirthDate(e.target.value)}
                                        className="pl-10 block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
                                <select 
                                    value={gender}
                                    required
                                    onChange={e => setGender(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                >
                                    <option value="" disabled>Selecione...</option>
                                    <option value="F">Feminino</option>
                                    <option value="M">Masculino</option>
                                    <option value="Other">Outro</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico Principal</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FileText size={18} className="text-slate-400" />
                                    </div>
                                    <select 
                                        value={newDiagnosis}
                                        required
                                        onChange={e => setNewDiagnosis(e.target.value)}
                                        className="pl-10 block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                    >
                                        <option value="" disabled>Selecione...</option>
                                        {MOCK_DIAGNOSES.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                        <option value="Outro">Outro (Digitar na obs)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Responsável */}
                    <div>
                        <h4 className="flex items-center text-sm font-semibold text-pink-600 mb-3 border-b border-pink-100 pb-1">
                            <User size={16} className="mr-2" />
                            Contato e Responsável
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Responsável</label>
                                <input 
                                    type="text" 
                                    required
                                    value={newGuardian}
                                    onChange={e => setNewGuardian(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                    placeholder="Nome do responsável"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Parentesco</label>
                                <select 
                                    value={relationship}
                                    required
                                    onChange={e => setRelationship(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                >
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Mãe">Mãe</option>
                                    <option value="Pai">Pai</option>
                                    <option value="Avó/Avô">Avó/Avô</option>
                                    <option value="Tio/Tia">Tio/Tia</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Principal</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone size={18} className="text-slate-400" />
                                    </div>
                                    <input 
                                        type="tel" 
                                        required
                                        value={newPhone}
                                        onChange={e => setNewPhone(e.target.value)}
                                        className="pl-10 block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seção 3: Endereço */}
                    <div>
                        <h4 className="flex items-center text-sm font-semibold text-pink-600 mb-3 border-b border-pink-100 pb-1">
                            <MapPin size={16} className="mr-2" />
                            Endereço
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                             <div className="md:col-span-2 relative">
                                <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={zipCode}
                                        onChange={handleZipCodeChange}
                                        maxLength={9}
                                        className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 pr-8"
                                        placeholder="00000-000"
                                    />
                                    {isLoadingCep && (
                                        <div className="absolute right-2 top-2.5">
                                            <Loader2 size={16} className="animate-spin text-pink-600"/>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Rua / Logradouro</label>
                                <input 
                                    type="text" 
                                    value={street}
                                    onChange={e => setStreet(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                                <input 
                                    id="addr_number"
                                    type="text" 
                                    value={number}
                                    onChange={e => setNumber(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                                <input 
                                    type="text" 
                                    value={neighborhood}
                                    onChange={e => setNeighborhood(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                />
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                                <input 
                                    type="text" 
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                />
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                                <input 
                                    type="text" 
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                    placeholder="UF"
                                    maxLength={2}
                                />
                            </div>
                             <div className="md:col-span-6">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                                <input 
                                    type="text" 
                                    value={complement}
                                    onChange={e => setComplement(e.target.value)}
                                    className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                                    placeholder="Apto, Bloco..."
                                />
                            </div>
                        </div>
                    </div>

                     {/* Seção 4: Observações */}
                     <div>
                        <h4 className="flex items-center text-sm font-semibold text-pink-600 mb-3 border-b border-pink-100 pb-1">
                            <AlignLeft size={16} className="mr-2" />
                            Observações Clínicas
                        </h4>
                        <textarea 
                            rows={3}
                            value={clinicalNotes}
                            onChange={e => setClinicalNotes(e.target.value)}
                            className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Histórico prévio, alergias, observações importantes..."
                        ></textarea>
                     </div>

                </form>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        disabled={isSaving}
                        className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSavePatient}
                        type="button" 
                        disabled={isSaving}
                        className="flex-1 py-2.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 flex justify-center items-center shadow-lg shadow-pink-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
                        {isSaving ? 'Salvando...' : 'Salvar Paciente'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;