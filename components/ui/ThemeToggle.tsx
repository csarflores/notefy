'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Theme, applyTheme, getStoredTheme } from '@/lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored !== 'system') setTheme(stored);
    else if (document.documentElement.classList.contains('dark')) setTheme('dark');
  }, []);

  // Reaccionar a cambios del sistema cuando está en "system"
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const handleChange = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  const options: { value: Theme; label: string; icon?: typeof Sun }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Sistema' },
  ];

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleChange(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
              isActive
                ? 'bg-[#e8f0fb] text-[#0055aa] ring-1 ring-[#0066cc]/25 dark:bg-[#2c2c2e] dark:text-[#409cff]'
                : 'text-[#8e8e93] hover:bg-[#f5f5f7] dark:hover:bg-[#2c2c2e] border border-[#e5e5ea] dark:border-[#38383a]'
            }`}
          >
            {Icon && <Icon size={13} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
