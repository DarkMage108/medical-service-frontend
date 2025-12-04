import React from 'react';

interface KpiCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor?: 'green' | 'red' | 'blue' | 'purple' | 'cyan' | 'gray';
  onClick?: () => void;
}

const accentMap = {
  green: 'bg-green-50 text-green-600 border-green-500',
  red: 'bg-red-50 text-red-600 border-red-500',
  blue: 'bg-blue-50 text-blue-600 border-blue-500',
  purple: 'bg-purple-50 text-purple-600 border-purple-500',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-500',
  gray: 'bg-gray-50 text-gray-600 border-gray-500',
} as const;

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  subtitle,
  value,
  icon,
  accentColor = 'green',
  onClick,
}) => {
  const accent = accentMap[accentColor];
  const borderClass = accent.split(' ')[2]; // Extract border color for bottom bar

  return (
    <div
      onClick={onClick}
      className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden cursor-pointer transition-all hover:shadow-md hover:translate-y-[1px] active:scale-[0.98] group"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
          {title}
        </h3>
        <div className={`p-2 rounded-lg ${accent.split(' ')[0]} ${accent.split(' ')[1]}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      <div className={`absolute bottom-0 left-0 w-full h-1 ${borderClass.replace('border-', 'bg-')}`}></div>
    </div>
  );
};

export default KpiCard;