'use client';

import { Fragment, ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { overlayStack } from './overlay-stack';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export default function Drawer({ isOpen, onClose, children, className }: DrawerProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    const id = Symbol('drawer');
    overlayStack.push(id);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayStack[overlayStack.length - 1] === id) {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      const idx = overlayStack.indexOf(id);
      if (idx !== -1) overlayStack.splice(idx, 1);
      document.removeEventListener('keydown', onKeyDown);
      if (overlayStack.length === 0) document.body.style.overflow = '';
    };
  }, [isOpen]);

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
            onClick={(e) => {
              // El segundo clic de un doble-clic cae sobre el backdrop recién abierto
              if (e.detail > 1) return;
              onClose();
            }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={cn(
              'fixed top-0 right-0 h-full w-full sm:w-[560px] z-50',
              'bg-white flex flex-col overflow-hidden',
              'shadow-[-16px_0_48px_-8px_rgba(0,0,0,0.14)] sm:border-l sm:border-black/[0.06]',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}
