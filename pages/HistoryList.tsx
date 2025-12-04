
import React, { useMemo, useState } from 'react';
import { MOCK_DISMISSED_LOGS, MOCK_TREATMENTS, MOCK_PROTOCOLS, MOCK_PATIENTS } from '../services/mockData';
import { TreatmentStatus, ProtocolCategory } from '../types';
import { History, Search, Calendar, User, MessageCircle, Filter } from 'lucide-react';
import { formatDate } from '../constants';
import SectionCard from '../components/ui/SectionCard';

const HistoryList: React.FC = () => {
  const [filterDays, setFilterDays] = useState<number | 'all'>(30); // Default 30 dias

  // Combinar logs com dados reais para exibição
  const historyItems = useMemo(() => {
    // Mapa para acesso rápido
    const logsMap = new Map(MOCK_DISMISSED_LOGS.map(log => [log.contactId, log]));
    
    const items: any[] = [];
    const today = new Date();
    
    // Calcular data de corte se houver filtro
    let cutoffDate: Date | null = null;
    if (filterDays !== 'all') {
        cutoffDate = new Date();
        cutoffDate.setDate(today.getDate() - filterDays);
    }
    
    // Iterar sobre tratamentos para reconstruir as mensagens que já foram dispensadas
    MOCK_TREATMENTS.forEach(t => {
        const proto = MOCK_PROTOCOLS.find(p => p.id === t.protocolId);
        if (!proto || !proto.milestones) return;

        proto.milestones.forEach(m => {
            const contactId = `${t.id}_m_${m.day}`;
            const log = logsMap.get(contactId);

            // Se existe no log, significa que foi concluído
            if (log) {
                const dismissedAt = new Date(log.dismissedAt);
                
                // Aplicar filtro de data
                if (cutoffDate && dismissedAt < cutoffDate) {
                    return;
                }

                const patient = MOCK_PATIENTS.find(p => p.id === t.patientId);
                if (patient) {
                    items.push({
                        id: contactId,
                        dismissedAt: dismissedAt,
                        patientName: patient.fullName,
                        protocolName: proto.name,
                        message: m.message,
                        isMonitoring: proto.category === ProtocolCategory.MONITORING
                    });
                }
            }
        });
    });

    // Ordenar do mais recente para o mais antigo
    return items.sort((a, b) => b.dismissedAt.getTime() - a.dismissedAt.getTime());
  }, [filterDays]); // Recalcular quando o filtro mudar

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
                <History size={28} className="mr-3 text-pink-600" />
                Histórico de Mensagens
            </h1>
            <p className="text-slate-500 mt-1">Registro de todas as ações e mensagens da régua de contato já concluídas.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <div className="pl-2 pr-1 text-slate-400">
                <Filter size={18} />
            </div>
            <select 
                value={filterDays}
                onChange={(e) => setFilterDays(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer py-1.5 pr-8 pl-1"
            >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="60">Últimos 60 dias</option>
                <option value="all">Todo o período</option>
            </select>
        </div>
      </div>

      <SectionCard 
        title="Mensagens Enviadas / Concluídas" 
        icon={<MessageCircle size={18} className="text-slate-600" />}
        countBadge={historyItems.length}
        badgeColor="bg-slate-100 text-slate-600"
      >
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                        <th className="px-6 py-4">Data/Hora Envio</th>
                        <th className="px-6 py-4">Paciente</th>
                        <th className="px-6 py-4">Protocolo</th>
                        <th className="px-6 py-4">Mensagem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {historyItems.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                Nenhum histórico registrado no período selecionado.
                            </td>
                        </tr>
                    ) : (
                        historyItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-700 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400" />
                                        {formatDate(item.dismissedAt)}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 ml-6">
                                        {item.dismissedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">
                                    {item.patientName}
                                </td>
                                <td className="px-6 py-4">
                                     {item.isMonitoring ? (
                                         <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-100 font-medium">
                                             {item.protocolName}
                                         </span>
                                     ) : (
                                         <span className="text-slate-600">{item.protocolName}</span>
                                     )}
                                </td>
                                <td className="px-6 py-4 text-slate-600 max-w-md truncate" title={item.message}>
                                    {item.message}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </SectionCard>
    </div>
  );
};

export default HistoryList;
