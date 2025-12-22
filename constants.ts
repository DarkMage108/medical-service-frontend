
import { TreatmentStatus, DoseStatus, PaymentStatus, SurveyStatus, UserRole } from './types';

export const SESSION_KEY = 'azevedo_user_session';

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.DOCTOR]: 'Médico',
  [UserRole.SECRETARY]: 'Secretária',
  [UserRole.NURSE]: 'Enfermeira'
};

// Display labels for enums (Portuguese)
export const DOSE_STATUS_LABELS: Record<DoseStatus, string> = {
  [DoseStatus.PENDING]: 'Pendente',
  [DoseStatus.APPLIED]: 'Aplicada',
  [DoseStatus.NOT_ACCEPTED]: 'Não Realizada'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.WAITING_PIX]: 'Aguardando PIX',
  [PaymentStatus.WAITING_CARD]: 'Aguardando Cartão',
  [PaymentStatus.WAITING_BOLETO]: 'Aguardando Boleto',
  [PaymentStatus.PAID]: 'PAGO',
  [PaymentStatus.WAITING_DELIVERY]: 'AGUARDANDO ENTREGA'
};

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  [SurveyStatus.WAITING]: 'Aguardando',
  [SurveyStatus.SENT]: 'Enviado',
  [SurveyStatus.ANSWERED]: 'Respondido',
  [SurveyStatus.NOT_SENT]: 'Não Enviado'
};

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  [TreatmentStatus.ONGOING]: 'Em andamento',
  [TreatmentStatus.FINISHED]: 'Encerrado',
  [TreatmentStatus.REFUSED]: 'Recusado',
  [TreatmentStatus.SUSPENDED]: 'Suspenso'
};

// --- DATE HELPERS ---

// Converte para Date usando timezone local de forma consistente
const toDate = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  // Para strings ISO, criar data interpretando como local
  if (typeof value === 'string' && value.includes('T')) {
    // Se tem timezone info (Z ou +/-), usar new Date diretamente
    if (value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value)) {
      return new Date(value);
    }
  }
  return new Date(value);
};

// Cria uma data "limpa" sem componente de hora (meia-noite local)
const toDateOnly = (value: string | Date): Date => {
  const d = toDate(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const formatDate = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '-';

  // Se for string no formato ISO (YYYY-MM-DD ou com T), extrair apenas a parte da data
  if (typeof dateInput === 'string') {
    // Pega apenas a parte YYYY-MM-DD para evitar problemas de timezone
    const dateOnly = dateInput.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    if (year && month && day) {
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    }
  }

  const date = toDate(dateInput);
  // Proteção contra datas inválidas
  if (isNaN(date.getTime())) return '-';

  // Usar local timezone consistentemente
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export const addDays = (date: string | Date, days: number): Date => {
  const result = toDateOnly(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const diffInDays = (dateFuture: string | Date, datePast: string | Date): number => {
  // Usar apenas a parte da data (ignorar horas) para cálculo consistente
  const future = toDateOnly(dateFuture);
  const past = toDateOnly(datePast);
  const diffTime = future.getTime() - past.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// --- STATUS COLORS ---

export const getStatusColor = (status: DoseStatus | PaymentStatus | string) => {
  switch (status) {
    // Dose Status
    case DoseStatus.APPLIED: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case DoseStatus.PENDING: return 'bg-blue-100 text-blue-800 border-blue-200';
    case DoseStatus.NOT_ACCEPTED: return 'bg-slate-100 text-slate-500 border-slate-200';
    
    // Payment Status
    case PaymentStatus.PAID: return 'text-green-700 font-bold bg-green-50 border border-green-200';
    case PaymentStatus.WAITING_DELIVERY: return 'text-orange-700 font-bold bg-orange-50 border border-orange-200';
    case PaymentStatus.WAITING_PIX:
    case PaymentStatus.WAITING_CARD:
    case PaymentStatus.WAITING_BOLETO: 
        return 'text-slate-600 font-medium bg-slate-50 border border-slate-200';
    
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

export const getTreatmentStatusColor = (status: TreatmentStatus) => {
    switch (status) {
        case TreatmentStatus.ONGOING: return 'bg-green-100 text-green-700 border-green-200';
        case TreatmentStatus.FINISHED: return 'bg-gray-100 text-gray-600 border-gray-200';
        case TreatmentStatus.REFUSED: return 'bg-red-100 text-red-700 border-red-200';
        case TreatmentStatus.SUSPENDED: return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
};

// --- DIAGNOSIS COLORS ---

export const DIAGNOSIS_COLORS = [
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    'bg-lime-100 text-lime-800 border-lime-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-slate-100 text-slate-800 border-slate-200',
    'bg-red-50 text-red-800 border-red-200',
    'bg-green-50 text-green-800 border-green-200',
];

// Gera uma cor determinística baseada no nome do diagnóstico, OU usa a cor específica se fornecida
export const getDiagnosisColor = (name: string, specificColor?: string) => {
  if (specificColor) return specificColor;
  if (!name) return DIAGNOSIS_COLORS[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % DIAGNOSIS_COLORS.length;
  return DIAGNOSIS_COLORS[index];
};
