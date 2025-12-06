
import { TreatmentStatus, DoseStatus, PaymentStatus, UserRole } from './types';

export const SESSION_KEY = 'azevedo_user_session';

export const ROLE_LABELS = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.DOCTOR]: 'Médico',
  [UserRole.SECRETARY]: 'Secretária'
};

// --- DATE HELPERS ---

const toDate = (value: string | Date): Date => {
   return value instanceof Date ? value : new Date(value);
};

export const formatDate = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '-';
  
  const date = toDate(dateInput);
  // Proteção contra datas inválidas
  if (isNaN(date.getTime())) return '-';
  
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

export const addDays = (date: string | Date, days: number): Date => {
  const result = toDate(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const diffInDays = (dateFuture: string | Date, datePast: string | Date): number => {
  const future = toDate(dateFuture);
  const past = toDate(datePast);
  const diffTime = future.getTime() - past.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        case TreatmentStatus.EXTERNAL: return 'bg-purple-100 text-purple-700 border-purple-200';
        case TreatmentStatus.SUSPENDED: return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
};

// --- DIAGNOSIS COLORS & PALETTE ---

// Paleta definida de 6 cores
export const DIAGNOSIS_PALETTE = [
    { id: 'pink', label: 'Rosa', class: 'bg-pink-100 text-pink-800 border-pink-200', dot: 'bg-pink-500' },
    { id: 'blue', label: 'Azul', class: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
    { id: 'emerald', label: 'Verde', class: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
    { id: 'purple', label: 'Roxo', class: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
    { id: 'amber', label: 'Laranja', class: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
    { id: 'slate', label: 'Cinza', class: 'bg-slate-100 text-slate-800 border-slate-200', dot: 'bg-slate-500' },
];

export const DIAGNOSIS_COLORS_HASH = DIAGNOSIS_PALETTE.map(p => p.class);

// Fallback legacy (mantido para compatibilidade, mas o ideal é usar a cor do objeto Diagnosis)
export const getDiagnosisColor = (name: string) => {
  if (!name) return DIAGNOSIS_PALETTE[0].class;

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % DIAGNOSIS_PALETTE.length;
  return DIAGNOSIS_PALETTE[index].class;
};
