'use client';

import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const iconColors = {
    danger: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  const buttonColors = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    info: 'bg-blue-500 hover:bg-blue-600 text-white',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06] overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className={iconColors[variant]} />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="text-[#aaaaaa] hover:text-[#1d1d1f] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-5">
          <p className="text-sm text-[#7a7a7a] leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-2.5">
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={buttonColors[variant]}
            size="sm"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
