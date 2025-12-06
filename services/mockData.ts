
import { PatientFull, Treatment, Dose, DoseStatus, PaymentStatus, SurveyStatus, ConsentDocument, Protocol, FrequencyDays, Diagnosis, TreatmentStatus, ProtocolCategory, UserRole, DismissedLog, InventoryItem, DispenseLog, PurchaseRequest, MedicationBase } from '../types';
import { addDays, diffInDays, DIAGNOSIS_PALETTE } from '../constants';

// --- DATABASE CONFIGURATION (LOCAL STORAGE ADAPTER) ---

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

// Simulate Network Latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Low-level Data Access Layer (Safe for SSR)
const loadData = <T>(key: string, defaults: T): T => {
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaults;
  } catch (e) {
    console.error('DB Load Error', e);
    return defaults;
  }
};

const saveData = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('DB Save Error', e);
  }
};

// --- SEEDS (Only used if DB is empty) ---
const SEED_PROTOCOLS: Protocol[] = [
  { id: 'p1', name: 'Puberdade Precoce - Mensal', category: ProtocolCategory.MEDICATION, medicationType: 'Acetato de Leuprorrelina 3.75mg', frequencyDays: FrequencyDays.MONTHLY, message: 'Monitorar sinais de puberdade.', milestones: [{ day: 25, message: 'Lembrete: Próxima dose em 3 dias.' }] },
  { id: 'p2', name: 'Puberdade Precoce - Trimestral', category: ProtocolCategory.MEDICATION, medicationType: 'Acetato de Leuprorrelina 11.25mg', frequencyDays: FrequencyDays.TRIMESTER, milestones: [{ day: 80, message: 'Lembrete: Agendar aplicação e renovar receita.' }] }
];
const SEED_DIAGNOSES: Diagnosis[] = [
    { id: 'diag_1', name: 'Puberdade Precoce', color: DIAGNOSIS_PALETTE[0].class }, // Pink
    { id: 'diag_2', name: 'Baixa Estatura', color: DIAGNOSIS_PALETTE[1].class } // Blue
];

// --- MOCK USERS ---
export const MOCK_USERS = [
  { id: 'u1', name: 'Dr. Azevedo', email: 'dr.azevedo@azevedo.com', pass: 'admin123', role: UserRole.ADMIN },
  { id: 'u2', name: 'Dra. Ana', email: 'dra.ana@azevedo.com', pass: 'doctor123', role: UserRole.DOCTOR },
  { id: 'u3', name: 'Marta (Sec)', email: 'marta@azevedo.com', pass: 'secret123', role: UserRole.SECRETARY }
];

// --- IN-MEMORY DATABASE CACHE (Single Source of Truth) ---
// This acts as the "Server State" loaded from persistence
let _db = {
  patients: loadData<PatientFull[]>(STORAGE_KEYS.PATIENTS, []),
  treatments: loadData<Treatment[]>(STORAGE_KEYS.TREATMENTS, []),
  doses: loadData<Dose[]>(STORAGE_KEYS.DOSES, []),
  documents: loadData<ConsentDocument[]>(STORAGE_KEYS.DOCUMENTS, []),
  protocols: loadData<Protocol[]>(STORAGE_KEYS.PROTOCOLS, SEED_PROTOCOLS),
  diagnoses: loadData<Diagnosis[]>(STORAGE_KEYS.DIAGNOSES, SEED_DIAGNOSES),
  inventory: loadData<InventoryItem[]>(STORAGE_KEYS.INVENTORY, []),
  medications: loadData<MedicationBase[]>(STORAGE_KEYS.MEDICATION_BASE, []),
  logs: loadData<DismissedLog[]>(STORAGE_KEYS.DISMISSED_LOGS, []),
  dispenseLogs: loadData<DispenseLog[]>(STORAGE_KEYS.DISPENSE_LOGS, []),
  purchaseRequests: loadData<PurchaseRequest[]>(STORAGE_KEYS.PURCHASE_REQUESTS, [])
};

// --- BUSINESS LOGIC HELPERS ---

const recalculatePatientActiveStatus = (patientId: string) => {
    const patientTreatments = _db.treatments.filter(t => t.patientId === patientId);
    const isActive = patientTreatments.some(t => 
        t.status === TreatmentStatus.ONGOING || t.status === TreatmentStatus.EXTERNAL
    );

    const index = _db.patients.findIndex(p => p.id === patientId);
    if (index !== -1 && _db.patients[index].active !== isActive) {
        _db.patients[index] = { ..._db.patients[index], active: isActive };
        saveData(STORAGE_KEYS.PATIENTS, _db.patients);
    }
};

