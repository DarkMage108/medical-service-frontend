

export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  SECRETARY = 'secretary'
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
  relationship: string;
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

// Composite type for UI lists
export interface PatientFull extends Patient {
  guardian: Guardian;
  address?: Address;
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
  PENDING = 'Pendente',
  APPLIED = 'Aplicada',
  NOT_ACCEPTED = 'Não Realizada'
}

export enum PaymentStatus {
  WAITING_PIX = 'Aguardando PIX',
  WAITING_CARD = 'Aguardando Cartão',
  WAITING_BOLETO = 'Aguardando Boleto',
  PAID = 'PAGO',
  WAITING_DELIVERY = 'AGUARDANDO ENTREGA'
}

export enum SurveyStatus {
  WAITING = 'Aguardando',
  SENT = 'Enviado',
  ANSWERED = 'Respondido',
  NOT_SENT = 'Não Enviado'
}

export enum TreatmentStatus {
  ONGOING = 'Em andamento',
  FINISHED = 'Encerrado',
  REFUSED = 'Recusado',
  EXTERNAL = 'Medicamento Externo',
  SUSPENDED = 'Suspenso'
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

// Histórico de mensagens enviadas/concluídas
export interface DismissedLog {
    contactId: string;
    dismissedAt: string; // ISO Date time
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