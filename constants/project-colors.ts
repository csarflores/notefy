export const PROJECT_COLORS = [
  {
    name: 'Azul',
    value: '#0066cc',
    gradient: 'from-[#0066cc] to-[#0052a3]'
  },
  {
    name: 'Verde',
    value: '#10b981',
    gradient: 'from-[#10b981] to-[#059669]'
  },
  {
    name: 'Morado',
    value: '#8b5cf6',
    gradient: 'from-[#8b5cf6] to-[#7c3aed]'
  },
  {
    name: 'Rojo',
    value: '#ef4444',
    gradient: 'from-[#ef4444] to-[#dc2626]'
  },
  {
    name: 'Naranja',
    value: '#f97316',
    gradient: 'from-[#f97316] to-[#ea580c]'
  },
  {
    name: 'Rosa',
    value: '#ec4899',
    gradient: 'from-[#ec4899] to-[#db2777]'
  },
  {
    name: 'Cyan',
    value: '#06b6d4',
    gradient: 'from-[#06b6d4] to-[#0891b2]'
  },
  {
    name: 'Verde Oscuro',
    value: '#059669',
    gradient: 'from-[#059669] to-[#047857]'
  },
  {
    name: 'Índigo',
    value: '#6366f1',
    gradient: 'from-[#6366f1] to-[#4f46e5]'
  },
  {
    name: 'Gris',
    value: '#6b7280',
    gradient: 'from-[#6b7280] to-[#4b5563]'
  },
  {
    name: 'Ambar',
    value: '#f59e0b',
    gradient: 'from-[#f59e0b] to-[#d97706]'
  },
  {
    name: 'Lima',
    value: '#84cc16',
    gradient: 'from-[#84cc16] to-[#65a30d]'
  }
];

export const getProjectGradient = (color: string): string => {
  const colorOption = PROJECT_COLORS.find(c => c.value === color);
  return colorOption?.gradient || 'from-[#0066cc] to-[#0052a3]';
};
