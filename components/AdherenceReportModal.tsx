import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Loader2, FileText, AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { treatmentsApi } from '../services/api';

interface AdherenceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatmentId: string;
  protocolName: string;
}

interface AdherenceReport {
  treatmentId: string;
  patientName: string;
  adherenceClassification: string;
  adherenceDescription: string;
  metrics: {
    totalDoses: number;
    appliedDoses: number;
    missedDoses: number;
    totalDelayDays: number;
    significantDelays: number;
    daysSinceLastApplication: number;
    pendingOverdueDays: number;
  };
  reportText: string;
  generatedAt: string;
}

const AdherenceReportModal: React.FC<AdherenceReportModalProps> = ({
  isOpen,
  onClose,
  treatmentId,
  protocolName,
}) => {
  const [report, setReport] = useState<AdherenceReport | null>(null);
  const [reportText, setReportText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && treatmentId) {
      loadReport();
    }
  }, [isOpen, treatmentId]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await treatmentsApi.getAdherenceReport(treatmentId);
      setReport(data);
      setReportText(data.reportText);
    } catch (err: any) {
      console.error('Error loading adherence report:', err);
      setError(err.message || 'Erro ao carregar relatorio de adesao');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'Boa adesão':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'Adesão parcial':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'Baixa adesão':
        return <AlertCircle className="text-orange-500" size={20} />;
      case 'Possível abandono':
      case 'Abandono confirmado':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <FileText className="text-slate-500" size={20} />;
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Boa adesão':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Adesão parcial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Baixa adesão':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Possível abandono':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Abandono confirmado':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <FileText size={20} className="text-pink-600" />
              Relatorio de Adesao
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{protocolName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-pink-600 mb-3" />
              <p className="text-slate-600">Gerando relatorio...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-600">
              <AlertCircle size={48} className="mb-3" />
              <p className="font-medium">Erro ao carregar relatorio</p>
              <p className="text-sm text-slate-500 mt-1">{error}</p>
              <button
                onClick={loadReport}
                className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : report ? (
            <div className="space-y-4">
              {/* Classification Badge */}
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-bold ${getClassificationColor(report.adherenceClassification)}`}>
                  {getClassificationIcon(report.adherenceClassification)}
                  {report.adherenceClassification}
                </div>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    copied
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copiar Relatorio
                    </>
                  )}
                </button>
              </div>

              {/* Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                  <p className="text-2xl font-bold text-slate-800">{report.metrics.appliedDoses}/{report.metrics.totalDoses}</p>
                  <p className="text-xs text-slate-500">Doses Aplicadas</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                  <p className="text-2xl font-bold text-orange-600">{report.metrics.missedDoses}</p>
                  <p className="text-xs text-slate-500">Doses Perdidas</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                  <p className="text-2xl font-bold text-slate-800">{report.metrics.totalDelayDays}</p>
                  <p className="text-xs text-slate-500">Dias de Atraso</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                  <p className="text-2xl font-bold text-slate-800">{report.metrics.daysSinceLastApplication}</p>
                  <p className="text-xs text-slate-500">Dias da Ultima Dose</p>
                </div>
              </div>

              {/* Report Text - Editable */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Texto do Relatorio (editavel)
                </label>
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  className="w-full h-96 p-4 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-pink-500 focus:border-pink-500 resize-none"
                  placeholder="Relatorio sera carregado aqui..."
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {report && !isLoading && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Fechar
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-medium"
              >
                <Copy size={16} />
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdherenceReportModal;
