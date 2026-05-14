import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utilidad para combinar clases de Tailwind sin conflictos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Validar ObjectId de MongoDB
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Formatear fecha en español
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// Generar color aleatorio para tags
export function generateRandomColor(): string {
  const colors = [
    '#0066cc', // Apple Blue
    '#34c759', // Green
    '#ff9500', // Orange
    '#ff3b30', // Red
    '#af52de', // Purple
    '#5ac8fa', // Light Blue
    '#ffcc00', // Yellow
    '#ff2d55', // Pink
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Truncar texto con ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Obtener iniciales de un nombre
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
