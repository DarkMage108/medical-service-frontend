import { PatientFull, Treatment, Dose, DoseStatus, PaymentStatus, SurveyStatus, ConsentDocument, Protocol, FrequencyDays, Diagnosis, TreatmentStatus, ProtocolCategory, UserRole, DismissedLog, InventoryItem, DispenseLog, PurchaseRequest, MedicationBase } from '../types';
import { addDays, diffInDays } from '../constants';

// --- MOCK DATABASE WITH LOCAL STORAGE PERSISTENCE ---

const TODAY = new Date();
// ALTERAÇÃO: Sufixo _v7 para forçar limpeza do cache antigo e carregar novos dados
const STORAGE_KEYS = {
  PATIENTS: 'azevedo_patients_v7',
  TREATMENTS: 'azevedo_treatments_v7',
  DOSES: 'azevedo_doses_v7',
  DOCUMENTS: 'azevedo_documents_v7',
  PROTOCOLS: 'azevedo_protocols_v7',
  DIAGNOSES: 'azevedo_diagnoses_v7',
  DISMISSED_LOGS: 'azevedo_dismissed_logs_v7',
  INVENTORY: 'azevedo_inventory_v7',
  DISPENSE_LOGS: 'azevedo_dispense_logs_v7',
  PURCHASE_REQUESTS: 'azevedo_purchase_requests_v7',
  MEDICATION_BASE: 'azevedo_medication_base_v7'
};

// Helper to load or use default
const loadData = <T>(key: string, defaults: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaults;
  } catch (e) {
    console.error('Erro ao carregar dados', e);
    return defaults;
  }
};

const saveData = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar dados', e);
  }
};

// --- MOCK USERS ---
export const MOCK_USERS = [
  { id: 'u1', email: 'admin@clinic.com', pass: 'password', name: 'Administrador', role: UserRole.ADMIN, active: true },
  { id: 'u2', email: 'recepcao@azevedo.com', pass: 'sec123', name: 'Secretária', role: UserRole.SECRETARY, active: true },
  { id: 'u3', email: 'medico@azevedo.com', pass: '123456', name: 'Dr. Azevedo', role: UserRole.DOCTOR, active: true }
];

// --- SEED DATA ---

const SEED_MEDICATION_BASE: MedicationBase[] = [
    { id: 'med_1', activeIngredient: 'Acetato de Leuprorrelina', dosage: '3.75mg', tradeName: 'Neodeca', manufacturer: 'Eurofarma', pharmaceuticalForm: 'Pó Liofilizado' },
    { id: 'med_2', activeIngredient: 'Acetato de Leuprorrelina', dosage: '11.25mg', tradeName: 'Lectrum', manufacturer: 'Sandoz', pharmaceuticalForm: 'Pó Liofilizado' },
    { id: 'med_3', activeIngredient: 'Triptorrelina', dosage: '22.5mg', tradeName: 'Neo Decapeptyl', manufacturer: 'Aché', pharmaceuticalForm: 'Seringa Pronta' }
];

const SEED_PROTOCOLS: Protocol[] = [
  {
    id: 'p1',
    name: 'Puberdade Precoce - Mensal',
    category: ProtocolCategory.MEDICATION,
    medicationType: 'Acetato de Leuprorrelina 3.75mg',
    frequencyDays: FrequencyDays.MONTHLY,
    message: 'Monitorar sinais de puberdade.',
    milestones: [
        { day: 25, message: 'Lembrete: Próxima dose em 3 dias.' }
    ]
  },
  {
    id: 'p2',
    name: 'Puberdade Precoce - Trimestral',
    category: ProtocolCategory.MEDICATION,
    medicationType: 'Acetato de Leuprorrelina 11.25mg',
    frequencyDays: FrequencyDays.TRIMESTER,
    milestones: [
        { day: 80, message: 'Lembrete: Agendar aplicação e renovar receita.' }
    ]
  },
  {
    id: 'p3',
    name: 'Puberdade Precoce - Semestral',
    category: ProtocolCategory.MEDICATION,
    medicationType: 'Triptorrelina 22.5mg',
    frequencyDays: FrequencyDays.SEMESTER,
    milestones: [
        { day: 160, message: 'Lembrete: Próxima dose semestral aproximando.' }
    ]
  },
  {
      id: 'p4',
      name: 'Acompanhamento Nutricional',
      category: ProtocolCategory.MONITORING,
      medicationType: '',
      frequencyDays: 30,
      goal: 'Reeducação alimentar',
      milestones: [
          { day: 7, message: 'Verificar adesão à dieta' },
          { day: 15, message: 'Solicitar peso atual' },
          { day: 28, message: 'Agendar retorno nutricionista' }
      ]
  }
];

