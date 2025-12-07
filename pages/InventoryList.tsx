import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { inventoryApi, medicationsApi, purchaseRequestsApi, dispenseLogsApi } from '../services/api';
import { InventoryItem, MedicationBase } from '../types';
import { Package, Plus, Search, AlertTriangle, ShoppingCart, Calendar, Check, X, Loader2, Pill, Trash2, Edit2, Save, Filter, BarChart3, ArrowRightLeft, PieChart, ArrowRight } from 'lucide-react';
import SectionCard from '../components/ui/SectionCard';
import Modal from '../components/ui/Modal';
import { formatDate } from '../constants';

interface PurchaseRequest {
  id: string;
  medicationName: string;
  currentStock: number;
  predictedConsumption10Days: number;
  suggestedQuantity: number;
  status: 'PENDING' | 'ORDERED' | 'RECEIVED';
  createdAt: string;
}

interface DispenseLog {
  id: string;
  medicationName: string;
  quantity: number;
  date: string;
}

const InventoryList: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'list' | 'entry' | 'orders' | 'reports' | 'medications'>('list');

  // Data States
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [logs, setLogs] = useState<DispenseLog[]>([]);
  const [medications, setMedications] = useState<MedicationBase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [editExpiry, setEditExpiry] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Report Filters
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportViewMode, setReportViewMode] = useState<'monthly' | 'quarterly'>('monthly');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload data when tab changes
  useEffect(() => {
    if (activeTab === 'orders') {
      checkPurchaseRequests();
    }
  }, [activeTab]);

  // Handle Navigation State to switch tabs automatically
  useEffect(() => {
    if (location.state && (location.state as any).activeTab) {
      setActiveTab((location.state as any).activeTab);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [inventoryRes, medicationsRes, requestsRes, logsRes] = await Promise.all([
        inventoryApi.getAll(),
        medicationsApi.getAll(),
        purchaseRequestsApi.getAll(),
        dispenseLogsApi.getAll()
      ]);
      setInventory(inventoryRes.data || []);
      setMedications(medicationsRes.data || []);
      setRequests(requestsRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPurchaseRequests = async () => {
    try {
      await purchaseRequestsApi.check();
      const requestsRes = await purchaseRequestsApi.getAll();
      setRequests(requestsRes.data || []);
    } catch (err: any) {
      console.error('Failed to check purchase requests:', err);
    }
  };

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');

  // --- ENTRY FORM STATES ---
  const [entryMedication, setEntryMedication] = useState('');
  const [entryLot, setEntryLot] = useState('');
  const [entryExpiry, setEntryExpiry] = useState('');
  const [entryQuantity, setEntryQuantity] = useState(0);
  const [entryUnit, setEntryUnit] = useState('Ampola');
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  // State to link Order -> Entry
  const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);

  // --- MEDICATION REGISTRY STATES ---
  const [newActiveIngredient, setNewActiveIngredient] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTradeName, setNewTradeName] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newForm, setNewForm] = useState('Ampola');
  const [isSavingMed, setIsSavingMed] = useState(false);

  // --- DERIVED DATA ---

  // Group Inventory by Medication Name
  const groupedInventory = useMemo(() => {
    const grouped: Record<string, { total: number, lots: InventoryItem[] }> = {};

    inventory.forEach(item => {
      if (!grouped[item.medicationName]) {
        grouped[item.medicationName] = { total: 0, lots: [] };
      }
      grouped[item.medicationName].lots.push(item);
      grouped[item.medicationName].total += item.quantity;
    });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data }))
      .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [inventory, searchTerm]);

  // --- REPORT DATA PROCESSING (MATRIX) ---
  const reportMatrix = useMemo(() => {
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      if (isNaN(logDate.getTime())) return false;
      const d = logDate.toISOString().split('T')[0];
      return d >= reportStartDate && d <= reportEndDate;
    });

    const timeKeys = new Set<string>();
    const medicationKeys = new Set<string>();
    const dataMap: Record<string, Record<string, number>> = {};

    filteredLogs.forEach(log => {
      const date = new Date(log.date);
      let key = '';

      if (reportViewMode === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const q = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${q}`;
      }

      timeKeys.add(key);
      medicationKeys.add(log.medicationName);

      if (!dataMap[log.medicationName]) dataMap[log.medicationName] = {};
      dataMap[log.medicationName][key] = (dataMap[log.medicationName][key] || 0) + log.quantity;
    });

    const sortedTimeKeys = Array.from(timeKeys).sort();
    const sortedMedications = Array.from(medicationKeys).sort();

    const columnTotals: Record<string, number> = {};
    sortedTimeKeys.forEach(k => columnTotals[k] = 0);
    let grandTotal = 0;

    const rows = sortedMedications.map(med => {
      let rowTotal = 0;
      const cells = sortedTimeKeys.map(timeKey => {
        const val = dataMap[med][timeKey] || 0;
        rowTotal += val;
        columnTotals[timeKey] += val;
        return val;
      });
      grandTotal += rowTotal;
      return { name: med, cells, total: rowTotal };
    });

    return {
      columns: sortedTimeKeys,
      rows,
      columnTotals,
      grandTotal
    };
  }, [logs, reportStartDate, reportEndDate, reportViewMode]);

  const formatTimeHeader = (key: string) => {
    const [year, part] = key.split('-');
    if (part.startsWith('Q')) {
      return `${part}/${year}`;
    }
    const date = new Date(Number(year), Number(part) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
  };

  // --- HANDLERS ---

  const handleUpdateStatus = async (id: string, status: 'ORDERED' | 'RECEIVED') => {
    try {
      await purchaseRequestsApi.update(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status');
    }
  };

  const handleReceiveOrder = (req: PurchaseRequest) => {
    setFulfillingRequestId(req.id);
    setEntryMedication(req.medicationName);
    setEntryQuantity(req.suggestedQuantity || 0);
    setActiveTab('entry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryMedication || !entryLot || !entryExpiry || entryQuantity <= 0) return;

    setIsSavingEntry(true);
    setError(null);

    try {
      const newItem = {
        medicationName: entryMedication,
        lotNumber: entryLot,
        expiryDate: entryExpiry,
        quantity: Number(entryQuantity),
        unit: entryUnit,
      };

      const created = await inventoryApi.create(newItem);
      setInventory(prev => [...prev, created]);

      if (fulfillingRequestId) {
        await handleUpdateStatus(fulfillingRequestId, 'RECEIVED');
        setFulfillingRequestId(null);
        alert('Pedido recebido e estoque atualizado com sucesso!');
      } else {
        alert('Entrada de estoque realizada com sucesso!');
      }

      setEntryLot('');
      setEntryQuantity(0);
      setEntryExpiry('');
      setActiveTab('list');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar entrada');
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActiveIngredient || !newDosage) return;

    setIsSavingMed(true);
    setError(null);

    try {
      const newMed = {
        activeIngredient: newActiveIngredient,
        dosage: newDosage,
        tradeName: newTradeName || undefined,
        manufacturer: newManufacturer || undefined,
        pharmaceuticalForm: newForm
      };

      const created = await medicationsApi.create(newMed);
      setMedications(prev => [...prev, created]);

      setNewActiveIngredient('');
      setNewDosage('');
      setNewTradeName('');
      setNewManufacturer('');
      setNewForm('Ampola');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar medicamento');
    } finally {
      setIsSavingMed(false);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!window.confirm('Excluir este medicamento da lista de cadastro?')) return;

    try {
      await medicationsApi.delete(id);
      setMedications(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir medicamento');
    }
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
    setEditExpiry(item.expiryDate);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    setError(null);

    try {
      const updates = {
        quantity: Number(editQuantity),
        expiryDate: editExpiry
      };

      const updated = await inventoryApi.update(editingItem.id, updates);
      setInventory(prev => prev.map(i => i.id === editingItem.id ? updated : i));

      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar estoque');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-pink-600" />
        <span className="ml-3 text-slate-600">Carregando estoque...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <Package size={28} className="mr-3 text-pink-600" />
            Estoque de Medicações
          </h1>
          <p className="text-slate-500 mt-1">Gestão de lotes, dispensação e compras.</p>
        </div>

        {/* TABS */}
        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'list' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Estoque Atual
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'medications' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Cadastro Itens
          </button>
          <button
            onClick={() => setActiveTab('entry')}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'entry' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Dar Entrada
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'orders' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Pedidos
            {requests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                {requests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'reports' ? 'bg-pink-50 text-pink-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <PieChart size={16} className="mr-2" />
            Relatórios Gerenciais
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertTriangle size={20} className="text-red-600 mr-3" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">&times;</button>
        </div>
      )}

      {/* --- TAB: LISTA --- */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar medicação..."
              className="block w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid gap-4">
            {groupedInventory.map(group => (
              <div key={group.name} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">{group.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${group.total > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    Total: {group.total}
                  </span>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-white">
                    <tr>
                      <th className="px-6 py-2">Lote</th>
                      <th className="px-6 py-2">Validade</th>
                      <th className="px-6 py-2">Entrada</th>
                      <th className="px-6 py-2 text-right">Quantidade</th>
                      <th className="px-6 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.lots.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-mono text-slate-600">{item.lotNumber}</td>
                        <td className="px-6 py-3">
                          {formatDate(item.expiryDate)}
                          {new Date(item.expiryDate) < new Date() && (
                            <span className="ml-2 text-red-600 text-xs font-bold">(Vencido)</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-slate-500">{formatDate(item.entryDate)}</td>
                        <td className="px-6 py-3 text-right font-bold text-slate-800">{item.quantity} {item.unit}</td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                            title="Editar Estoque"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {groupedInventory.length === 0 && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                Nenhum item encontrado no estoque.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB: CADASTRO MEDICAMENTOS --- */}
      {activeTab === 'medications' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <Pill size={20} className="mr-2 text-pink-600" />
              Cadastrar Novo Medicamento
            </h3>
            <form onSubmit={handleSaveMedication} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Comercial (Opc)</label>
                <input
                  type="text"
                  placeholder="Ex: Neodeca"
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={newTradeName}
                  onChange={e => setNewTradeName(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Laboratório (Opc)</label>
                <input
                  type="text"
                  placeholder="Ex: Eurofarma"
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={newManufacturer}
                  onChange={e => setNewManufacturer(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Princípio Ativo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Acetato de Leuprorrelina"
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={newActiveIngredient}
                  onChange={e => setNewActiveIngredient(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apresentação (Dosagem)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 3.75mg"
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={newDosage}
                  onChange={e => setNewDosage(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Forma Farmacêutica</label>
                <select
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={newForm}
                  onChange={e => setNewForm(e.target.value)}
                >
                  <option>Ampola</option>
                  <option>Frasco</option>
                  <option>Seringa Pronta</option>
                  <option>Pó Liofilizado</option>
                  <option>Comprimido</option>
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={isSavingMed}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 font-medium flex items-center disabled:opacity-50"
                >
                  {isSavingMed ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  <span className="ml-2">Cadastrar</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-700">Medicamentos Cadastrados</h3>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-white">
                <tr>
                  <th className="px-6 py-3">Nome Comercial</th>
                  <th className="px-6 py-3">Princípio Ativo</th>
                  <th className="px-6 py-3">Apresentação</th>
                  <th className="px-6 py-3">Forma</th>
                  <th className="px-6 py-3">Laboratório</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medications.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhum medicamento cadastrado.</td></tr>
                ) : (
                  medications.map(med => (
                    <tr key={med.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-800 font-medium">{med.tradeName || '-'}</td>
                      <td className="px-6 py-3 text-slate-600 font-medium">{med.activeIngredient}</td>
                      <td className="px-6 py-3">{med.dosage}</td>
                      <td className="px-6 py-3 text-slate-500">{med.pharmaceuticalForm || '-'}</td>
                      <td className="px-6 py-3 text-slate-500">{med.manufacturer || '-'}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDeleteMedication(med.id)}
                          className="text-slate-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: ENTRADA --- */}
      {activeTab === 'entry' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
            <Plus size={20} className="mr-2 text-pink-600" />
            Registrar Entrada de Lote
          </h3>

          {fulfillingRequestId && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start animate-in slide-in-from-top-2">
              <ShoppingCart size={18} className="text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-bold text-blue-800">Recebendo Pedido</p>
                <p className="text-sm text-blue-600 mt-1">
                  Preencha os dados do lote físico para concluir o recebimento deste pedido.
                  O pedido será marcado como <span className="font-bold">RECEBIDO</span> após salvar.
                </p>
                <button onClick={() => { setFulfillingRequestId(null); setEntryMedication(''); setEntryQuantity(0); }} className="text-xs text-blue-500 underline mt-2 hover:text-blue-700">
                  Cancelar vínculo (Entrada avulsa)
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveEntry} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medicação</label>
              <select
                required
                className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                value={entryMedication}
                onChange={e => setEntryMedication(e.target.value)}
              >
                <option value="" disabled>Selecione um medicamento cadastrado...</option>
                {medications.map(med => (
                  <option key={med.id} value={`${med.activeIngredient} ${med.dosage}`.trim()}>
                    {med.tradeName ? `${med.tradeName} - ` : ''}{med.activeIngredient} {med.dosage} {med.manufacturer ? `(${med.manufacturer})` : ''}
                  </option>
                ))}
              </select>
              {medications.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Cadastre medicamentos na aba "Cadastro Itens" primeiro.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número do Lote</label>
                <input
                  type="text"
                  required
                  placeholder="Verifique na caixa"
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={entryLot}
                  onChange={e => setEntryLot(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data de Validade</label>
                <input
                  type="date"
                  required
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={entryExpiry}
                  onChange={e => setEntryExpiry(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade Recebida</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={entryQuantity}
                  onChange={e => setEntryQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                <select
                  className="block w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
                  value={entryUnit}
                  onChange={e => setEntryUnit(e.target.value)}
                >
                  <option>Ampola</option>
                  <option>Frasco</option>
                  <option>Caixa</option>
                  <option>Comprimido</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSavingEntry}
                className="flex items-center bg-pink-600 text-white px-6 py-2.5 rounded-lg hover:bg-pink-700 font-medium disabled:opacity-50"
              >
                {isSavingEntry ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Check size={18} className="mr-2" />}
                {fulfillingRequestId ? 'Confirmar Recebimento e Salvar' : 'Salvar e Adicionar ao Estoque'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- TAB: PEDIDOS --- */}
      {activeTab === 'orders' && (
        <SectionCard
          title="Pedidos de Compra (Automáticos)"
          icon={<ShoppingCart size={18} className="text-purple-600" />}
          headerBg="bg-purple-50/30"
        >
          <div className="p-4 bg-purple-50/50 text-purple-800 text-sm mb-4 rounded-lg flex items-start mx-4 mt-4">
            <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <p>O sistema gera pedidos automaticamente quando o estoque é insuficiente para cobrir as doses agendadas dos próximos 10 dias.</p>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">Data Gerado</th>
                <th className="px-6 py-3">Medicação</th>
                <th className="px-6 py-3">Estoque Atual</th>
                <th className="px-6 py-3">Demanda (10d)</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Nenhum pedido de compra necessário no momento.</td></tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">{formatDate(req.createdAt)}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{req.medicationName}</td>
                    <td className="px-6 py-4 text-red-600 font-bold">{req.currentStock}</td>
                    <td className="px-6 py-4">{req.predictedConsumption10Days}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${req.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                          req.status === 'ORDERED' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                        {req.status === 'PENDING' ? 'Pendente' : req.status === 'ORDERED' ? 'Comprado' : 'Recebido'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {req.status === 'PENDING' && (
                          <button onClick={() => handleUpdateStatus(req.id, 'ORDERED')} className="text-blue-600 hover:underline text-xs font-bold border border-blue-200 px-2 py-1 rounded hover:bg-blue-50">
                            Marcar Comprado
                          </button>
                        )}
                        {req.status === 'ORDERED' && (
                          <button
                            onClick={() => handleReceiveOrder(req)}
                            className="text-white bg-green-600 hover:bg-green-700 text-xs font-bold px-3 py-1.5 rounded flex items-center transition-colors shadow-sm"
                          >
                            Receber <ArrowRight size={12} className="ml-1" />
                          </button>
                        )}
                        {req.status === 'RECEIVED' && (
                          <span className="text-slate-400 text-xs italic flex items-center">
                            <Check size={12} className="mr-1" /> Concluído
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </SectionCard>
      )}

      {/* --- TAB: RELATÓRIOS --- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-pink-600" />
              <h3 className="font-bold text-slate-800">Relatório de Dispensação</h3>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Início</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={e => setReportStartDate(e.target.value)}
                  className="border border-slate-300 rounded-lg text-sm px-2 py-1.5 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Fim</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={e => setReportEndDate(e.target.value)}
                  className="border border-slate-300 rounded-lg text-sm px-2 py-1.5 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div className="flex flex-col h-full justify-end">
                <button
                  onClick={() => setReportViewMode(prev => prev === 'monthly' ? 'quarterly' : 'monthly')}
                  className="flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-200 h-[34px]"
                >
                  <ArrowRightLeft size={14} className="mr-2" />
                  {reportViewMode === 'monthly' ? 'Visão Mensal' : 'Visão Trimestral'}
                </button>
              </div>
            </div>
          </div>

          <SectionCard title={`Dispensação ${reportViewMode === 'monthly' ? 'Mensal' : 'Trimestral'} (Unidades)`} icon={<BarChart3 size={18} className="text-slate-600" />} headerBg="bg-slate-50">
            {reportMatrix.rows.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                Nenhum dado encontrado no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100 text-xs text-slate-600 uppercase font-bold sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200 min-w-[200px] bg-slate-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Medicamento
                      </th>
                      {reportMatrix.columns.map(col => (
                        <th key={col} className="px-4 py-3 border-b border-slate-200 text-center min-w-[80px]">
                          {formatTimeHeader(col)}
                        </th>
                      ))}
                      <th className="px-4 py-3 border-b border-slate-200 text-right bg-pink-50 text-pink-700 min-w-[80px]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportMatrix.rows.map((row) => (
                      <tr key={row.name} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800 bg-white sticky left-0 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          {row.name}
                        </td>
                        {row.cells.map((cell, idx) => (
                          <td key={idx} className={`px-4 py-3 text-center ${cell > 0 ? 'font-bold text-slate-700' : 'text-slate-300'}`}>
                            {cell > 0 ? cell : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-bold bg-pink-50/30 text-slate-800">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-700 border-t border-slate-300">
                    <tr>
                      <td className="px-4 py-3 sticky left-0 z-10 bg-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TOTAIS</td>
                      {reportMatrix.columns.map(col => (
                        <td key={col} className="px-4 py-3 text-center">
                          {reportMatrix.columnTotals[col]}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right bg-pink-100 text-pink-800">
                        {reportMatrix.grandTotal}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* --- MODAL DE EDIÇÃO DE ESTOQUE --- */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Lote de Estoque" icon={<Edit2 size={20} className="text-pink-600" />}>
        {editingItem && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Medicação (Fixo)</label>
              <input
                type="text"
                disabled
                value={editingItem.medicationName}
                className="w-full border-slate-200 bg-slate-50 rounded-lg text-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lote (Fixo)</label>
              <input
                type="text"
                disabled
                value={editingItem.lotNumber}
                className="w-full border-slate-200 bg-slate-50 rounded-lg text-slate-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade Atual</label>
              <input
                type="number"
                min="0"
                required
                value={editQuantity}
                onChange={e => setEditQuantity(Number(e.target.value))}
                className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Validade</label>
              <input
                type="date"
                required
                value={editExpiry}
                onChange={e => setEditExpiry(e.target.value)}
                className="w-full border-slate-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
              />
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {isSavingEdit ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Save size={18} className="mr-2" />}
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default InventoryList;
