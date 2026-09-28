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
      {/* Isotipo: anteojos (símbolo oficial de Harold) */}
      <svg
        className={iconSize}
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke="#0066cc"
          strokeWidth="72"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="320" cy="500" r="205" />
          <circle cx="680" cy="500" r="205" />
          <path d="M525 500 C550 500 570 500 595 500" />
          <path d="M115 500 H70" />
          <path d="M885 500 H930" />
        </g>
      </svg>
      
      {/* Logotipo / Texto */}
      {showText && (
        <span className={`${textSize} font-bold tracking-tight text-[#1d1d1f]`}>
          Harold
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{logoContent}</Link>;
  }

  return logoContent;
};