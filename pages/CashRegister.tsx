import React, { useState, useEffect, useMemo } from 'react';
import { salesApi } from '../services/api';
import { Sale, PendingSale, SalesKPI, LotPricing, MonthlyReport, PaymentMethod } from '../types';
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, FileText, Package,
  Loader2, AlertTriangle, Calendar, CreditCard, Receipt, ArrowUp, ArrowDown,
  Plus, Edit2, Trash2, Check, X, Filter, RefreshCw, PieChart, BarChart3
} from 'lucide-react';
import SectionCard from '../components/ui/SectionCard';
import Modal from '../components/ui/Modal';
import { formatDate } from '../constants';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'PIX',
  CARD: 'Cartão',
  BOLETO: 'Boleto'
};

const PERIOD_LABELS: Record<string, string> = {
  month: 'Mês Atual',
  '3months': '3 Meses',
  year: 'Ano',
  all: 'Todo Período'
};

const CashRegister: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'pricing' | 'report'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [kpis, setKpis] = useState<SalesKPI | null>(null);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [lotPricing, setLotPricing] = useState<LotPricing[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);

  // Filter States
  const [kpiPeriod, setKpiPeriod] = useState<'month' | '3months' | 'year' | 'all'>('month');
  const [pricingSortBy, setPricingSortBy] = useState<'margin' | 'profit' | 'medication'>('margin');
  const [pricingSortOrder, setPricingSortOrder] = useState<'asc' | 'desc'>('desc');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);

  // Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<PendingSale | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Form States
  const [formSalePrice, setFormSalePrice] = useState(0);
  const [formCommission, setFormCommission] = useState(0);
  const [formTax, setFormTax] = useState(0);
  const [formDelivery, setFormDelivery] = useState(0);
  const [formOther, setFormOther] = useState(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('PIX');
  const [isSaving, setIsSaving] = useState(false);

  // Load data
  useEffect(() => {
  loadData();
  }, []);

  useEffect(() => {
  loadKPIs();
  }, [kpiPeriod]);

  useEffect(() => {
  loadLotPricing();
  }, [pricingSortBy, pricingSortOrder]);

  useEffect(() => {
  loadMonthlyReport();
  }, [reportYear, reportMonth]);

  const loadData = async () => {
  try {
    setIsLoading(true);
    setError(null);
    await Promise.all([
    loadKPIs(),
    loadPendingSales(),
    loadLotPricing(),
    loadMonthlyReport()
    ]);
  } catch (err: any) {
    setError(err.message || 'Erro ao carregar dados');
  } finally {
    setIsLoading(false);
  }
  };

  const loadKPIs = async () => {
  try {
    const result = await salesApi.getKPIs(kpiPeriod);
    setKpis(result);
  } catch (err: any) {
    console.error('Failed to load KPIs:', err);
  }
  };

  const loadPendingSales = async () => {
  try {
    const result = await salesApi.getPending();
    setPendingSales(result.data || []);
  } catch (err: any) {
    console.error('Failed to load pending sales:', err);
  }
  };

  const loadLotPricing = async () => {
  try {
    const result = await salesApi.getLotPricing(pricingSortBy, pricingSortOrder);
    setLotPricing(result.data || []);
  } catch (err: any) {
    console.error('Failed to load lot pricing:', err);
  }
  };

  const loadMonthlyReport = async () => {
  try {
    const result = await salesApi.getMonthlyReport(reportYear, reportMonth);
    setMonthlyReport(result);
  } catch (err: any) {
    console.error('Failed to load monthly report:', err);
  }
  };

  // Calculate real-time profit preview
  const calculatedProfit = useMemo(() => {
  if (!selectedPending?.defaults) return { gross: 0, net: 0, margin: 0 };
  const unitCost = selectedPending.defaults.unitCost || 0;
  const gross = formSalePrice - unitCost;
  const opex = formCommission + formTax + formDelivery + formOther;
  const net = gross - opex;
  const margin = formSalePrice > 0 ? (net / formSalePrice) * 100 : 0;
  return { gross, net, margin };
  }, [selectedPending, formSalePrice, formCommission, formTax, formDelivery, formOther]);

  // Handlers
  const handleOpenRegister = (pending: PendingSale) => {
  setSelectedPending(pending);
  if (pending.defaults) {
    setFormSalePrice(pending.defaults.salePrice);
    setFormCommission(pending.defaults.commission);
    setFormTax(pending.defaults.tax);
    setFormDelivery(pending.defaults.delivery);
    setFormOther(pending.defaults.other);
  } else {
    setFormSalePrice(0);
    setFormCommission(0);
    setFormTax(0);
    setFormDelivery(0);
    setFormOther(0);
  }
  setFormPaymentMethod('PIX');
  setIsRegisterModalOpen(true);
  };

  const handleRegisterSale = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedPending) return;

  setIsSaving(true);
  try {
    await salesApi.create({
    doseId: selectedPending.doseId,
    salePrice: formSalePrice,
    commission: formCommission,
    tax: formTax,
    delivery: formDelivery,
    other: formOther,
    paymentMethod: formPaymentMethod
    });

    setIsRegisterModalOpen(false);
    setSelectedPending(null);
    await Promise.all([loadPendingSales(), loadKPIs(), loadMonthlyReport()]);
    alert('Venda registrada com sucesso!');
  } catch (err: any) {
    setError(err.message || 'Erro ao registrar venda');
  } finally {
    setIsSaving(false);
  }
  };

  const handleOpenEdit = (sale: Sale) => {
  setSelectedSale(sale);
  setFormSalePrice(sale.salePrice);
  setFormCommission(sale.commission);
  setFormTax(sale.tax);
  setFormDelivery(sale.delivery);
  setFormOther(sale.other);
  setFormPaymentMethod(sale.paymentMethod);
  setIsEditModalOpen(true);
  };

  const handleUpdateSale = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedSale) return;

  setIsSaving(true);
  try {
    await salesApi.update(selectedSale.id, {
    salePrice: formSalePrice,
    commission: formCommission,
    tax: formTax,
    delivery: formDelivery,
    other: formOther,
    paymentMethod: formPaymentMethod
    });

    setIsEditModalOpen(false);
    setSelectedSale(null);
    await Promise.all([loadKPIs(), loadMonthlyReport()]);
    alert('Venda atualizada com sucesso!');
  } catch (err: any) {
    setError(err.message || 'Erro ao atualizar venda');
  } finally {
    setIsSaving(false);
  }
  };

  const handleDeleteSale = async (id: string) => {
  if (!window.confirm('Excluir este registro de venda? A dose voltará para "Vendas Pendentes".')) return;

  try {
    await salesApi.delete(id);
    await Promise.all([loadPendingSales(), loadKPIs(), loadMonthlyReport()]);
  } catch (err: any) {
    setError(err.message || 'Erro ao excluir venda');
  }
  };

  const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
    <Loader2 size={32} className="animate-spin text-emerald-600" />
    <span className="ml-3 text-slate-600">Carregando dados financeiros...</span>
    </div>
  );
  }

  return (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-slate-800 flex items-center">
      <DollarSign size={28} className="mr-3 text-emerald-600" />
      CAIXA - Módulo Financeiro
      </h1>
      <p className="text-slate-500 mt-1">Registro de vendas, análise de lucratividade e relatórios.</p>
    </div>

    {/* Tabs */}
    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm overflow-x-auto">
      <button
      onClick={() => setActiveTab('overview')}
      className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'overview' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
      >
      <BarChart3 size={16} className="inline mr-2" />
      Visão Geral
      </button>
      <button
      onClick={() => setActiveTab('pending')}
      className={`flex items-center px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'pending' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
      >
      <ShoppingCart size={16} className="mr-2" />
      Vendas Pendentes
      {pendingSales.length > 0 && (
        <span className="ml-2 bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
        {pendingSales.length}
        </span>
      )}
      </button>
      <button
      onClick={() => setActiveTab('pricing')}
      className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'pricing' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
      >
      <Package size={16} className="inline mr-2" />
      Preços por Lote
      </button>
      <button
      onClick={() => setActiveTab('report')}
      className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'report' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
      >
      <FileText size={16} className="inline mr-2" />
      Relatório Mensal
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

    {/* Tab: Overview / KPIs */}
    {activeTab === 'overview' && (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
      <Filter size={16} className="text-slate-400" />
      <span className="text-sm font-medium text-slate-600">Período:</span>
      <div className="flex gap-1">
        {(['month', '3months', 'year', 'all'] as const).map(period => (
        <button
          key={period}
          onClick={() => setKpiPeriod(period)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${kpiPeriod === period ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          {PERIOD_LABELS[period]}
        </button>
        ))}
      </div>
      <button
        onClick={loadData}
        className="ml-auto p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        title="Atualizar dados"
      >
        <RefreshCw size={16} />
      </button>
      </div>

      {/* KPI Cards */}
      {kpis && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase">Receita Bruta</span>
          <DollarSign size={16} className="text-emerald-500" />
        </div>
        <div className="text-xl font-bold text-slate-800">{formatCurrency(kpis.current.grossRevenue)}</div>
        {kpis.variation && kpis.variation.grossRevenue.percent && (
          <div className={`flex items-center text-xs mt-1 ${Number(kpis.variation.grossRevenue.percent) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {Number(kpis.variation.grossRevenue.percent) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span className="ml-1">{kpis.variation.grossRevenue.percent}%</span>
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-2">Total das vendas no período</p>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase">Total Vendas</span>
          <Receipt size={16} className="text-blue-500" />
        </div>
        <div className="text-xl font-bold text-slate-800">{kpis.current.totalSales}</div>
        {kpis.variation && kpis.variation.totalSales.percent && (
          <div className={`flex items-center text-xs mt-1 ${Number(kpis.variation.totalSales.percent) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {Number(kpis.variation.totalSales.percent) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span className="ml-1">{kpis.variation.totalSales.percent}%</span>
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-2">Quantidade de vendas realizadas</p>
        </div>

        {/* CMV */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase">CMV</span>
          <Package size={16} className="text-orange-500" />
        </div>
        <div className="text-xl font-bold text-slate-800">{formatCurrency(kpis.current.cmv)}</div>
        <p className="text-[10px] text-slate-400 mt-2">Custo da Mercadoria Vendida</p>
        </div>

        {/* OpEx */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase">OpEx</span>
          <CreditCard size={16} className="text-purple-500" />
        </div>
        <div className="text-xl font-bold text-slate-800">{formatCurrency(kpis.current.opex)}</div>
        <p className="text-[10px] text-slate-400 mt-2">Comissão + Impostos + Entrega + Outros</p>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase">Lucro Líquido</span>
          <TrendingUp size={16} className="text-emerald-600" />
        </div>
        <div className={`text-xl font-bold ${kpis.current.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {formatCurrency(kpis.current.netProfit)}
        </div>
        {kpis.variation && kpis.variation.netProfit.percent && (
          <div className={`flex items-center text-xs mt-1 ${Number(kpis.variation.netProfit.percent) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {Number(kpis.variation.netProfit.percent) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span className="ml-1">{kpis.variation.netProfit.percent}%</span>
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-2">Receita - CMV - OpEx</p>
        </div>

        {/* Net Margin */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase">Margem Líquida</span>
          <PieChart size={16} className="text-pink-500" />
        </div>
        <div className={`text-xl font-bold ${Number(kpis.current.netMargin) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {kpis.current.netMargin}%
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Lucro líquido / Receita bruta</p>
        </div>
      </div>
      )}

      {/* Comparison Info */}
      {kpis?.previous && kpiPeriod !== 'all' && (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="text-sm font-bold text-slate-700 mb-2">Comparativo com Período Anterior</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-slate-500">Receita Anterior:</span>
          <span className="ml-2 font-medium">{formatCurrency(kpis.previous.grossRevenue)}</span>
        </div>
        <div>
          <span className="text-slate-500">Vendas Anteriores:</span>
          <span className="ml-2 font-medium">{kpis.previous.totalSales}</span>
        </div>
        <div>
          <span className="text-slate-500">Lucro Anterior:</span>
          <span className="ml-2 font-medium">{formatCurrency(kpis.previous.netProfit)}</span>
        </div>
        </div>
      </div>
      )}
    </div>
    )}

    {/* Tab: Pending Sales */}
    {activeTab === 'pending' && (
    <SectionCard
      title="Vendas Pendentes"
      icon={<ShoppingCart size={18} className="text-orange-600" />}
      headerBg="bg-orange-50/30"
      badge={pendingSales.length > 0 ? pendingSales.length.toString() : undefined}
    >
      <div className="p-4 bg-orange-50/50 text-orange-800 text-sm mb-4 rounded-lg flex items-start mx-4 mt-4">
      <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
      <p>Aplicações realizadas e pagas que ainda não foram registradas no CAIXA. Clique em "Registrar Venda" para concluir o lançamento financeiro.</p>
      </div>

      <table className="w-full text-sm text-left">
      <thead className="text-xs text-slate-500 uppercase bg-slate-50">
        <tr>
        <th className="px-6 py-3">Data Aplicação</th>
        <th className="px-6 py-3">Paciente</th>
        <th className="px-6 py-3">Medicação</th>
        <th className="px-6 py-3">Lote</th>
        <th className="px-6 py-3">Preço Sugerido</th>
        <th className="px-6 py-3 text-right">Ação</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {pendingSales.length === 0 ? (
        <tr>
          <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
          Nenhuma venda pendente de registro.
          </td>
        </tr>
        ) : (
        pendingSales.map(pending => (
          <tr key={pending.doseId} className="hover:bg-slate-50">
          <td className="px-6 py-4">{formatDate(pending.applicationDate)}</td>
          <td className="px-6 py-4 font-medium text-slate-800">{pending.patientName}</td>
          <td className="px-6 py-4">{pending.inventoryItem?.medicationName || '-'}</td>
          <td className="px-6 py-4 font-mono text-xs">{pending.inventoryItem?.lotNumber || '-'}</td>
          <td className="px-6 py-4">
            {pending.defaults?.salePrice ? (
            <span className="font-medium text-emerald-700">{formatCurrency(pending.defaults.salePrice)}</span>
            ) : (
            <span className="text-slate-400">Não definido</span>
            )}
          </td>
          <td className="px-6 py-4 text-right">
            <button
            onClick={() => handleOpenRegister(pending)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center ml-auto"
            >
            <Plus size={14} className="mr-1" />
            Registrar Venda
            </button>
          </td>
          </tr>
        ))
        )}
      </tbody>
      </table>
    </SectionCard>
    )}

    {/* Tab: Lot Pricing */}
    {activeTab === 'pricing' && (
    <SectionCard
      title="Preços por Lote"
      icon={<Package size={18} className="text-blue-600" />}
      headerBg="bg-blue-50/30"
    >
      <div className="p-4 flex items-center gap-4 border-b border-slate-100">
      <span className="text-sm font-medium text-slate-600">Ordenar por:</span>
      <select
        className="border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
        value={pricingSortBy}
        onChange={e => setPricingSortBy(e.target.value as any)}
      >
        <option value="margin">Margem (%)</option>
        <option value="profit">Lucro (R$)</option>
        <option value="medication">Medicação</option>
      </select>
      <button
        onClick={() => setPricingSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
        title={pricingSortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
      >
        {pricingSortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
      </button>
      </div>

      <table className="w-full text-sm text-left">
      <thead className="text-xs text-slate-500 uppercase bg-slate-50">
        <tr>
        <th className="px-6 py-3">Medicação</th>
        <th className="px-6 py-3">Lote</th>
        <th className="px-6 py-3 text-right">Estoque</th>
        <th className="px-6 py-3 text-right">Custo Unit.</th>
        <th className="px-6 py-3 text-right">Preço Venda</th>
        <th className="px-6 py-3 text-right">Lucro Est.</th>
        <th className="px-6 py-3 text-right">Margem Est.</th>
        <th className="px-6 py-3">Validade</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {lotPricing.length === 0 ? (
        <tr>
          <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
          Nenhum lote com dados financeiros disponível.
          </td>
        </tr>
        ) : (
        lotPricing.map(lot => (
          <tr key={lot.id} className="hover:bg-slate-50">
          <td className="px-6 py-4 font-medium text-slate-800">{lot.medicationName}</td>
          <td className="px-6 py-4 font-mono text-xs">{lot.lotNumber}</td>
          <td className="px-6 py-4 text-right">{lot.quantity}</td>
          <td className="px-6 py-4 text-right">{formatCurrency(lot.unitCost || 0)}</td>
          <td className="px-6 py-4 text-right font-medium">{formatCurrency(lot.baseSalePrice || 0)}</td>
          <td className={`px-6 py-4 text-right font-bold ${lot.estimatedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(lot.estimatedProfit)}
          </td>
          <td className="px-6 py-4 text-right">
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${lot.estimatedMargin >= 30 ? 'bg-emerald-100 text-emerald-700' :
              lot.estimatedMargin >= 15 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
            {lot.estimatedMargin.toFixed(1)}%
            </span>
          </td>
          <td className="px-6 py-4">
            <span className={new Date(lot.expiryDate) < new Date() ? 'text-red-600 font-bold' : ''}>
            {formatDate(lot.expiryDate)}
            </span>
          </td>
          </tr>
        ))
        )}
      </tbody>
      </table>
    </SectionCard>
    )}

    {/* Tab: Monthly Report */}
    {activeTab === 'report' && (
    <div className="space-y-6">
      {/* Month/Year Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
      <Calendar size={18} className="text-slate-400" />
      <span className="text-sm font-medium text-slate-600">Período:</span>
      <select
        className="border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
        value={reportMonth}
        onChange={e => setReportMonth(Number(e.target.value))}
      >
        {[...Array(12)].map((_, i) => (
        <option key={i + 1} value={i + 1}>
          {new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
        </option>
        ))}
      </select>
      <select
        className="border-slate-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
        value={reportYear}
        onChange={e => setReportYear(Number(e.target.value))}
      >
        {[2023, 2024, 2025, 2026].map(year => (
        <option key={year} value={year}>{year}</option>
        ))}
      </select>
      </div>

      {monthlyReport && (
      <>
        {/* Monthly Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Resumo do Mês</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500 uppercase">Receita</span>
          <div className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(monthlyReport.summary.grossRevenue)}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500 uppercase">CMV</span>
          <div className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(monthlyReport.summary.cmv)}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500 uppercase">OpEx</span>
          <div className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(monthlyReport.summary.opex)}</div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg">
          <span className="text-xs text-emerald-600 uppercase">Lucro Líquido</span>
          <div className={`text-lg font-bold mt-1 ${monthlyReport.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(monthlyReport.summary.netProfit)}
          </div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg">
          <span className="text-xs text-emerald-600 uppercase">Margem</span>
          <div className={`text-lg font-bold mt-1 ${Number(monthlyReport.summary.netMargin) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {monthlyReport.summary.netMargin}%
          </div>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Por Forma de Pagamento</h4>
          <div className="grid grid-cols-3 gap-4">
          {Object.entries(monthlyReport.byPaymentMethod).map(([method, data]) => (
            <div key={method} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-slate-700">{PAYMENT_METHOD_LABELS[method] || method}</span>
              <span className="text-xs text-slate-400 ml-2">({data.count} vendas)</span>
            </div>
            <span className="font-bold text-slate-800">{formatCurrency(data.total)}</span>
            </div>
          ))}
          </div>
        </div>
        </div>

        {/* Sales History */}
        <SectionCard
        title="Histórico de Vendas"
        icon={<FileText size={18} className="text-slate-600" />}
        headerBg="bg-slate-50"
        badge={monthlyReport.sales.length.toString()}
        >
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
          <tr>
            <th className="px-6 py-3">Data</th>
            <th className="px-6 py-3">Paciente</th>
            <th className="px-6 py-3">Medicação</th>
            <th className="px-6 py-3 text-right">Valor Venda</th>
            <th className="px-6 py-3 text-right">Lucro</th>
            <th className="px-6 py-3">Pagamento</th>
            <th className="px-6 py-3 text-right">Ação</th>
          </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
          {monthlyReport.sales.length === 0 ? (
            <tr>
            <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
              Nenhuma venda registrada neste mês.
            </td>
            </tr>
          ) : (
            monthlyReport.sales.map(sale => (
            <tr key={sale.id} className="hover:bg-slate-50">
              <td className="px-6 py-4">{formatDate(sale.saleDate)}</td>
              <td className="px-6 py-4 font-medium text-slate-800">{sale.patient?.fullName || '-'}</td>
              <td className="px-6 py-4">{sale.inventoryItem?.medicationName || '-'}</td>
              <td className="px-6 py-4 text-right font-medium">{formatCurrency(sale.salePrice)}</td>
              <td className={`px-6 py-4 text-right font-bold ${sale.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(sale.netProfit)}
              </td>
              <td className="px-6 py-4">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${sale.paymentMethod === 'PIX' ? 'bg-emerald-100 text-emerald-700' :
                sale.paymentMethod === 'CARD' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}
              </span>
              </td>
              <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                onClick={() => handleOpenEdit(sale)}
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Editar"
                >
                <Edit2 size={16} />
                </button>
                <button
                onClick={() => handleDeleteSale(sale.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir"
                >
                <Trash2 size={16} />
                </button>
              </div>
              </td>
            </tr>
            ))
          )}
          </tbody>
        </table>
        </SectionCard>
      </>
      )}
    </div>
    )}

    {/* Register Sale Modal */}
    <Modal
    open={isRegisterModalOpen}
    onClose={() => setIsRegisterModalOpen(false)}
    title="Registrar Venda"
    icon={<DollarSign size={20} className="text-emerald-600" />}
    >
    {selectedPending && (
      <form onSubmit={handleRegisterSale} className="space-y-4">
      {/* Patient & Medication Info */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
        <span className="text-slate-500">Paciente:</span>
        <span className="font-medium text-slate-800">{selectedPending.patientName}</span>
        </div>
        <div className="flex justify-between text-sm">
        <span className="text-slate-500">Medicação:</span>
        <span className="font-medium">{selectedPending.inventoryItem?.medicationName || '-'}</span>
        </div>
        <div className="flex justify-between text-sm">
        <span className="text-slate-500">Data Aplicação:</span>
        <span>{formatDate(selectedPending.applicationDate)}</span>
        </div>
        <div className="flex justify-between text-sm">
        <span className="text-slate-500">Custo Unitário:</span>
        <span className="font-medium text-orange-600">{formatCurrency(selectedPending.defaults?.unitCost || 0)}</span>
        </div>
      </div>

      {!selectedPending.defaults?.salePrice && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
        <AlertTriangle size={14} className="inline mr-1" />
        Este lote não possui preço padrão. Preencha os valores manualmente.
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formSalePrice || ''}
          onChange={e => setFormSalePrice(Number(e.target.value))}
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Comissão (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formCommission || ''}
          onChange={e => setFormCommission(Number(e.target.value))}
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Impostos (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formTax || ''}
          onChange={e => setFormTax(Number(e.target.value))}
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Entrega (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formDelivery || ''}
          onChange={e => setFormDelivery(Number(e.target.value))}
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Outros (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formOther || ''}
          onChange={e => setFormOther(Number(e.target.value))}
        />
        </div>
        <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
        <select
          required
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formPaymentMethod}
          onChange={e => setFormPaymentMethod(e.target.value)}
        >
          <option value="PIX">PIX</option>
          <option value="CARD">Cartão</option>
          <option value="BOLETO">Boleto</option>
        </select>
        </div>
      </div>

      {/* Real-time Profit Preview */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="text-sm font-bold text-emerald-700 mb-2">Cálculo em Tempo Real</h4>
        <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-emerald-600">Lucro Bruto:</span>
          <span className="font-medium">{formatCurrency(calculatedProfit.gross)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-emerald-600">Lucro Líquido:</span>
          <span className={`font-bold ${calculatedProfit.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {formatCurrency(calculatedProfit.net)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-emerald-600">Margem Líquida:</span>
          <span className={`font-bold ${calculatedProfit.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {calculatedProfit.margin.toFixed(1)}%
          </span>
        </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <button
        type="button"
        onClick={() => setIsRegisterModalOpen(false)}
        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
        Cancelar
        </button>
        <button
        type="submit"
        disabled={isSaving || formSalePrice <= 0}
        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
        {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Check size={18} className="mr-2" />}
        Registrar Venda
        </button>
      </div>
      </form>
    )}
    </Modal>

    {/* Edit Sale Modal */}
    <Modal
    open={isEditModalOpen}
    onClose={() => setIsEditModalOpen(false)}
    title="Editar Venda"
    icon={<Edit2 size={20} className="text-emerald-600" />}
    >
    {selectedSale && (
      <form onSubmit={handleUpdateSale} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Venda (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          required
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formSalePrice || ''}
          onChange={e => setFormSalePrice(Number(e.target.value))}
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Comissão (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formCommission || ''}
          onChange={e => setFormCommission(Number(e.target.value))}
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Impostos (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formTax || ''}
          onChange={e => setFormTax(Number(e.target.value))}
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Entrega (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formDelivery || ''}
          onChange={e => setFormDelivery(Number(e.target.value))}
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Outros (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formOther || ''}
          onChange={e => setFormOther(Number(e.target.value))}
        />
        </div>
        <div className="col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
        <select
          required
          className="w-full border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          value={formPaymentMethod}
          onChange={e => setFormPaymentMethod(e.target.value)}
        >
          <option value="PIX">PIX</option>
          <option value="CARD">Cartão</option>
          <option value="BOLETO">Boleto</option>
        </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button
        type="button"
        onClick={() => setIsEditModalOpen(false)}
        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
        Cancelar
        </button>
        <button
        type="submit"
        disabled={isSaving}
        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
        {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Check size={18} className="mr-2" />}
        Salvar Alterações
        </button>
      </div>
      </form>
    )}
    </Modal>
  </div>
  );
};

export default CashRegister;
