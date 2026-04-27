// March 2026 — Client-side variable resolver for "Campos Personalizados".
// Mirrors the backend's messageVariables.service.ts so messages computed locally
// (e.g. Dashboard's upcomingContacts memo) get the same resolved output.
//
// Variables supported (per [E:/1/17.png]):
//   {nome_responsavel}      → first name of guardian
//   {nome_paciente}         → first name of patient
//   {nome_medico}           → doctor full name from the treatment plan
//   {data_proxima_dose}     → next dose date (DD/MM/YYYY)
//   {data_proxima_consulta} → "<Mês>/<Ano> - 1ª/2ª Quinzena"

import { Dose, DoseStatus, Patient, PatientFull, Treatment, Protocol } from '../types';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const firstName = (full?: string | null): string => {
  if (!full) return '';
  return full.trim().split(/\s+/)[0] || '';
};

const formatDateBR = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  // Use UTC parts so we don't shift dates around timezone boundaries
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const formatConsultationPeriod = (
  month?: number | null,
  year?: number | null,
  fortnight?: number | null,
  fallbackDate?: string | Date | null,
): string => {
  if (month && year && fortnight) {
    const idx = Math.max(1, Math.min(12, month)) - 1;
    return `${MONTH_NAMES_PT[idx]}/${year} - ${fortnight === 1 ? '1ª Quinzena' : '2ª Quinzena'}`;
  }
  if (fallbackDate) {
    const d = typeof fallbackDate === 'string' ? new Date(fallbackDate) : fallbackDate;
    if (isNaN(d.getTime())) return '';
    const idx = d.getUTCMonth();
    const fn = d.getUTCDate() <= 15 ? '1ª Quinzena' : '2ª Quinzena';
    return `${MONTH_NAMES_PT[idx]}/${d.getUTCFullYear()} - ${fn}`;
  }
  return '';
};

// Replace all {tag} occurrences in `template` with values from `vars`. Unknown tags are left intact.
export const renderTemplate = (template: string, vars: Record<string, string>): string => {
  if (!template) return '';
  return template.replace(/\{[a-zA-Z_]+\}/g, (match) => {
    return Object.prototype.hasOwnProperty.call(vars, match) ? vars[match] : match;
  });
};

// Build a variable map from a treatment + its patient + protocol + doses.
// All inputs are read-only — pass whatever you already have loaded in state.
export const buildTreatmentVariables = (opts: {
  treatment: Treatment & { doctor?: { id: string; name: string } | null };
  patient: PatientFull | Patient | null | undefined;
  protocol?: Protocol | null;
  doses?: Dose[];
}): Record<string, string> => {
  const { treatment, patient, protocol, doses } = opts;

  const guardianFullName = (patient as PatientFull | undefined)?.guardian?.fullName;

  // Determine "next dose date":
  //   1. First PENDING dose for this treatment (smallest cycle), OR
  //   2. Latest applied + protocol.frequencyDays
  let nextDoseDate: Date | null = null;
  if (doses && doses.length > 0) {
    const treatmentDoses = doses.filter(d => d.treatmentId === treatment.id);
    const firstPending = treatmentDoses
      .filter(d => d.status === DoseStatus.PENDING)
      .sort((a, b) => (a.cycleNumber ?? 0) - (b.cycleNumber ?? 0))[0];
    if (firstPending) {
      nextDoseDate = new Date(firstPending.applicationDate);
    } else {
      const appliedDoses = treatmentDoses
        .filter(d => d.status === DoseStatus.APPLIED || d.status === DoseStatus.APPLIED_LATE || d.status === DoseStatus.CONFIRM_APPLICATION)
        .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
      const latest = appliedDoses[0];
      if (latest) {
        const d = new Date(latest.applicationDate);
        d.setDate(d.getDate() + (protocol?.frequencyDays || 28));
        nextDoseDate = d;
      }
    }
  }

  return {
    '{nome_responsavel}':      firstName(guardianFullName),
    '{nome_paciente}':         firstName(patient?.fullName),
    '{nome_medico}':           treatment.doctor?.name || '',
    '{data_proxima_dose}':     formatDateBR(nextDoseDate),
    '{data_proxima_consulta}': formatConsultationPeriod(
      treatment.nextConsultationMonth,
      treatment.nextConsultationYear,
      treatment.nextConsultationFortnight,
      treatment.nextConsultationDate,
    ),
  };
};
