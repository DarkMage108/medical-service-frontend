import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// March 2026 spec — Phase 3 of treatment wizard.
// Replaces the exact next-consultation date with a Month/Year navigator + Quinzena toggle.
// See [E:/1/3.png] for the mockup.
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface FortnightSelectorProps {
  month: number | null;
  year: number | null;
  fortnight: 1 | 2 | null;
  onChange: (month: number | null, year: number | null, fortnight: 1 | 2 | null) => void;
  required?: boolean;
}

const FortnightSelector: React.FC<FortnightSelectorProps> = ({ month, year, fortnight, onChange, required }) => {
  // Compute current visible month/year — initialize to next month if nothing selected.
  // Wraps Dec → January of next year.
  const today = useMemo(() => new Date(), []);
  const defaultRawMonth = today.getMonth() + 2; // 1-indexed; may exceed 12 if today is Dec (12=Jan next year)
  const defaultMonth = ((defaultRawMonth - 1) % 12) + 1;
  const defaultYear = today.getFullYear() + Math.floor((defaultRawMonth - 1) / 12);
  const visibleMonth = month ?? defaultMonth;
  const visibleYear = year ?? defaultYear;

  // Don't allow navigating to a month before the current month (futuro apenas, per spec)
  const isFutureOrCurrent = (m: number, y: number): boolean => {
    if (y > today.getFullYear()) return true;
    if (y < today.getFullYear()) return false;
    return m >= today.getMonth() + 1;
  };

  const handlePrev = () => {
    let m = visibleMonth - 1;
    let y = visibleYear;
    if (m < 1) { m = 12; y -= 1; }
    if (!isFutureOrCurrent(m, y)) return;
    onChange(m, y, fortnight);
  };

  const handleNext = () => {
    let m = visibleMonth + 1;
    let y = visibleYear;
    if (m > 12) { m = 1; y += 1; }
    onChange(m, y, fortnight);
  };

  const handleFortnight = (f: 1 | 2) => {
    onChange(visibleMonth, visibleYear, f);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">
          Previsão de
        </p>
        <p className="text-xl font-bold mt-0.5">Próxima Consulta {required && <span className="text-pink-300">*</span>}</p>
      </div>

      <div className="bg-slate-50 px-5 py-4 space-y-3">
        {/* Month/Year navigator */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2 py-2">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-bold text-slate-800 text-lg">
            {MONTHS_PT[visibleMonth - 1]} {visibleYear}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Fortnight toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleFortnight(1)}
            className={`px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
              fortnight === 1 && month === visibleMonth && year === visibleYear
                ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            1ª Quinzena (1-15)
          </button>
          <button
            type="button"
            onClick={() => handleFortnight(2)}
            className={`px-3 py-2 rounded-lg border-2 text-sm font-bold transition-all ${
              fortnight === 2 && month === visibleMonth && year === visibleYear
                ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            2ª Quinzena (16-31)
          </button>
        </div>

        {/* Clear button when something is selected */}
        {month && year && fortnight && (
          <button
            type="button"
            onClick={() => onChange(null, null, null)}
            className="w-full text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Limpar previsão
          </button>
        )}
      </div>
    </div>
  );
};

export default FortnightSelector;
