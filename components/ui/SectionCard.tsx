import React from 'react';

interface SectionCardProps {
  id?: string;
  title: string;
  icon?: React.ReactNode;
  countBadge?: number;
  badgeColor?: string;
  headerBg?: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  id,
  title,
  icon,
  countBadge,
  badgeColor = 'bg-slate-100 text-slate-700',
  headerBg = 'bg-slate-50',
  children,
}) => (
  <div id={id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
    <div className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center ${headerBg}`}>
      <h3 className="font-bold text-slate-900 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {typeof countBadge === 'number' && (
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${badgeColor}`}>
          {countBadge}
        </span>
      )}
    </div>
    <div className="overflow-x-auto">
      {children}
    </div>
  </div>
);

export default SectionCard;