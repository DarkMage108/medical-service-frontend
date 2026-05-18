import React from 'react';

interface KpiCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor?: 'green' | 'red' | 'blue' | 'purple' | 'cyan' | 'gray' | 'pink' | 'teal' | 'amber' | 'orange' | 'rose' | 'indigo' | 'emerald';
  highlight?: boolean;
  onClick?: () => void;
}

const accentMap = {
  green: 'bg-green-50 text-green-600 border-green-500',
  red: 'bg-red-50 text-red-600 border-red-500',
  blue: 'bg-blue-50 text-blue-600 border-blue-500',
  purple: 'bg-purple-50 text-purple-600 border-purple-500',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-500',
  gray: 'bg-gray-50 text-gray-600 border-gray-500',
  pink: 'bg-pink-50 text-pink-600 border-pink-500',
  teal: 'bg-teal-50 text-teal-600 border-teal-500',
  amber: 'bg-amber-50 text-amber-600 border-amber-500',
  orange: 'bg-orange-50 text-orange-600 border-orange-500',
  rose: 'bg-rose-50 text-rose-600 border-rose-500',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-500',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-500',
} as const;

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  subtitle,
  value,
  icon,
  accentColor = 'green',
  highlight = false,
  onClick,
}) => {
  const accent = accentMap[accentColor] || accentMap.green;
  const accentParts = accent.split(' ');
  const bgClass = accentParts[0] || 'bg-green-50';
  const textClass = accentParts[1] || 'text-green-600';
  const borderClass = accentParts[2] || 'border-green-500';
  const hasValue = Number(value) > 0;
  const isActive = highlight && hasValue;
  const isDimmed = highlight && !hasValue;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl relative overflow-hidden cursor-pointer transition-all hover:shadow-md active:scale-[0.98] group ${
        isActive
          ? `${bgClass} border-2 ${borderClass} shadow-md`
          : isDimmed
            ? 'bg-white border border-slate-100 shadow-sm opacity-60'
            : 'bg-white border border-slate-100 shadow-sm hover:translate-y-[1px]'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h3 className={`text-xs font-medium leading-tight transition-colors ${
          isActive ? `${textClass} font-bold` : isDimmed ? 'text-slate-400' : 'text-slate-500 group-hover:text-slate-800'
        }`}>
          {title}
        </h3>
        <div className={`p-1.5 rounded-lg ${isDimmed ? 'bg-slate-50 text-slate-300' : `${bgClass} ${textClass}`}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${isDimmed ? 'text-slate-300' : 'text-slate-800'}`}>{value}</p>
      {subtitle && <p className={`text-[10px] mt-0.5 ${isActive ? `${textClass} font-medium` : isDimmed ? 'text-slate-300' : 'text-slate-400'}`}>{subtitle}</p>}
      <div className={`absolute bottom-0 left-0 w-full ${isActive ? 'h-1.5' : 'h-1'} ${borderClass.replace('border-', 'bg-')} ${isDimmed ? 'opacity-20' : ''}`}></div>
    </div>
  );
};

export default KpiCard;