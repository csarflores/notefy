'use client';

import { Fragment, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  headerContent?: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, className, headerContent }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn(
                'bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden',
                'shadow-[0_16px_48px_-8px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06]',
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {headerContent ? (
                <div className="border-b border-[#f0f0f0] shrink-0">
                  {headerContent}
                </div>
              ) : title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] shrink-0">
                  <h2 className="text-[15px] font-semibold text-[#1d1d1f] tracking-[-0.2px]">{title}</h2>
                  <button
                    onClick={onClose}
                    className="text-[#aaaaaa] hover:text-[#1d1d1f] transition-colors"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}

              {/* Content - Scrollable */}
              <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}
