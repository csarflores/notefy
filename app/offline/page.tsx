'use client';

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e0e0e0] shadow-xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mx-auto mb-5">
          <WifiOff size={26} className="text-[#a0a0a8]" />
        </div>
        <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">Sin conexión</h1>
        <p className="text-sm text-[#7a7a7a] mb-6">
          No pudimos conectar con Harold. Revisa tu conexión a internet e inténtalo de nuevo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-[#0066cc] hover:bg-[#0055aa] text-white text-[13px] font-medium rounded-xl transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