const SEED_DIAGNOSES: Diagnosis[] = [
    { id: 'diag_1', name: 'Puberdade Precoce' },
    { id: 'diag_2', name: 'Baixa Estatura' },
    { id: 'diag_3', name: 'Obesidade' },
    { id: 'diag_4', name: 'Deficiência Hormonal' }
];

const SEED_PATIENTS: PatientFull[] = [
  {
    id: 'pat_1',
    fullName: 'Ana Clara Souza',
    birthDate: '2015-05-12',
    gender: 'F',
    mainDiagnosis: 'Puberdade Precoce',
    active: true,
    guardian: {
      id: 'g_1',
      patientId: 'pat_1',
      fullName: 'Maria Souza (Mãe)',
      phonePrimary: '(11) 99999-1111',
      relationship: 'Mãe'
    },
    address: {
      id: 'addr_1',
      patientId: 'pat_1',
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000'
    }
  },
  {
    id: 'pat_2',
    fullName: 'João Pedro Silva',
    birthDate: '2014-08-20',
    gender: 'M',
    mainDiagnosis: 'Baixa Estatura',
    active: true,
    guardian: {
      id: 'g_2',
      patientId: 'pat_2',
      fullName: 'Carlos Silva (Pai)',
      phonePrimary: '(21) 98888-2222',
      relationship: 'Pai'
    },
    address: {
        id: 'addr_2',
        patientId: 'pat_2',
        street: 'Av. Brasil',
        number: '500',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20000-000'
    }
  }
];

