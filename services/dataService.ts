// Data Service - Wraps API calls with caching and fallback to mock data
// This provides a smooth transition from mock data to real API

import {
  patientsApi,
  diagnosesApi,
  medicationsApi,
  protocolsApi,
  treatmentsApi,
  dosesApi,
  inventoryApi,
  dispenseLogsApi,
  purchaseRequestsApi,
  dashboardApi,
  getAuthToken,
} from './api';

import {
  PatientFull,
  Treatment,
  Dose,
  Protocol,
  Diagnosis,
  InventoryItem,
  DispenseLog,
  PurchaseRequest,
  MedicationBase,
  DismissedLog,
  ConsentDocument,
  DoseStatus,
  PaymentStatus,
  SurveyStatus,
  TreatmentStatus,
  ProtocolCategory,
} from '../types';

// Check if API is available
const isApiAvailable = () => !!getAuthToken();

// Helper to convert backend data to frontend format
const convertPatient = (data: any): PatientFull => ({
  id: data.id,
  fullName: data.fullName,
  birthDate: data.birthDate,
  gender: data.gender,
  mainDiagnosis: data.mainDiagnosis,
  clinicalNotes: data.clinicalNotes,
  active: data.active,
  guardian: data.guardian ? {
    id: data.guardian.id,
    patientId: data.id,
    fullName: data.guardian.fullName,
    phonePrimary: data.guardian.phonePrimary,
    phoneSecondary: data.guardian.phoneSecondary,
    email: data.guardian.email,
    relationship: data.guardian.relationship,
  } : {
    id: '',
    patientId: data.id,
    fullName: '',
    phonePrimary: '',
    relationship: '',
  },
  address: data.address ? {
    id: data.address.id,
    patientId: data.id,
    street: data.address.street,
    number: data.address.number,
    complement: data.address.complement,
    neighborhood: data.address.neighborhood,
    city: data.address.city,
    state: data.address.state,
    zipCode: data.address.zipCode,
  } : undefined,
});

const convertDose = (data: any): Dose => ({
  id: data.id,
  treatmentId: data.treatmentId,
  cycleNumber: data.cycleNumber,
  applicationDate: data.applicationDate,
  lotNumber: data.lotNumber,
  expiryDate: data.expiryDate,
  status: data.status as DoseStatus,
  calculatedNextDate: data.calculatedNextDate || '',
  daysUntilNext: data.daysUntilNext || 0,
  isLastBeforeConsult: data.isLastBeforeConsult,
  consultationDate: data.consultationDate,
  paymentStatus: data.paymentStatus as PaymentStatus,
  paymentUpdatedAt: data.paymentUpdatedAt,
  nurse: data.nurse,
  surveyStatus: data.surveyStatus as SurveyStatus,
  surveyScore: data.surveyScore,
  surveyComment: data.surveyComment,
  inventoryLotId: data.inventoryLotId,
});

const convertTreatment = (data: any): Treatment => ({
  id: data.id,
  patientId: data.patientId,
  protocolId: data.protocolId,
  status: data.status as TreatmentStatus,
  startDate: data.startDate,
  nextConsultationDate: data.nextConsultationDate,
  observations: data.observations,
  plannedDosesBeforeConsult: data.plannedDosesBeforeConsult,
});

const convertProtocol = (data: any): Protocol => ({
  id: data.id,
  name: data.name,
  category: data.category === 'MEDICATION' ? ProtocolCategory.MEDICATION : ProtocolCategory.MONITORING,
  medicationType: data.medicationType || '',
  frequencyDays: data.frequencyDays,
  goal: data.goal,
  message: data.message,
  milestones: data.milestones?.map((m: any) => ({
    day: m.day,
    message: m.message,
  })),
});

const convertInventoryItem = (data: any): InventoryItem => ({
  id: data.id,
  medicationName: data.medicationName,
  lotNumber: data.lotNumber,
  expiryDate: data.expiryDate,
  quantity: data.quantity,
  unit: data.unit,
  entryDate: data.entryDate,
  active: data.active,
});

// ============== PATIENTS ==============

export const fetchPatients = async (params?: {
  search?: string;
  diagnosis?: string;
  active?: boolean;
}): Promise<PatientFull[]> => {
  if (!isApiAvailable()) {
    throw new Error('Not authenticated');
  }

  const response = await patientsApi.getAll(params);
  return response.data.map(convertPatient);
};

export const fetchPatient = async (id: string): Promise<PatientFull | null> => {
  if (!isApiAvailable()) {
    throw new Error('Not authenticated');
  }

  const data = await patientsApi.getById(id);
  return convertPatient(data);
};