const calculateDoseLogic = (date: string, freq: number) => {
  const appDate = new Date(date);
  const nextDate = addDays(appDate, freq);
  const diffTime = nextDate.getTime() - new Date().getTime();
  const daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return { calculatedNextDate: nextDate.toISOString(), daysUntilNext };
};

// --- PUBLIC ASYNC API (DATABASE SERVICES) ---

export const PatientService = {
  getAll: async (): Promise<PatientFull[]> => {
    await delay(300);
    return [..._db.patients];
  },
  getById: async (id: string): Promise<PatientFull | undefined> => {
    await delay(200);
    return _db.patients.find(p => p.id === id);
  },
  create: async (patient: PatientFull): Promise<PatientFull> => {
    await delay(500);
    _db.patients = [patient, ..._db.patients];
    saveData(STORAGE_KEYS.PATIENTS, _db.patients);
    return patient;
  },
  update: async (id: string, updates: Partial<PatientFull>): Promise<PatientFull> => {
    await delay(400);
    const index = _db.patients.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Patient not found");
    
    _db.patients[index] = { ..._db.patients[index], ...updates };
    saveData(STORAGE_KEYS.PATIENTS, _db.patients);
    return _db.patients[index];
  },
  delete: async (id: string): Promise<void> => {
    await delay(500);
    _db.patients = _db.patients.filter(p => p.id !== id);
    saveData(STORAGE_KEYS.PATIENTS, _db.patients);
  }
};

export const TreatmentService = {
  getByPatientId: async (patientId: string): Promise<Treatment[]> => {
    await delay(300);
    return _db.treatments.filter(t => t.patientId === patientId);
  },
  getAll: async (): Promise<Treatment[]> => {
    await delay(300);
    return [..._db.treatments];
  },
  getById: async (id: string): Promise<Treatment | undefined> => {
      await delay(200);
      return _db.treatments.find(t => t.id === id);
  },
  create: async (treatment: Treatment): Promise<Treatment> => {
    await delay(500);
    _db.treatments = [treatment, ..._db.treatments];
    saveData(STORAGE_KEYS.TREATMENTS, _db.treatments);
    recalculatePatientActiveStatus(treatment.patientId);
    return treatment;
  },
  update: async (id: string, updates: Partial<Treatment>): Promise<Treatment> => {
    await delay(400);
    const index = _db.treatments.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Treatment not found");
    
    const old = _db.treatments[index];
    const updated = { ...old, ...updates };
    _db.treatments[index] = updated;
    saveData(STORAGE_KEYS.TREATMENTS, _db.treatments);
    
    if (updates.status && updates.status !== old.status) {
        recalculatePatientActiveStatus(updated.patientId);
    }
    return updated;
  }
};

export const DoseService = {
  getAll: async (): Promise<Dose[]> => {
    await delay(300);
    return [..._db.doses];
  },
  getByTreatmentId: async (treatmentId: string): Promise<Dose[]> => {
    await delay(300);
    return _db.doses.filter(d => d.treatmentId === treatmentId);
  },
  create: async (dose: Dose): Promise<Dose> => {
    await delay(400);
    _db.doses = [dose, ..._db.doses];
    saveData(STORAGE_KEYS.DOSES, _db.doses);

    // Trigger Inventory Dispense if connected
    if (dose.status === DoseStatus.APPLIED && dose.inventoryLotId) {
       const treatment = _db.treatments.find(t => t.id === dose.treatmentId);
       if (treatment) {
           await InventoryService.dispense(dose.id, dose.inventoryLotId, treatment.patientId);
       }
    }
    return dose;
  },
  update: async (id: string, updates: Partial<Dose>, protocolFrequency?: number): Promise<Dose> => {
    await delay(400);
    const index = _db.doses.findIndex(d => d.id === id);
    if (index === -1) throw new Error("Dose not found");

    let updatedDose = { ..._db.doses[index], ...updates };
    
    if (updates.applicationDate && protocolFrequency) {
        const calc = calculateDoseLogic(updates.applicationDate, protocolFrequency);
        updatedDose = { ...updatedDose, ...calc };
    }

    _db.doses[index] = updatedDose;
    saveData(STORAGE_KEYS.DOSES, _db.doses);

    // Check dispense logic
    // FIXED: Check based on the *updated* object, not just the changes. 
    // This allows dashboard quick-update to trigger dispense if lot was already set.
    if (updatedDose.inventoryLotId && updatedDose.status === DoseStatus.APPLIED) {
         const treatment = _db.treatments.find(t => t.id === updatedDose.treatmentId);
         if (treatment) {
             const alreadyDispensed = _db.dispenseLogs.some(log => log.doseId === id);
             if (!alreadyDispensed) {
                 await InventoryService.dispense(id, updatedDose.inventoryLotId, treatment.patientId);
             }
         }
    }

    return updatedDose;
  }
};

