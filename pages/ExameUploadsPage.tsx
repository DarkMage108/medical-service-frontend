import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FileUp, Loader2, AlertCircle, Eye, FileText, Clock, CheckCircle2, RefreshCw, X, Wand2, Upload, Search, Trash2, Download, AlertTriangle, UserCheck, UserX } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { patientsApi } from '../services/api';

const VPS_BASE = 'https://api.endocrinokids.com.br/api';
const ADMIN_KEY = 'endoped-exames-2026';

interface ExameUpload {
  id: number;
  patient_id: number;
  patient_name: string;
  admin_patient_id: number | null;
  original_name: string;
  content_type: string;
  status: string;
  transcription: string | null;
  uploaded_at: string;
  patient_name_doc: string | null;
  name_match: string | null;
}

interface PatientOption {
  id: number;
  nome: string;
  patient_id: number | null;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending:      { label: 'Pendente',    cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: Clock },
  transcribed:  { label: 'Transcrito',  cls: 'bg-blue-50 text-blue-700 border-blue-200',          icon: FileText },
  reviewed:     { label: 'Revisado',    cls: 'bg-teal-50 text-teal-700 border-teal-200',          icon: CheckCircle2 },
  verificado:   { label: 'Verificado',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

const adminFetch = (path: string, opts: RequestInit = {}) =>
  fetch(`${VPS_BASE}${path}`, {
    ...opts,
    headers: { 'x-admin-key': ADMIN_KEY, ...opts.headers },
  });

const ExameUploadsPage: React.FC = () => {
  const { toast } = useToast();
  const [uploads, setUploads] = useState<ExameUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState<number | null>(null);
  const [viewingFile, setViewingFile] = useState<{ id: number; url: string; type: string } | null>(null);
  const [viewingTranscription, setViewingTranscription] = useState<ExameUpload | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  // Upload form state
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<number | ''>('');
  const [patientSearch, setPatientSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin platform patients (for registration check)
  const [adminPatientNames, setAdminPatientNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    adminFetch('/admin/pacientes')
      .then(r => r.json())
      .then(d => setPatients(d.patients || []))
      .catch(() => {});
    patientsApi.getAll()
      .then((res: any) => {
        const list = res?.data?.data || res?.data || [];
        const names = new Set<string>(list.map((p: any) => (p.fullName || '').toUpperCase().trim()));
        setAdminPatientNames(names);
      })
      .catch(() => {});
  }, []);

  const hasAdminRegistration = (patientName: string): boolean => {
    if (!patientName || adminPatientNames.size === 0) return false;
    const upper = patientName.toUpperCase().trim();
    if (adminPatientNames.has(upper)) return true;
    const parts = upper.split(/\s+/);
    for (const name of adminPatientNames) {
      const adminParts = name.split(/\s+/);
      const common = parts.filter(p => adminParts.includes(p));
      if (common.length >= 2) return true;
    }
    return false;
  };

  const filteredPatients = patients.filter(p =>
    p.nome.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handleAdminUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('Arquivo muito grande. Maximo 10MB.', 'error');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', String(selectedPatient));
      const resp = await fetch(`${VPS_BASE}/admin/exames/upload`, {
        method: 'POST',
        headers: { 'x-admin-key': ADMIN_KEY },
        body: formData,
      });
      if (!resp.ok) throw new Error('Erro no upload');
      toast('Exame enviado! Transcricao automatica em andamento...', 'success');
      setSelectedPatient('');
      setPatientSearch('');
      setShowUploadForm(false);
      setTimeout(() => loadUploads(), 3000);
      loadUploads();
    } catch {
      toast('Erro ao enviar exame.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadUploads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await adminFetch('/admin/exames/uploads');
      if (!resp.ok) throw new Error('Erro ao carregar');
      const data = await resp.json();
      setUploads(data.uploads || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar exames');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  const handleTranscribe = async (id: number) => {
    setTranscribing(id);
    try {
      const resp = await adminFetch(`/admin/exames/uploads/${id}/transcribe`, { method: 'POST' });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || 'Erro na transcricao');
      }
      const data = await resp.json();
      setUploads(prev => prev.map(u => u.id === id ? {
        ...u,
        transcription: data.transcription,
        status: data.status,
        patient_name_doc: data.patient_name_doc,
        name_match: data.name_match,
      } : u));
      toast('Transcricao concluida!', 'success');
    } catch (err: any) {
      toast(err.message || 'Erro na transcricao', 'error');
    } finally {
      setTranscribing(null);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      const resp = await adminFetch(`/admin/exames/uploads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!resp.ok) throw new Error('Erro ao atualizar status');
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
      toast('Status atualizado', 'success');
    } catch {
      toast('Erro ao atualizar status', 'error');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (upload: ExameUpload) => {
    if (!window.confirm(`Excluir o exame "${upload.original_name}" de ${upload.patient_name}?`)) return;
    setDeleting(upload.id);
    try {
      const resp = await adminFetch(`/admin/exames/uploads/${upload.id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Erro ao excluir');
      setUploads(prev => prev.filter(u => u.id !== upload.id));
      toast('Exame excluido', 'success');
    } catch {
      toast('Erro ao excluir exame', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleViewFile = async (upload: ExameUpload) => {
    try {
      const resp = await adminFetch(`/admin/exames/uploads/${upload.id}/file`);
      if (!resp.ok) throw new Error('Arquivo nao encontrado');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      setViewingFile({ id: upload.id, url, type: upload.content_type });
    } catch {
      toast('Erro ao abrir arquivo', 'error');
    }
  };

  const handleDownload = async (upload: ExameUpload) => {
    try {
      const resp = await adminFetch(`/admin/exames/uploads/${upload.id}/download`);
      if (!resp.ok) throw new Error('Erro');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = upload.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast('Erro ao baixar arquivo', 'error');
    }
  };

  const closeFileViewer = () => {
    if (viewingFile) {
      URL.revokeObjectURL(viewingFile.url);
      setViewingFile(null);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-pink-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={32} className="text-red-400 mb-3" />
        <p className="text-sm text-slate-600 mb-4">{error}</p>
        <button onClick={loadUploads} className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileUp size={24} className="text-pink-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Exames Enviados</h1>
            <p className="text-sm text-slate-500">Exames enviados pelos pacientes e secretaria</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadForm(f => !f)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Upload size={16} />
            Enviar Exame
          </button>
          <button
            onClick={loadUploads}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {showUploadForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Enviar exame de um paciente</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setSelectedPatient(''); }}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400"
                />
              </div>
              {patientSearch && !selectedPatient && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">Nenhum paciente encontrado</div>
                  ) : (
                    filteredPatients.slice(0, 20).map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p.id); setPatientSearch(p.nome); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-pink-50 hover:text-pink-700 transition-colors"
                      >
                        {p.nome}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleAdminUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedPatient || uploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {uploading ? (
                  <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                ) : (
                  <><FileUp size={16} /> Selecionar Arquivo</>
                )}
              </button>
            </div>
          </div>
          {selectedPatient && (
            <p className="mt-2 text-xs text-slate-500">
              Paciente selecionado: <span className="font-bold text-slate-700">{patientSearch}</span>
            </p>
          )}
          <p className="mt-2 text-[10px] text-slate-400">A transcricao e verificacao de nome serao feitas automaticamente apos o envio.</p>
        </div>
      )}

      {uploads.length === 0 ? (
        <div className="text-center py-20">
          <FileUp size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum exame enviado ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastro</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Arquivo</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome no Doc</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Data Envio</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uploads.map(u => {
                  const sc = STATUS_CONFIG[u.status] || STATUS_CONFIG.pending;
                  const StatusIcon = sc.icon;
                  const registered = hasAdminRegistration(u.patient_name);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-800">{u.patient_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        {registered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <UserCheck size={11} />
                            Cadastrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            <UserX size={11} />
                            Sem cadastro
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 max-w-[200px] truncate block">{u.original_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.name_match === 'match' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 size={13} />
                            {u.patient_name_doc}
                          </span>
                        )}
                        {u.name_match === 'mismatch' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                            <AlertTriangle size={13} />
                            {u.patient_name_doc}
                          </span>
                        )}
                        {u.name_match === 'not_found' && (
                          <span className="text-xs text-slate-400 italic">Nao encontrado</span>
                        )}
                        {(!u.name_match || u.name_match === 'unknown') && u.status === 'pending' && (
                          <span className="text-xs text-slate-300">Aguardando transcricao</span>
                        )}
                        {(!u.name_match || u.name_match === 'unknown') && u.status !== 'pending' && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">{formatDate(u.uploaded_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.cls}`}>
                            <StatusIcon size={12} />
                            {sc.label}
                          </span>
                          {u.status !== 'verificado' && (
                            <select
                              value={u.status}
                              onChange={e => handleStatusChange(u.id, e.target.value)}
                              disabled={updatingStatus === u.id}
                              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-600"
                            >
                              <option value="pending">Pendente</option>
                              <option value="transcribed">Transcrito</option>
                              <option value="reviewed">Revisado</option>
                              <option value="verificado">Verificado</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewFile(u)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Visualizar"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownload(u)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Baixar"
                          >
                            <Download size={16} />
                          </button>
                          {u.transcription ? (
                            <button
                              onClick={() => setViewingTranscription(u)}
                              className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Ver transcricao"
                            >
                              <FileText size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTranscribe(u.id)}
                              disabled={transcribing === u.id}
                              className="flex items-center gap-1 px-2 py-1.5 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white rounded-lg text-[11px] font-bold transition-colors"
                              title="Transcrever com IA"
                            >
                              {transcribing === u.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <><Wand2 size={13} /> Transcrever</>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deleting === u.id}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeFileViewer}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Visualizar Exame</h3>
              <button onClick={closeFileViewer} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {viewingFile.type === 'application/pdf' ? (
                <iframe src={viewingFile.url} className="w-full h-[70vh] rounded-lg border" />
              ) : (
                <img src={viewingFile.url} alt="Exame" className="max-w-full h-auto rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcription Modal */}
      {viewingTranscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingTranscription(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Transcricao</h3>
                <p className="text-sm text-slate-500">{viewingTranscription.original_name} — {viewingTranscription.patient_name}</p>
                {viewingTranscription.name_match === 'mismatch' && (
                  <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle size={14} className="text-red-500" />
                    <span className="text-xs font-bold text-red-700">
                      Nome no documento ({viewingTranscription.patient_name_doc}) diferente do cadastro ({viewingTranscription.patient_name})
                    </span>
                  </div>
                )}
                {viewingTranscription.name_match === 'match' && (
                  <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-700">
                      Nome no documento confere: {viewingTranscription.patient_name_doc}
                    </span>
                  </div>
                )}
              </div>
              <button onClick={() => setViewingTranscription(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 rounded-xl p-4 border border-slate-200">
                {viewingTranscription.transcription}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(viewingTranscription.transcription || '');
                  toast('Copiado!', 'success');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Copiar texto
              </button>
              <button
                onClick={() => setViewingTranscription(null)}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExameUploadsPage;
