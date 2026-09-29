'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

// Fade-in suave con desplazamiento; respeta prefers-reduced-motion
// (framer-motion lo reduce automáticamente con useReducedMotion).
export default function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
