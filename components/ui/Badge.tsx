import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
  variant?: 'default' | 'tag';
}

export default function Badge({ 
  color = '#0066cc', 
  variant = 'default',
  className, 
  children, 
  ...props 
}: BadgeProps) {
  // Convertir hex a rgba con opacidad 10%
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  if (variant === 'tag') {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all',
          className
        )}
        style={{
          backgroundColor: hexToRgba(color, 0.1),
          color: color,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#f5f5f7] text-[#1d1d1f]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
