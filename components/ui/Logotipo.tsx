// src/components/ui/Logo.tsx
import React from 'react';
import Link from 'next/link';

export const Logo = ({ 
  className = "h-10 w-10",
  showText = true,
  linkTo = "/",
  size = "default"
}: { 
  className?: string;
  showText?: boolean;
  linkTo?: string;
  size?: "default" | "large" | "small";
}) => {
  const textSize = size === "large" ? "text-3xl" : size === "small" ? "text-lg" : "text-2xl";
  const iconSize = size === "large" ? "h-14 w-14" : size === "small" ? "h-7 w-7" : className;
  
  const logoContent = (
    <div className="flex items-center gap-3 select-none">
      {/* Isotipo Minimalista */}
      <svg 
        className={iconSize} 
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
      {showText && (
        <span className={`${textSize} font-bold tracking-tight text-[#1d1d1f]`}>
          Notefy
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{logoContent}</Link>;
  }

  return logoContent;
};