const SEED_TREATMENTS: Treatment[] = [
  {
    id: 't_1',
    patientId: 'pat_1',
    protocolId: 'p1',
    status: TreatmentStatus.ONGOING,
    startDate: '2023-01-15',
    plannedDosesBeforeConsult: 3,
  },
  {
    id: 't_2',
    patientId: 'pat_2',
    protocolId: 'p2',
    status: TreatmentStatus.ONGOING,
    startDate: '2023-06-01',
    plannedDosesBeforeConsult: 2,
  },
  {
    id: 't_3',
    patientId: 'pat_1',
    protocolId: 'p4',
    status: TreatmentStatus.ONGOING,
    startDate: new Date(TODAY.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString(),
    plannedDosesBeforeConsult: 0,
  }
];

const calculateDoseLogic = (date: string, freq: number): { calculatedNextDate: string, daysUntilNext: number } => {
  const appDate = new Date(date);
  const nextDate = addDays(appDate, freq);
  const diffTime = nextDate.getTime() - TODAY.getTime();
  const daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return { calculatedNextDate: nextDate.toISOString(), daysUntilNext };
};

const SEED_DOSES: Dose[] = [
  {
    id: 'd_1',
    treatmentId: 't_1',
    cycleNumber: 1,
    applicationDate: new Date(TODAY.getTime() - (20 * 24 * 60 * 60 * 1000)).toISOString(),
    lotNumber: 'AB123',
    expiryDate: '2025-12-31',
    status: DoseStatus.APPLIED,
    paymentStatus: PaymentStatus.PAID,
    paymentUpdatedAt: '2023-09-15',
    isLastBeforeConsult: false,
    nurse: true,
    surveyStatus: SurveyStatus.ANSWERED,
    surveyScore: 10,
    surveyComment: 'Ótimo atendimento da enfermeira.',
    ...calculateDoseLogic(new Date(TODAY.getTime() - (20 * 24 * 60 * 60 * 1000)).toISOString(), 28)
  },
  {
    id: 'd_2',
    treatmentId: 't_2',
    cycleNumber: 1,
    applicationDate: new Date(TODAY.getTime() - (90 * 24 * 60 * 60 * 1000)).toISOString(),
    lotNumber: 'CD456',
    expiryDate: '2024-06-30',
    status: DoseStatus.APPLIED,
    paymentStatus: PaymentStatus.WAITING_DELIVERY,
    paymentUpdatedAt: '2023-06-01',
    isLastBeforeConsult: false,
    nurse: false,
    surveyStatus: SurveyStatus.WAITING,
    ...calculateDoseLogic(new Date(TODAY.getTime() - (90 * 24 * 60 * 60 * 1000)).toISOString(), 84)
  },
  {
    id: 'd_3',
    treatmentId: 't_1',
    cycleNumber: 2,
    applicationDate: new Date().toISOString(),
    lotNumber: 'EF789',
    expiryDate: '2025-12-31',
    status: DoseStatus.PENDING,
    paymentStatus: PaymentStatus.WAITING_PIX,
    paymentUpdatedAt: new Date().toISOString(),
    isLastBeforeConsult: false,
    nurse: true,
    surveyStatus: SurveyStatus.WAITING,
    ...calculateDoseLogic(new Date().toISOString(), 28)
  }
];

const SEED_DOCUMENTS: ConsentDocument[] = [];

// Inventory Seed
const SEED_INVENTORY: InventoryItem[] = [
    { id: 'inv_1', medicationName: 'Acetato de Leuprorrelina 3.75mg', lotNumber: 'LT2024-A', expiryDate: '2026-01-01', quantity: 15, unit: 'Ampola', entryDate: '2023-12-01', active: true },
    { id: 'inv_2', medicationName: 'Acetato de Leuprorrelina 11.25mg', lotNumber: 'LT2024-B', expiryDate: '2025-06-01', quantity: 5, unit: 'Ampola', entryDate: '2023-12-01', active: true },
    { id: 'inv_3', medicationName: 'Triptorrelina 22.5mg', lotNumber: 'LT2024-C', expiryDate: '2025-12-31', quantity: 2, unit: 'Ampola', entryDate: '2024-01-10', active: true }
];

// --- SEED DISPENSE LOGS (HISTÓRICO PARA RELATÓRIOS) ---
const SEED_DISPENSE_LOGS: DispenseLog[] = [
    { id: 'dl_1', date: new Date(new Date().getFullYear(), 0, 15).toISOString(), patientId: 'pat_1', inventoryItemId: 'inv_1', medicationName: 'Acetato de Leuprorrelina 3.75mg', quantity: 1, doseId: 'd_1' },
    { id: 'dl_2', date: new Date(new Date().getFullYear(), 1, 10).toISOString(), patientId: 'pat_2', inventoryItemId: 'inv_2', medicationName: 'Acetato de Leuprorrelina 11.25mg', quantity: 1, doseId: 'd_2' },
    { id: 'dl_3', date: new Date(new Date().getFullYear(), 2, 20).toISOString(), patientId: 'pat_1', inventoryItemId: 'inv_1', medicationName: 'Acetato de Leuprorrelina 3.75mg', quantity: 1, doseId: 'd_3_mock' },
    { id: 'dl_4', date: new Date(new Date().getFullYear(), 3, 5).toISOString(), patientId: 'pat_2', inventoryItemId: 'inv_3', medicationName: 'Triptorrelina 22.5mg', quantity: 1, doseId: 'd_4_mock' },
    { id: 'dl_5', date: new Date(new Date().getFullYear(), 3, 25).toISOString(), patientId: 'pat_1', inventoryItemId: 'inv_1', medicationName: 'Acetato de Leuprorrelina 3.75mg', quantity: 1, doseId: 'd_5_mock' },
    // Adicionando mais dados para ficar bonito
    { id: 'dl_6', date: new Date(new Date().getFullYear(), 4, 12).toISOString(), patientId: 'pat_1', inventoryItemId: 'inv_1', medicationName: 'Acetato de Leuprorrelina 3.75mg', quantity: 1 },
    { id: 'dl_7', date: new Date(new Date().getFullYear(), 5, 8).toISOString(), patientId: 'pat_2', inventoryItemId: 'inv_2', medicationName: 'Acetato de Leuprorrelina 11.25mg', quantity: 1 },
    { id: 'dl_8', date: new Date(new Date().getFullYear(), 6, 15).toISOString(), patientId: 'pat_1', inventoryItemId: 'inv_1', medicationName: 'Acetato de Leuprorrelina 3.75mg', quantity: 1 }
];

// --- ACTIVE DATA POOLS ---

export let MOCK_PATIENTS: PatientFull[] = loadData(STORAGE_KEYS.PATIENTS, SEED_PATIENTS);
export let MOCK_TREATMENTS: Treatment[] = loadData(STORAGE_KEYS.TREATMENTS, SEED_TREATMENTS);
export let MOCK_DOSES: Dose[] = loadData(STORAGE_KEYS.DOSES, SEED_DOSES);
export let MOCK_DOCUMENTS: ConsentDocument[] = loadData(STORAGE_KEYS.DOCUMENTS, SEED_DOCUMENTS);
export let MOCK_PROTOCOLS: Protocol[] = loadData(STORAGE_KEYS.PROTOCOLS, SEED_PROTOCOLS);
export let MOCK_DIAGNOSES: Diagnosis[] = loadData(STORAGE_KEYS.DIAGNOSES, SEED_DIAGNOSES);
export let MOCK_DISMISSED_LOGS: DismissedLog[] = loadData(STORAGE_KEYS.DISMISSED_LOGS, []);

export let MOCK_INVENTORY: InventoryItem[] = loadData(STORAGE_KEYS.INVENTORY, SEED_INVENTORY);
export let MOCK_DISPENSE_LOGS: DispenseLog[] = loadData(STORAGE_KEYS.DISPENSE_LOGS, SEED_DISPENSE_LOGS);
export let MOCK_PURCHASE_REQUESTS: PurchaseRequest[] = loadData(STORAGE_KEYS.PURCHASE_REQUESTS, []);
export let MOCK_MEDICATION_BASE: MedicationBase[] = loadData(STORAGE_KEYS.MEDICATION_BASE, SEED_MEDICATION_BASE);

// Helper function to recalculate patient active status
const recalculatePatientActiveStatus = (patientId: string) => {
    const patientTreatments = MOCK_TREATMENTS.filter(t => t.patientId === patientId);
    const isActive = patientTreatments.some(t => 
        t.status === TreatmentStatus.ONGOING || t.status === TreatmentStatus.EXTERNAL
    );

    const index = MOCK_PATIENTS.findIndex(p => p.id === patientId);
    if (index !== -1 && MOCK_PATIENTS[index].active !== isActive) {
        MOCK_PATIENTS[index] = { ...MOCK_PATIENTS[index], active: isActive };
        MOCK_PATIENTS = [...MOCK_PATIENTS];
        saveData(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS);
    }
};

// --- MEDICATION BASE LOGIC ---
export const getMedicationBase = () => {
    return [...MOCK_MEDICATION_BASE];
};

export const addMockMedicationBase = (item: MedicationBase) => {
    MOCK_MEDICATION_BASE = [...MOCK_MEDICATION_BASE, item];
    saveData(STORAGE_KEYS.MEDICATION_BASE, MOCK_MEDICATION_BASE);
    return [...MOCK_MEDICATION_BASE];
};

export const deleteMockMedicationBase = (id: string) => {
    const newList = MOCK_MEDICATION_BASE.filter(i => i.id !== id);
    MOCK_MEDICATION_BASE = [...newList];
    saveData(STORAGE_KEYS.MEDICATION_BASE, MOCK_MEDICATION_BASE);
    return [...MOCK_MEDICATION_BASE];
};

// --- INVENTORY LOGIC ---

// 1. Entrada de Estoque
export const addStockEntry = (item: InventoryItem) => {
    // Tenta encontrar um lote existente para somar quantidade
    const existingIndex = MOCK_INVENTORY.findIndex(i => i.medicationName === item.medicationName && i.lotNumber === item.lotNumber);
    
    if (existingIndex !== -1) {
        // Atualiza quantidade
        const updatedItem = { ...MOCK_INVENTORY[existingIndex], quantity: MOCK_INVENTORY[existingIndex].quantity + item.quantity };
        MOCK_INVENTORY[existingIndex] = updatedItem;
    } else {
        // Cria novo
        MOCK_INVENTORY = [...MOCK_INVENTORY, item];
    }
    
    saveData(STORAGE_KEYS.INVENTORY, MOCK_INVENTORY);
    return [...MOCK_INVENTORY];
};

// 1.1 Atualizar Item de Estoque (Edição)
export const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    const index = MOCK_INVENTORY.findIndex(i => i.id === id);
    if (index !== -1) {
        MOCK_INVENTORY[index] = { ...MOCK_INVENTORY[index], ...updates };
        MOCK_INVENTORY = [...MOCK_INVENTORY];
        saveData(STORAGE_KEYS.INVENTORY, MOCK_INVENTORY);
        return [...MOCK_INVENTORY];
    }
    return null;
};

