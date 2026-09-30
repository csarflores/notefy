// src/components/ui/Logo.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { assetPath } from '@/lib/assets';

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
      {/* Isotipo oficial de Harold (asset pack activo en /public) */}
      <Image
        src={assetPath('harold-app-icon-512.png')}
        alt="Harold"
        width={512}
        height={512}
        className={iconSize}
        priority
      />
      
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