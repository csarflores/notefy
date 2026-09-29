'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getBoardUpdatedAt } from '@/actions/board-actions';

const POLL_INTERVAL = 12_000; // 12s

// Polling ligero: refresca la página del tablero si otro usuario hizo cambios.
// Solo consulta el timestamp máximo — sin traer datos salvo que haya novedad.
export default function BoardSyncer({
  boardId,
  initialUpdatedAt,
}: {
  boardId: string;
  initialUpdatedAt?: number;
}) {
  const router = useRouter();
  const lastRef = useRef<number>(initialUpdatedAt ?? 0);

  useEffect(() => {
    // Inicializar con el timestamp actual del servidor en el primer tick
    const check = async () => {
      if (document.hidden) return; // pausar cuando la pestaña no está visible
      try {
        const res = await getBoardUpdatedAt(boardId);
        if (!res.success || !res.data) return;
        if (lastRef.current === 0) {
          lastRef.current = res.data.updatedAt;
          return;
        }
        if (res.data.updatedAt > lastRef.current) {
          lastRef.current = res.data.updatedAt;
          router.refresh();
        }
      } catch {
        // mejor esfuerzo — reintentar en el próximo tick
      }
    };

    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [boardId, router]);

  return null;
}
