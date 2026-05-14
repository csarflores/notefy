'use client';

import { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        {/* Icono de advertencia */}
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            variant === 'danger' ? 'bg-red-50' : 'bg-orange-50'
          }`}>
            <AlertTriangle 
              size={32} 
              className={variant === 'danger' ? 'text-red-500' : 'text-orange-500'} 
            />
          </div>
        </div>

        {/* Mensaje */}
        <div className="text-center">
          {typeof message === 'string' ? (
            <p className="text-[#7a7a7a]">{message}</p>
          ) : (
            message
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            isLoading={isLoading}
            className={`flex-1 ${
              variant === 'danger' 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
