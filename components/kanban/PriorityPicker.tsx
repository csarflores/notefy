'use client';

import { TaskPriority } from '@/types';
import { Flag } from 'lucide-react';

export const PRIORITY_OPTIONS: {
  value: TaskPriority | null;
  label: string;
  dot: string;
  activeClass: string;
}[] = [
  {
    value: null,
    label: 'Ninguna',
    dot: '#c7c7cc',
    activeClass: 'bg-[#f5f5f7] text-[#3a3a3c] ring-1 ring-[#c7c7cc]',
  },
  {
    value: 'low',
    label: 'Baja',
    dot: '#34c759',
    activeClass: 'bg-[#e6f9ec] text-[#1a7a33] ring-1 ring-[#34c759]/35',
  },
  {
    value: 'medium',
    label: 'Media',
    dot: '#ff9500',
    activeClass: 'bg-[#fff4e0] text-[#b36400] ring-1 ring-[#ff9500]/35',
  },
  {
    value: 'high',
    label: 'Alta',
    dot: '#ff3b30',
    activeClass: 'bg-[#ffeceb] text-[#b3251d] ring-1 ring-[#ff3b30]/35',
  },
];

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Baja', color: '#34c759' },
  medium: { label: 'Media', color: '#ff9500' },
  high: { label: 'Alta', color: '#ff3b30' },
};

export function PriorityFlag({ priority, size = 11 }: { priority?: TaskPriority | null; size?: number }) {
  if (!priority) return null;
  const meta = PRIORITY_META[priority];
  return (
    <span title={`Prioridad ${meta.label.toLowerCase()}`} className="inline-flex shrink-0">
      <Flag size={size} color={meta.color} fill={meta.color} />
    </span>
  );
}

interface PriorityPickerProps {
  value: TaskPriority | null;
  onChange: (value: TaskPriority | null) => void;
  disabled?: boolean;
}

export default function PriorityPicker({ value, onChange, disabled }: PriorityPickerProps) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2">
        Prioridad
      </p>
      <div className="flex gap-1.5">
        {PRIORITY_OPTIONS.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value ?? 'none'}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                isActive ? option.activeClass : 'text-[#8e8e93] hover:bg-[#f5f5f7]'
              }`}
              disabled={disabled}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
                style={{ backgroundColor: isActive ? option.dot : '#d1d1d6' }}
              />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
