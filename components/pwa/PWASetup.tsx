'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Evento nativo del navegador (no está en los tipos de TS)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'harold-pwa-dismissed';

// Registra el service worker y muestra el prompt de instalación
// cuando el navegador lo permite (beforeinstallprompt).
export default function PWASetup() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('SW registration failed:', err);
    });

    const dismissed = (() => {
      try {
        return localStorage.getItem(DISMISS_KEY) === '1';
      } catch {
        return false;
      }
    })();

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (dismissed) return;
      setInstallEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    setVisible(false);
    setInstallEvt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[250] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-[#e5e5ea] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0066cc] flex items-center justify-center shrink-0">
              <Download size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1d1d1f]">Instalar Harold</p>
              <p className="text-[11px] text-[#7a7a7a]">
                Acceso rápido y soporte offline.
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055aa] text-white text-[12px] font-medium rounded-lg transition-colors shrink-0"
            >
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-[#a0a0a8] hover:text-[#1d1d1f] transition-colors shrink-0"
              aria-label="Descartar instalación"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
