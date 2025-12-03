
import { PatientFull, Treatment, Dose, DoseStatus, PaymentStatus, SurveyStatus, ConsentDocument, Protocol, FrequencyDays, Diagnosis, TreatmentStatus, ProtocolCategory, UserRole } from '../types';
import { addDays } from '../constants';

// --- MOCK DATABASE WITH LOCAL STORAGE PERSISTENCE ---

const TODAY = new Date();
const STORAGE_KEYS = {
  PATIENTS: 'azevedo_patients',
  TREATMENTS: 'azevedo_treatments',
  DOSES: 'azevedo_doses',
  DOCUMENTS: 'azevedo_documents',
  PROTOCOLS: 'azevedo_protocols',
  DIAGNOSES: 'azevedo_diagnoses',
  DISMISSED_CONTACTS: 'azevedo_dismissed_contacts' // Nova chave para mensagens concluídas
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

const SEED_PROTOCOLS: Protocol[] = [
  {
    id: 'p1',
    name: 'Puberdade Precoce - Mensal',
    category: ProtocolCategory.MEDICATION,
    medicationType: 'Acetato de Leuprorrelina 3.75mg',
    frequencyDays: FrequencyDays.MONTHLY,
    message: 'Monitorar sinais de puberdade.',
    milestones: [
        // Apenas 1 ponto de contato próximo ao fim do ciclo (ex: dia 25 para ciclo de 28)
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
        // Apenas 1 ponto de contato próximo ao fim do ciclo (ex: dia 80 para ciclo de 84)
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
        // Apenas 1 ponto de contato próximo ao fim do ciclo (ex: dia 160 para ciclo de 168)
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
    protocolId: 'p1', // Mensal (28 days)
    status: TreatmentStatus.ONGOING,
    startDate: '2023-01-15',
    plannedDosesBeforeConsult: 3,
  },
  {
    id: 't_2',
    patientId: 'pat_2',
    protocolId: 'p2', // Trimestral (84 days)
    status: TreatmentStatus.ONGOING,
    startDate: '2023-06-01',
    plannedDosesBeforeConsult: 2,
  },
  // Tratamento de monitoramento para gerar mensagens na régua
  {
    id: 't_3',
    patientId: 'pat_1',
    protocolId: 'p4', // Acompanhamento Nutricional
    status: TreatmentStatus.ONGOING,
    startDate: new Date(TODAY.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString(), // Começou há 5 dias
    plannedDosesBeforeConsult: 0,
  }
];

// Helper for logic
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
  // Dose para hoje para testar funcionalidades de dashboard
  {
    id: 'd_3',
    treatmentId: 't_1',
    cycleNumber: 2,
    applicationDate: new Date().toISOString(), // HOJE
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

// --- ACTIVE DATA POOLS ---

export let MOCK_PATIENTS: PatientFull[] = loadData(STORAGE_KEYS.PATIENTS, SEED_PATIENTS);
export let MOCK_TREATMENTS: Treatment[] = loadData(STORAGE_KEYS.TREATMENTS, SEED_TREATMENTS);
export let MOCK_DOSES: Dose[] = loadData(STORAGE_KEYS.DOSES, SEED_DOSES);
export let MOCK_DOCUMENTS: ConsentDocument[] = loadData(STORAGE_KEYS.DOCUMENTS, SEED_DOCUMENTS);
export let MOCK_PROTOCOLS: Protocol[] = loadData(STORAGE_KEYS.PROTOCOLS, SEED_PROTOCOLS);
export let MOCK_DIAGNOSES: Diagnosis[] = loadData(STORAGE_KEYS.DIAGNOSES, SEED_DIAGNOSES);
// Lista de IDs de contatos (régua) que foram dispensados/concluídos
export let MOCK_DISMISSED_CONTACTS: string[] = loadData(STORAGE_KEYS.DISMISSED_CONTACTS, []);

// Helper function to recalculate patient active status
const recalculatePatientActiveStatus = (patientId: string) => {
    const patientTreatments = MOCK_TREATMENTS.filter(t => t.patientId === patientId);
    
    // Regra: Ativo se tiver pelo menos um tratamento ONGOING ou EXTERNAL
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

// --- MODIFICATION FUNCTIONS ---

// PATIENTS
export const addMockPatient = (patient: PatientFull) => {
    MOCK_PATIENTS = [patient, ...MOCK_PATIENTS]; // New ref with new patient first
    saveData(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS);
    return [...MOCK_PATIENTS]; // Return a fresh copy
};

export const updateMockPatient = (id: string, updates: Partial<PatientFull>) => {
    const index = MOCK_PATIENTS.findIndex(p => p.id === id);
    if (index !== -1) {
        // Create new object to update reference
        const updatedPatient = { ...MOCK_PATIENTS[index], ...updates };
        MOCK_PATIENTS[index] = updatedPatient;
        MOCK_PATIENTS = [...MOCK_PATIENTS]; // update array ref
        saveData(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS);
        return updatedPatient;
    }
    return null;
}

export const deleteMockPatient = (id: string) => {
    const newList = MOCK_PATIENTS.filter(p => p.id !== id);
    MOCK_PATIENTS = [...newList]; // Ensure new ref
    saveData(STORAGE_KEYS.PATIENTS, MOCK_PATIENTS);
    return [...MOCK_PATIENTS];
}

// TREATMENTS
export const addMockTreatment = (treatment: Treatment) => {
    MOCK_TREATMENTS = [treatment, ...MOCK_TREATMENTS];
    saveData(STORAGE_KEYS.TREATMENTS, MOCK_TREATMENTS);
    recalculatePatientActiveStatus(treatment.patientId); // Atualiza status do paciente
    return [...MOCK_TREATMENTS];
};

export const updateMockTreatment = (id: string, updates: Partial<Treatment>) => {
    const index = MOCK_TREATMENTS.findIndex(t => t.id === id);
    if (index !== -1) {
        const oldTreatment = MOCK_TREATMENTS[index];
        const newTreatment = { ...oldTreatment, ...updates };
        MOCK_TREATMENTS[index] = newTreatment;
        MOCK_TREATMENTS = [...MOCK_TREATMENTS]; // Fresh copy
        saveData(STORAGE_KEYS.TREATMENTS, MOCK_TREATMENTS);
        
        // Se o status mudou, recalcula o paciente
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
    return [...MOCK_DOSES];
}

export const updateMockDose = (id: string, updates: Partial<Dose>, protocolFrequency?: number) => {
    const index = MOCK_DOSES.findIndex(d => d.id === id);
    if (index !== -1) {
        let updatedDose = { ...MOCK_DOSES[index], ...updates };
        
        // Se a data de aplicação mudou e temos a frequência, recalculamos a próxima data
        if (updates.applicationDate && protocolFrequency) {
            const calc = calculateDoseLogic(updates.applicationDate, protocolFrequency);
            updatedDose = { ...updatedDose, ...calc };
        }

        MOCK_DOSES[index] = updatedDose;
        MOCK_DOSES = [...MOCK_DOSES]; // Trigger update
        saveData(STORAGE_KEYS.DOSES, MOCK_DOSES);
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

// PROTOCOLS (MEDICAMENTOS)
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
export const addMockDiagnosis = (diagnosis: Diagnosis) => {
    MOCK_DIAGNOSES = [...MOCK_DIAGNOSES, diagnosis];
    saveData(STORAGE_KEYS.DIAGNOSES, MOCK_DIAGNOSES);
    return [...MOCK_DIAGNOSES];
}

export const deleteMockDiagnosis = (id: string) => {
    const newList = MOCK_DIAGNOSES.filter(d => d.id !== id);
    MOCK_DIAGNOSES = [...newList]; // Ensure new array reference
    saveData(STORAGE_KEYS.DIAGNOSES, MOCK_DIAGNOSES);
    return [...MOCK_DIAGNOSES];
}

// CONTACTS DISMISSAL
export const dismissMockContact = (id: string) => {
    if (!MOCK_DISMISSED_CONTACTS.includes(id)) {
        MOCK_DISMISSED_CONTACTS = [...MOCK_DISMISSED_CONTACTS, id];
        saveData(STORAGE_KEYS.DISMISSED_CONTACTS, MOCK_DISMISSED_CONTACTS);
    }
    return [...MOCK_DISMISSED_CONTACTS];
}
