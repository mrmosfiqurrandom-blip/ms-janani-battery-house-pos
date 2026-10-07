import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant }) => {
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  const normalized = (variant || status).toLowerCase();

  if (['paid', 'active', 'received', 'completed', 'in_stock', 'success', 'green'].includes(normalized)) {
    colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['partial', 'pending', 'warning', 'amber'].includes(normalized)) {
    colorStyles = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['due', 'voided', 'cancelled', 'out_of_stock', 'scrap', 'scrapped', 'failed', 'red'].includes(normalized)) {
    colorStyles = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (['blue'].includes(normalized)) {
    colorStyles = 'bg-blue-50 text-blue-700 border-blue-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorStyles} whitespace-nowrap`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