// 2. Dispensação (Baixa)
export const dispenseMedication = (doseId: string, inventoryItemId: string, patientId: string) => {
    const inventoryItem = MOCK_INVENTORY.find(i => i.id === inventoryItemId);
    
    if (!inventoryItem) return false;
    if (inventoryItem.quantity <= 0) return false; // Bloqueio estoque zero

    // Debitar
    inventoryItem.quantity -= 1;
    MOCK_INVENTORY = [...MOCK_INVENTORY]; // Force update reference
    saveData(STORAGE_KEYS.INVENTORY, MOCK_INVENTORY);

    // Logar
    const log: DispenseLog = {
        id: `disp_${Date.now()}`,
        date: new Date().toISOString(),
        patientId,
        inventoryItemId,
        medicationName: inventoryItem.medicationName,
        quantity: 1,
        doseId
    };
    MOCK_DISPENSE_LOGS = [log, ...MOCK_DISPENSE_LOGS];
    saveData(STORAGE_KEYS.DISPENSE_LOGS, MOCK_DISPENSE_LOGS);

    return true;
};

// 3. Regra de 10 dias (Purchase Prediction)
export const checkPurchaseTriggers = () => {
    // Agrupar demanda futura (próximos 10 dias) por medicamento
    const futureDemand: Record<string, number> = {};
    
    const activeTreatments = MOCK_TREATMENTS.filter(t => t.status === TreatmentStatus.ONGOING);
    
    activeTreatments.forEach(t => {
        const proto = MOCK_PROTOCOLS.find(p => p.id === t.protocolId);
        if (!proto || proto.category !== ProtocolCategory.MEDICATION || !proto.medicationType) return;

        // Estimar próxima dose
        // Simplesmente pegamos a última dose e somamos a frequência
        const doses = MOCK_DOSES.filter(d => d.treatmentId === t.id);
        const lastDose = doses.sort((a,b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())[0];
        
        let nextDate: Date;
        if (lastDose) {
            nextDate = addDays(new Date(lastDose.applicationDate), proto.frequencyDays);
        } else {
            nextDate = new Date(t.startDate); // Se não tem dose, é a data de início
        }

        const diff = diffInDays(nextDate, new Date());
        
        // Se a dose é hoje ou nos próximos 10 dias
        if (diff >= 0 && diff <= 10) {
            futureDemand[proto.medicationType] = (futureDemand[proto.medicationType] || 0) + 1;
        }
    });

    // Verificar estoque atual vs demanda
    const requests: PurchaseRequest[] = [];
    
    Object.keys(futureDemand).forEach(medName => {
        const stockItems = MOCK_INVENTORY.filter(i => i.medicationName === medName && i.active);
        const totalStock = stockItems.reduce((acc, item) => acc + item.quantity, 0);
        const demand = futureDemand[medName];

        // Regra: Se estoque <= demanda prevista, gerar pedido
        if (totalStock <= demand) {
            // Verifica se já não existe pedido pendente para este medicamento
            const existingReq = MOCK_PURCHASE_REQUESTS.find(r => r.medicationName === medName && r.status === 'PENDING');
            
            if (!existingReq) {
                const req: PurchaseRequest = {
                    id: `req_${Date.now()}_${Math.random()}`,
                    medicationName: medName,
                    createdAt: new Date().toISOString(),
                    currentStock: totalStock,
                    predictedConsumption10Days: demand,
                    status: 'PENDING',
                    suggestedQuantity: demand * 3 // Sugestão simples: 3x a demanda
                };
                requests.push(req);
            }
        }
    });

    // Filtra os NOVOS pedidos criados AGORA para retornar separado (útil para notificações)
    const newRequests = requests.filter(req => !MOCK_PURCHASE_REQUESTS.some(existing => existing.id === req.id));

    if (requests.length > 0) {
        MOCK_PURCHASE_REQUESTS = [...requests, ...MOCK_PURCHASE_REQUESTS];
        saveData(STORAGE_KEYS.PURCHASE_REQUESTS, MOCK_PURCHASE_REQUESTS);
    }
    
    // Retorna todos
    return MOCK_PURCHASE_REQUESTS;
};

// Update Purchase Request
export const updatePurchaseRequest = (id: string, status: 'ORDERED' | 'RECEIVED') => {
    MOCK_PURCHASE_REQUESTS = MOCK_PURCHASE_REQUESTS.map(req => req.id === id ? { ...req, status } : req);
    saveData(STORAGE_KEYS.PURCHASE_REQUESTS, MOCK_PURCHASE_REQUESTS);
    return [...MOCK_PURCHASE_REQUESTS];
}

// --- MODIFICATION FUNCTIONS ---

// PATIENTS
export const addMockPatient = (patient: PatientFull) => {
    MOCK_PATIENTS = [patient, ...MOCK_PATIENTS];
    saveData(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS);
    return [...MOCK_PATIENTS];
};

export const updateMockPatient = (id: string, updates: Partial<PatientFull>) => {
    const index = MOCK_PATIENTS.findIndex(p => p.id === id);
    if (index !== -1) {
        const updatedPatient = { ...MOCK_PATIENTS[index], ...updates };
        MOCK_PATIENTS[index] = updatedPatient;
        MOCK_PATIENTS = [...MOCK_PATIENTS];
        saveData(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS);
        return updatedPatient;
    }
    return null;
}

export const deleteMockPatient = (id: string) => {
    const newList = MOCK_PATIENTS.filter(p => p.id !== id);
    MOCK_PATIENTS = [...newList];
    saveData(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS);
    return [...MOCK_PATIENTS];
}

// TREATMENTS
export const addMockTreatment = (treatment: Treatment) => {
    MOCK_TREATMENTS = [treatment, ...MOCK_TREATMENTS];
    saveData(STORAGE_KEYS.TREATMENTS, MOCK_TREATMENTS);
    recalculatePatientActiveStatus(treatment.patientId);
    return [...MOCK_TREATMENTS];
};

export const updateMockTreatment = (id: string, updates: Partial<Treatment>) => {
    const index = MOCK_TREATMENTS.findIndex(t => t.id === id);
    if (index !== -1) {
        const oldTreatment = MOCK_TREATMENTS[index];
        const newTreatment = { ...oldTreatment, ...updates };
        MOCK_TREATMENTS[index] = newTreatment;
        MOCK_TREATMENTS = [...MOCK_TREATMENTS];
        saveData(STORAGE_KEYS.TREATMENTS, MOCK_TREATMENTS);
        
        if (updates.status && updates.status !== oldTreatment.status) {
            recalculatePatientActiveStatus(newTreatment.patientId);
        }
        return newTreatment;
    }
    return null;
};

// DOSES
export const addMockDose = (dose: Dose) => {
    MOCK_DOSES = [dose, ...MOCK_DOSES];
    saveData(STORAGE_KEYS.DOSES, MOCK_DOSES);
    
    // Se a dose foi salva como "Aplicada" e tem vínculo com inventário, dar baixa
    if (dose.status !== DoseStatus.NOT_ACCEPTED && dose.inventoryLotId) {
        const treatment = MOCK_TREATMENTS.find(t => t.id === dose.treatmentId);
        if (treatment) {
            dispenseMedication(dose.id, dose.inventoryLotId, treatment.patientId);
        }
    }
    
    return [...MOCK_DOSES];
}

export const updateMockDose = (id: string, updates: Partial<Dose>, protocolFrequency?: number) => {
    const index = MOCK_DOSES.findIndex(d => d.id === id);
    if (index !== -1) {
        let updatedDose = { ...MOCK_DOSES[index], ...updates };
        
        if (updates.applicationDate && protocolFrequency) {
            const calc = calculateDoseLogic(updates.applicationDate, protocolFrequency);
            updatedDose = { ...updatedDose, ...calc };
        }

        MOCK_DOSES[index] = updatedDose;
        MOCK_DOSES = [...MOCK_DOSES];
        saveData(STORAGE_KEYS.DOSES, MOCK_DOSES);
        
        // Check dispense logic on update
        if (updates.inventoryLotId && updates.status !== DoseStatus.NOT_ACCEPTED) {
             const treatment = MOCK_TREATMENTS.find(t => t.id === updatedDose.treatmentId);
             if (treatment) {
                 // Verifica se já não foi dispensado antes para não duplicar (simplificado)
                 const alreadyDispensed = MOCK_DISPENSE_LOGS.some(log => log.doseId === id);
                 if (!alreadyDispensed) {
                     dispenseMedication(id, updates.inventoryLotId, treatment.patientId);
                 }
             }
        }

        return [...MOCK_DOSES];
    }
    return null;
}

// DOCUMENTS
export const addMockDocument = (doc: ConsentDocument) => {
    MOCK_DOCUMENTS.push(doc);
    saveData(STORAGE_KEYS.DOCUMENTS, MOCK_DOCUMENTS);
};

export const getPatientDocuments = (patientId: string) => {
    return MOCK_DOCUMENTS.filter(d => d.patientId === patientId);
};

// PROTOCOLS
export const addMockProtocol = (protocol: Protocol) => {
    MOCK_PROTOCOLS = [...MOCK_PROTOCOLS, protocol];
    saveData(STORAGE_KEYS.PROTOCOLS, MOCK_PROTOCOLS);
    return [...MOCK_PROTOCOLS];
}

export const updateMockProtocol = (id: string, updates: Partial<Protocol>) => {
    MOCK_PROTOCOLS = MOCK_PROTOCOLS.map(p => p.id === id ? { ...p, ...updates } : p);
    saveData(STORAGE_KEYS.PROTOCOLS, MOCK_PROTOCOLS);
    return [...MOCK_PROTOCOLS];
}

export const deleteMockProtocol = (id: string) => {
    const newList = MOCK_PROTOCOLS.filter(p => p.id !== id);
    MOCK_PROTOCOLS = [...newList];
    saveData(STORAGE_KEYS.PROTOCOLS, MOCK_PROTOCOLS);
    return [...MOCK_PROTOCOLS];
}

// DIAGNOSES
export const getDiagnoses = () => {
    // Retorna uma cópia fresca para garantir que o React detecte mudanças se a referência anterior for igual
    return [...MOCK_DIAGNOSES];
}

export const addMockDiagnosis = (diagnosis: Diagnosis) => {
    MOCK_DIAGNOSES = [...MOCK_DIAGNOSES, diagnosis];
    saveData(STORAGE_KEYS.DIAGNOSES, MOCK_DIAGNOSES);
    return [...MOCK_DIAGNOSES]; // Retorna nova referência
}

export const deleteMockDiagnosis = (id: string) => {
    const newList = MOCK_DIAGNOSES.filter(d => d.id !== id);
    MOCK_DIAGNOSES = [...newList]; 
    saveData(STORAGE_KEYS.DIAGNOSES, MOCK_DIAGNOSES);
    return [...MOCK_DIAGNOSES]; // Retorna nova referência
}

// CONTACTS DISMISSAL
export const dismissMockContact = (id: string) => {
    const exists = MOCK_DISMISSED_LOGS.some(log => log.contactId === id);
    if (!exists) {
        const newLog: DismissedLog = {
            contactId: id,
            dismissedAt: new Date().toISOString()
        };
        MOCK_DISMISSED_LOGS = [...MOCK_DISMISSED_LOGS, newLog];
        saveData(STORAGE_KEYS.DISMISSED_LOGS, MOCK_DISMISSED_LOGS);
    }
    return [...MOCK_DISMISSED_LOGS];
}