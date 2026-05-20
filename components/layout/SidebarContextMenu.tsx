'use client';

import { useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
  separator?: boolean;
}

interface SidebarContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function SidebarContextMenu({ x, y, items, onClose }: SidebarContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to avoid going off-screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16);

  return (
    <div
      ref={menuRef}
      style={{ top: adjustedY, left: adjustedX }}
      className="fixed z-[200] w-48 bg-white rounded-xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06] py-1 overflow-hidden"
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const isDanger = item.variant === 'danger';
        return (
          <div key={i}>
            {item.separator && i > 0 && (
              <div className="my-1 mx-2 border-t border-[#f0f0f2]" />
            )}
            <button
              onClick={() => { item.onClick(); onClose(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left ${
                isDanger
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span>{item.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
