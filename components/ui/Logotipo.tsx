// src/components/ui/Logo.tsx
import React from 'react';

export const Logo = ({ className = "h-8 w-8" }: { className?: string }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Isotipo Minimalista */}
      <svg 
        className={className} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Columna 1 (To Do) - Altura inicial */}
        <rect x="20" y="35" width="14" height="40" rx="7" fill="#0066cc" />
        
        {/* Línea Diagonal Conectora de la 'N' - Sutil y fluida */}
        <path 
          d="M27 35L73 75" 
          stroke="#0066cc" 
          strokeWidth="14" 
          strokeLinecap="round" 
        />
        
        {/* Columna 3 (Done) - Elevada, simbolizando progreso */}
        <rect x="66" y="25" width="14" height="40" rx="7" fill="#0066cc" />
      </svg>
      
      {/* Logotipo / Texto */}
      <span className="text-xl font-semibold tracking-tight text-[#1d1d1f]">
        Notefy
      </span>
    </div>
  );
};