
export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  SECRETARY = 'secretary',
  NURSE = 'nurse'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface Address {
  id: string;
  patientId: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Guardian {
  id: string;
  patientId: string;
  fullName: string;
  phonePrimary: string;
  phoneSecondary?: string;
  email?: string;
  relationship?: string;
}

export interface Patient {
  id: string;
  fullName: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'Other';
  mainDiagnosis: string;
  clinicalNotes?: string;
  active: boolean;
}

export interface ConsentDocument {
  id: string;
  patientId: string;
  fileName: string;
  fileType: 'pdf' | 'doc' | 'docx';
  uploadDate: string;
  uploadedBy: string;
  url: string; // Mock URL
}

// Adherence level for patients
export type AdherenceLevel = 'BOA' | 'MODERADA' | 'BAIXA' | 'ABANDONO' | null;

// Composite type for UI lists
export interface PatientFull extends Patient {
  guardian: Guardian;
  address?: Address;
  adherenceLevel?: AdherenceLevel;
}

export enum FrequencyDays {
  MONTHLY = 28,
  TRIMESTER = 84,
  SEMESTER = 168
}

// Diagnosis Management
export interface Diagnosis {
  id: string;
  name: string;
  color?: string; // Property to store the selected tag color
  requiresConsent?: boolean; // Whether this diagnosis requires consent term
}

// --- MEDICAMENTOS BASE (Novo) ---
export interface MedicationBase {
  id: string;
  activeIngredient: string; // ex: Acetato de Leuprorrelina
  dosage: string; // ex: 3.75mg (Apresentação)
  tradeName?: string; // ex: Neodeca
  manufacturer?: string; // ex: Eurofarma
  pharmaceuticalForm?: string; // ex: Pó Liofilizado
}

export interface ProtocolMilestone {
  day: number;
  message: string;
}

export enum ProtocolCategory {
  MEDICATION = 'Medicamentoso',
  MONITORING = 'Régua de Contato / Acompanhamento'
}

export interface Protocol {
  id: string;
  name: string; // Nome do protocolo ex: Puberdade Precoce Mensal
  category: ProtocolCategory; // Novo campo para distinção
  medicationType: string; // Nome do medicamento + mg ex: Leuprorrelina 3.75mg (ou vazio se for acompanhamento)
  frequencyDays: number; // Agora number livre para aceitar customizados
  goal?: string; // Meta Terapêutica
  message?: string; // Mensagem/Instrução Padrão (Geral)
  milestones?: ProtocolMilestone[]; // Régua de contato (dias específicos)
}

export enum DoseStatus {
  PENDING = 'PENDING',
  APPLIED = 'APPLIED',
  NOT_ACCEPTED = 'NOT_ACCEPTED'
}

export enum PaymentStatus {
  WAITING_PIX = 'WAITING_PIX',
  WAITING_CARD = 'WAITING_CARD',
  WAITING_BOLETO = 'WAITING_BOLETO',
  PAID = 'PAID',
  WAITING_DELIVERY = 'WAITING_DELIVERY'
}

export enum SurveyStatus {
  WAITING = 'WAITING',
  SENT = 'SENT',
  ANSWERED = 'ANSWERED',
  NOT_SENT = 'NOT_SENT'
}

export enum TreatmentStatus {
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
  REFUSED = 'REFUSED',
  SUSPENDED = 'SUSPENDED'
}

export interface Dose {
  id: string;
  treatmentId: string;
  cycleNumber: number;
  applicationDate: string; // ISO Date
  lotNumber: string;
  expiryDate: string;
  status: DoseStatus;
  
  // Calculated Fields
  calculatedNextDate: string;
  daysUntilNext: number;
  
  // Logic
  isLastBeforeConsult: boolean;
  consultationDate?: string;
  
  // Payment
  paymentStatus: PaymentStatus;
  paymentUpdatedAt: string;

  // New Fields requested
  purchased?: boolean; // Compra de Medicamento (Sim/Não)
  deliveryStatus?: 'waiting' | 'delivered'; // Entrega

  // Nurse & Satisfaction (Moved from Treatment)
  nurse: boolean; 
  surveyStatus: SurveyStatus;
  surveyScore?: number; // 1-10
  surveyComment?: string;

  // Link with Inventory
  inventoryLotId?: string; // ID do lote usado
}

export interface Treatment {
  id: string;
  patientId: string;
  protocolId: string;
  status: TreatmentStatus; // Substitui o active boolean
  startDate: string;
  nextConsultationDate?: string;
  observations?: string;
  
  // Specific Logic Fields
  plannedDosesBeforeConsult: number; // 1, 2, or 3
}

// --- FEEDBACK DO PACIENTE (Novo) ---
export interface PatientFeedback {
    text: string;
    classification: 'Geral' | 'Dúvida' | 'Sintomas';
    needsMedicalResponse: boolean;
    urgency: 'Sem urgência' | 'Atenção' | 'Urgente';
    registeredAt: string; // ISO Date
    status?: 'pending' | 'resolved'; // Status do feedback
}

// Histórico de mensagens enviadas/concluídas
export interface DismissedLog {
    contactId: string;
    dismissedAt: string; // ISO Date time
    feedback?: PatientFeedback; // Novo campo opcional
}

// --- ESTOQUE (INVENTORY) ---

export interface InventoryItem {
  id: string;
  medicationName: string; // Nome ex: Neodeca 11.25mg
  lotNumber: string;
  expiryDate: string;
  quantity: number; // Saldo atual
  unit: string; // ex: Ampola
  entryDate: string;
  active: boolean;
  // Financial fields
  unitCost?: number; // Custo unitário
  baseSalePrice?: number; // Preço de venda base
  defaultCommission?: number; // Comissão padrão (R$)
  defaultTax?: number; // Impostos padrão (R$)
  defaultDelivery?: number; // Entrega padrão (R$)
  defaultOther?: number; // Outros padrão (R$)
}

export interface DispenseLog {
  id: string;
  date: string;
  patientId: string; // Link paciente
  inventoryItemId: string; // Link lote
  medicationName: string; // Snapshot do nome
  quantity: number;
  doseId?: string; // Link com a dose
}

export interface PurchaseRequest {
  id: string;
  medicationName: string;
  createdAt: string;
  predictedConsumption10Days: number;
  currentStock: number;
  status: 'PENDING' | 'ORDERED' | 'RECEIVED';
  suggestedQuantity?: number;
}

// --- FINANCEIRO (CAIXA) ---

export enum PaymentMethod {
  PIX = 'PIX',
  CARD = 'CARD',
  BOLETO = 'BOLETO'
}

export interface Sale {
  id: string;
  doseId: string;
  inventoryItemId: string;
  patientId: string;

  // Financial data
  salePrice: number;
  unitCost: number;
  commission: number;
  tax: number;
  delivery: number;
  other: number;

  // Calculated
  grossProfit: number;
  netProfit: number;

  paymentMethod: PaymentMethod;
  saleDate: string;

  // Relations (populated)
  patient?: {
    id: string;
    fullName: string;
  };
  inventoryItem?: {
    id: string;
    medicationName: string;
    lotNumber: string;
  };
  dose?: {
    id: string;
    applicationDate: string;
    cycleNumber: number;
  };
}

export interface PendingSale {
  doseId: string;
  applicationDate: string;
  cycleNumber: number;
  patientId: string;
  patientName: string;
  inventoryItem: {
    id: string;
    medicationName: string;
    lotNumber: string;
    unitCost: number;
    baseSalePrice: number;
    defaultCommission: number;
    defaultTax: number;
    defaultDelivery: number;
    defaultOther: number;
  } | null;
  defaults: {
    salePrice: number;
    unitCost: number;
    commission: number;
    tax: number;
    delivery: number;
    other: number;
  } | null;
}

export interface SalesKPI {
  period: string;
  current: {
    grossRevenue: number;
    totalSales: number;
    cmv: number;
    opex: number;
    netProfit: number;
    netMargin: string;
  };
  previous: {
    grossRevenue: number;
    totalSales: number;
    cmv: number;
    opex: number;
    netProfit: number;
  } | null;
  variation: {
    grossRevenue: { value: number; percent: string | null };
    totalSales: { value: number; percent: string | null };
    netProfit: { value: number; percent: string | null };
  } | null;
}

export interface LotPricing {
  id: string;
  medicationName: string;
  lotNumber: string;
  quantity: number;
  unitCost: number;
  baseSalePrice: number;
  defaultCommission: number;
  defaultTax: number;
  defaultDelivery: number;
  defaultOther: number;
  expiryDate: string;
  estimatedProfit: number;
  estimatedMargin: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  summary: {
    grossRevenue: number;
    cmv: number;
    opex: number;
    netProfit: number;
    netMargin: string;
    totalSales: number;
  };
  byPaymentMethod: {
    PIX: { count: number; total: number };
    CARD: { count: number; total: number };
    BOLETO: { count: number; total: number };
  };
  sales: Sale[];
}