export const createPatient = async (patient: Partial<PatientFull>): Promise<PatientFull> => {
  const data = await patientsApi.create({
    fullName: patient.fullName,
    birthDate: patient.birthDate,
    gender: patient.gender,
    mainDiagnosis: patient.mainDiagnosis,
    clinicalNotes: patient.clinicalNotes,
    guardian: patient.guardian ? {
      fullName: patient.guardian.fullName,
      phonePrimary: patient.guardian.phonePrimary,
      phoneSecondary: patient.guardian.phoneSecondary,
      email: patient.guardian.email,
      relationship: patient.guardian.relationship,
    } : undefined,
    address: patient.address ? {
      street: patient.address.street,
      number: patient.address.number,
      complement: patient.address.complement,
      neighborhood: patient.address.neighborhood,
      city: patient.address.city,
      state: patient.address.state,
      zipCode: patient.address.zipCode,
    } : undefined,
  });
  return convertPatient(data);
};

export const updatePatient = async (id: string, updates: Partial<PatientFull>): Promise<PatientFull> => {
  const data = await patientsApi.update(id, updates);
  return convertPatient(data);
};

export const deletePatient = async (id: string): Promise<void> => {
  await patientsApi.delete(id);
};

// ============== DIAGNOSES ==============

export const fetchDiagnoses = async (): Promise<Diagnosis[]> => {
  const response = await diagnosesApi.getAll();
  return response.data.map((d: any) => ({
    id: d.id,
    name: d.name,
    color: d.color,
  }));
};

export const createDiagnosis = async (diagnosis: Omit<Diagnosis, 'id'>): Promise<Diagnosis> => {
  return await diagnosesApi.create(diagnosis);
};

export const deleteDiagnosis = async (id: string): Promise<void> => {
  await diagnosesApi.delete(id);
};

// ============== PROTOCOLS ==============

export const fetchProtocols = async (category?: string): Promise<Protocol[]> => {
  const response = await protocolsApi.getAll(category);
  return response.data.map(convertProtocol);
};

export const fetchProtocol = async (id: string): Promise<Protocol> => {
  const data = await protocolsApi.getById(id);
  return convertProtocol(data);
};

export const createProtocol = async (protocol: Omit<Protocol, 'id'>): Promise<Protocol> => {
  const data = await protocolsApi.create({
    name: protocol.name,
    category: protocol.category === ProtocolCategory.MEDICATION ? 'MEDICATION' : 'MONITORING',
    medicationType: protocol.medicationType,
    frequencyDays: protocol.frequencyDays,
    goal: protocol.goal,
    message: protocol.message,
    milestones: protocol.milestones,
  });
  return convertProtocol(data);
};

export const updateProtocol = async (id: string, updates: Partial<Protocol>): Promise<Protocol> => {
  const data = await protocolsApi.update(id, {
    ...updates,
    category: updates.category === ProtocolCategory.MEDICATION ? 'MEDICATION' : 'MONITORING',
  });
  return convertProtocol(data);
};

export const deleteProtocol = async (id: string): Promise<void> => {
  await protocolsApi.delete(id);
};

// ============== TREATMENTS ==============

export const fetchTreatments = async (params?: {
  patientId?: string;
  status?: string;
}): Promise<Treatment[]> => {
  const response = await treatmentsApi.getAll(params);
  return response.data.map(convertTreatment);
};

export const fetchTreatment = async (id: string): Promise<any> => {
  return await treatmentsApi.getById(id);
};

export const createTreatment = async (treatment: Omit<Treatment, 'id'>): Promise<Treatment> => {
  const data = await treatmentsApi.create(treatment);
  return convertTreatment(data);
};

export const updateTreatment = async (id: string, updates: Partial<Treatment>): Promise<Treatment> => {
  const data = await treatmentsApi.update(id, updates);
  return convertTreatment(data);
};

export const deleteTreatment = async (id: string): Promise<void> => {
  await treatmentsApi.delete(id);
};

// ============== DOSES ==============

export const fetchDoses = async (params?: {
  treatmentId?: string;
  status?: string;
}): Promise<Dose[]> => {
  const response = await dosesApi.getAll(params);
  return response.data.map(convertDose);
};

export const fetchDose = async (id: string): Promise<Dose> => {
  const data = await dosesApi.getById(id);
  return convertDose(data);
};

export const createDose = async (dose: Omit<Dose, 'id'>): Promise<Dose> => {
  const data = await dosesApi.create(dose);
  return convertDose(data);
};

export const updateDose = async (id: string, updates: Partial<Dose>): Promise<Dose> => {
  const data = await dosesApi.update(id, updates);
  return convertDose(data);
};

export const deleteDose = async (id: string): Promise<void> => {
  await dosesApi.delete(id);
};

// ============== INVENTORY ==============

export const fetchInventory = async (params?: {
  search?: string;
  grouped?: boolean;
}): Promise<InventoryItem[]> => {
  const response = await inventoryApi.getAll(params);
  return response.data.map(convertInventoryItem);
};