export const InventoryService = {
  getAll: async (): Promise<InventoryItem[]> => {
    await delay(300);
    return [..._db.inventory];
  },
  addEntry: async (item: InventoryItem): Promise<InventoryItem> => {
    await delay(500);
    // Find item with same medication and lot
    const existingIndex = _db.inventory.findIndex(i => i.medicationName === item.medicationName && i.lotNumber === item.lotNumber);
    if (existingIndex !== -1) {
        // Add to existing
        _db.inventory[existingIndex] = { 
            ..._db.inventory[existingIndex], 
            quantity: _db.inventory[existingIndex].quantity + item.quantity,
            active: true // Reactivate if it was 0
        };
    } else {
        // Add new
        _db.inventory = [..._db.inventory, item];
    }
    saveData(STORAGE_KEYS.INVENTORY, _db.inventory);
    return item;
  },
  update: async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
    await delay(400);
    const index = _db.inventory.findIndex(i => i.id === id);
    if(index === -1) throw new Error("Item not found");
    
    _db.inventory[index] = { ..._db.inventory[index], ...updates };
    saveData(STORAGE_KEYS.INVENTORY, _db.inventory);
    return _db.inventory[index];
  },
  dispense: async (doseId: string, inventoryItemId: string, patientId: string): Promise<boolean> => {
    // Internal method, usually called by DoseService, but can be standalone
    const index = _db.inventory.findIndex(i => i.id === inventoryItemId);
    
    // Check if item exists and has quantity
    if (index === -1) return false;
    if (_db.inventory[index].quantity <= 0) return false;

    // Decrement
    _db.inventory[index].quantity -= 1;
    saveData(STORAGE_KEYS.INVENTORY, _db.inventory);

    // Log
    const log: DispenseLog = {
        id: `disp_${Date.now()}_${Math.random()}`,
        date: new Date().toISOString(),
        patientId,
        inventoryItemId,
        medicationName: _db.inventory[index].medicationName,
        quantity: 1,
        doseId
    };
    _db.dispenseLogs = [log, ..._db.dispenseLogs];
    saveData(STORAGE_KEYS.DISPENSE_LOGS, _db.dispenseLogs);
    return true;
  },
  getDispenseLogs: async (): Promise<DispenseLog[]> => {
      await delay(300);
      return [..._db.dispenseLogs];
  },
  getPurchaseRequests: async (): Promise<PurchaseRequest[]> => {
      await delay(300);
      return [..._db.purchaseRequests];
  },
  checkTriggers: async (): Promise<PurchaseRequest[]> => {
      // Regra de 10 dias (Purchase Prediction)
      // Agrupar demanda futura (próximos 10 dias) por medicamento
      const futureDemand: Record<string, number> = {};
      
      const activeTreatments = _db.treatments.filter(t => t.status === TreatmentStatus.ONGOING);
      
      activeTreatments.forEach(t => {
          const proto = _db.protocols.find(p => p.id === t.protocolId);
          if (!proto || proto.category !== ProtocolCategory.MEDICATION || !proto.medicationType) return;

          const doses = _db.doses.filter(d => d.treatmentId === t.id);
          const lastDose = doses.sort((a,b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime())[0];
          
          let nextDate: Date;
          if (lastDose) {
              nextDate = addDays(new Date(lastDose.applicationDate), proto.frequencyDays);
          } else {
              nextDate = new Date(t.startDate);
          }

          const diff = diffInDays(nextDate, new Date());
          // FIXED: Consider overdue items (diff < 0) as immediate demand too
          if (diff <= 10) {
              futureDemand[proto.medicationType] = (futureDemand[proto.medicationType] || 0) + 1;
          }
      });

      const requests: PurchaseRequest[] = [];
      Object.keys(futureDemand).forEach(medName => {
          const stockItems = _db.inventory.filter(i => i.medicationName === medName && i.active);
          const totalStock = stockItems.reduce((acc, item) => acc + item.quantity, 0);
          const demand = futureDemand[medName];

          if (totalStock <= demand) {
              const existingReq = _db.purchaseRequests.find(r => r.medicationName === medName && r.status === 'PENDING');
              if (!existingReq) {
                  const req: PurchaseRequest = {
                      id: `req_${Date.now()}_${Math.random()}`,
                      medicationName: medName,
                      createdAt: new Date().toISOString(),
                      currentStock: totalStock,
                      predictedConsumption10Days: demand,
                      status: 'PENDING',
                      suggestedQuantity: Math.max(demand * 3, 5) // Suggest at least 5 or 3x demand
                  };
                  requests.push(req);
              }
          }
      });

      if (requests.length > 0) {
          _db.purchaseRequests = [...requests, ..._db.purchaseRequests];
          saveData(STORAGE_KEYS.PURCHASE_REQUESTS, _db.purchaseRequests);
      }
      
      return _db.purchaseRequests;
  },
  updateRequest: async (id: string, status: 'ORDERED' | 'RECEIVED'): Promise<PurchaseRequest> => {
      await delay(300);
      const index = _db.purchaseRequests.findIndex(r => r.id === id);
      if(index === -1) throw new Error("Request not found");
      _db.purchaseRequests[index] = { ..._db.purchaseRequests[index], status };
      saveData(STORAGE_KEYS.PURCHASE_REQUESTS, _db.purchaseRequests);
      return _db.purchaseRequests[index];
  }
};