export const fetchAvailableLots = async (medicationName?: string): Promise<InventoryItem[]> => {
  const response = await inventoryApi.getAvailable(medicationName);
  return response.data.map(convertInventoryItem);
};

export const createInventoryItem = async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
  const data = await inventoryApi.create(item);
  return convertInventoryItem(data);
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
  const data = await inventoryApi.update(id, updates);
  return convertInventoryItem(data);
};

// ============== MEDICATIONS BASE ==============

export const fetchMedicationBase = async (): Promise<MedicationBase[]> => {
  const response = await medicationsApi.getAll();
  return response.data;
};

export const createMedicationBase = async (medication: Omit<MedicationBase, 'id'>): Promise<MedicationBase> => {
  return await medicationsApi.create(medication);
};

export const deleteMedicationBase = async (id: string): Promise<void> => {
  await medicationsApi.delete(id);
};

// ============== PURCHASE REQUESTS ==============

export const fetchPurchaseRequests = async (status?: string): Promise<PurchaseRequest[]> => {
  const response = await purchaseRequestsApi.getAll(status);
  return response.data;
};

export const checkPurchaseTriggers = async (): Promise<{ created: PurchaseRequest[]; message: string }> => {
  return await purchaseRequestsApi.check();
};

export const updatePurchaseRequest = async (id: string, status: string): Promise<PurchaseRequest> => {
  return await purchaseRequestsApi.update(id, status);
};

// ============== DISPENSE LOGS ==============

export const fetchDispenseLogs = async (params?: {
  patientId?: string;
  medicationName?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<DispenseLog[]> => {
  const response = await dispenseLogsApi.getAll(params);
  return response.data;
};

export const fetchDispenseReport = async (params?: {
  period?: 'monthly' | 'quarterly' | 'yearly';
  year?: number;
}): Promise<any[]> => {
  const response = await dispenseLogsApi.getReport(params);
  return response.data;
};

// ============== DASHBOARD ==============

export const fetchDashboardStats = async (): Promise<any> => {
  return await dashboardApi.getStats();
};

export const fetchUpcomingContacts = async (days?: number): Promise<any[]> => {
  const response = await dashboardApi.getUpcomingContacts(days);
  return response.data;
};

export const dismissContact = async (contactId: string): Promise<void> => {
  await dashboardApi.dismissContact(contactId);
};

export const fetchActivityWindow = async (days?: number): Promise<any[]> => {
  const response = await dashboardApi.getActivityWindow(days);
  return response.data;
};

// ============== DOCUMENTS ==============

export const fetchPatientDocuments = async (patientId: string): Promise<ConsentDocument[]> => {
  const response = await patientsApi.getDocuments(patientId);
  return response.data;
};

export const uploadDocument = async (
  patientId: string,
  data: { fileName: string; fileType: string; fileUrl: string }
): Promise<ConsentDocument> => {
  return await patientsApi.uploadDocument(patientId, data);
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  await patientsApi.deleteDocument(documentId);
};

// ============== GUARDIAN ==============

export const updateGuardian = async (patientId: string, data: any): Promise<any> => {
  return await patientsApi.updateGuardian(patientId, data);
};

// ============== ADDRESS ==============

export const upsertAddress = async (patientId: string, data: any): Promise<any> => {
  return await patientsApi.upsertAddress(patientId, data);
};

export const deleteAddress = async (patientId: string): Promise<void> => {
  await patientsApi.deleteAddress(patientId);
};

export default {
  // Patients
  fetchPatients,
  fetchPatient,
  createPatient,
  updatePatient,
  deletePatient,
  // Diagnoses
  fetchDiagnoses,
  createDiagnosis,
  deleteDiagnosis,
  // Protocols
  fetchProtocols,
  fetchProtocol,
  createProtocol,
  updateProtocol,
  deleteProtocol,
  // Treatments
  fetchTreatments,
  fetchTreatment,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  // Doses
  fetchDoses,
  fetchDose,
  createDose,
  updateDose,
  deleteDose,
  // Inventory
  fetchInventory,
  fetchAvailableLots,
  createInventoryItem,
  updateInventoryItem,
  // Medication Base
  fetchMedicationBase,
  createMedicationBase,
  deleteMedicationBase,
  // Purchase Requests
  fetchPurchaseRequests,
  checkPurchaseTriggers,
  updatePurchaseRequest,
  // Dispense Logs
  fetchDispenseLogs,
  fetchDispenseReport,
  // Dashboard
  fetchDashboardStats,
  fetchUpcomingContacts,
  dismissContact,
  fetchActivityWindow,
  // Documents
  fetchPatientDocuments,
  uploadDocument,
  deleteDocument,
  // Guardian & Address
  updateGuardian,
  upsertAddress,
  deleteAddress,
};