export const MedicationBaseService = {
  getAll: async (): Promise<MedicationBase[]> => {
    await delay(300);
    return [..._db.medications];
  },
  create: async (med: MedicationBase): Promise<MedicationBase> => {
    await delay(400);
    _db.medications = [..._db.medications, med];
    saveData(STORAGE_KEYS.MEDICATION_BASE, _db.medications);
    return med;
  },
  delete: async (id: string): Promise<void> => {
    await delay(400);
    _db.medications = _db.medications.filter(m => m.id !== id);
    saveData(STORAGE_KEYS.MEDICATION_BASE, _db.medications);
  }
};

export const ProtocolService = {
    getAll: async (): Promise<Protocol[]> => {
        await delay(300);
        return [..._db.protocols];
    },
    create: async (proto: Protocol) => {
        await delay(300);
        _db.protocols = [..._db.protocols, proto];
        saveData(STORAGE_KEYS.PROTOCOLS, _db.protocols);
        return proto;
    },
    update: async (id: string, updates: Partial<Protocol>) => {
        await delay(300);
        const idx = _db.protocols.findIndex(p => p.id === id);
        if(idx === -1) return [];
        _db.protocols[idx] = { ..._db.protocols[idx], ...updates };
        saveData(STORAGE_KEYS.PROTOCOLS, _db.protocols);
        return [..._db.protocols];
    },
    delete: async (id: string) => {
        await delay(300);
        _db.protocols = _db.protocols.filter(p => p.id !== id);
        saveData(STORAGE_KEYS.PROTOCOLS, _db.protocols);
        return [..._db.protocols];
    }
};

export const DiagnosisService = {
    getAll: async (): Promise<Diagnosis[]> => {
        await delay(200);
        return [..._db.diagnoses];
    },
    create: async (item: Diagnosis) => {
        await delay(300);
        _db.diagnoses = [..._db.diagnoses, item];
        saveData(STORAGE_KEYS.DIAGNOSES, _db.diagnoses);
        return [..._db.diagnoses];
    },
    update: async (id: string, updates: Partial<Diagnosis>) => {
        await delay(300);
        const idx = _db.diagnoses.findIndex(d => d.id === id);
        if(idx !== -1) {
            _db.diagnoses[idx] = { ..._db.diagnoses[idx], ...updates };
            saveData(STORAGE_KEYS.DIAGNOSES, _db.diagnoses);
        }
        return [..._db.diagnoses];
    },
    delete: async (id: string) => {
        await delay(300);
        _db.diagnoses = _db.diagnoses.filter(d => d.id !== id);
        saveData(STORAGE_KEYS.DIAGNOSES, _db.diagnoses);
        return [..._db.diagnoses];
    }
};

export const DocumentService = {
    getByPatient: async (patientId: string): Promise<ConsentDocument[]> => {
        await delay(300);
        return _db.documents.filter(d => d.patientId === patientId);
    },
    getAll: async (): Promise<ConsentDocument[]> => {
        await delay(300);
        return [..._db.documents];
    },
    add: async (doc: ConsentDocument) => {
        await delay(500);
        _db.documents.push(doc);
        saveData(STORAGE_KEYS.DOCUMENTS, _db.documents);
        return doc;
    }
};

export const LogService = {
    getDismissed: async (): Promise<DismissedLog[]> => {
        await delay(200);
        return [..._db.logs];
    },
    dismiss: async (id: string) => {
        await delay(200);
        if (!_db.logs.some(l => l.contactId === id)) {
            _db.logs = [..._db.logs, { contactId: id, dismissedAt: new Date().toISOString() }];
            saveData(STORAGE_KEYS.DISMISSED_LOGS, _db.logs);
        }
        return [..._db.logs];
    }
};
