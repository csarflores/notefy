'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { toggleFavorite, FavoriteKind } from '@/actions/favorite-actions';

interface FavoriteButtonProps {
  kind: FavoriteKind;
  resourceId: string;
  initialFavorite?: boolean;
  className?: string;
}

export default function FavoriteButton({
  kind,
  resourceId,
  initialFavorite = false,
  className = '',
}: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    const next = !favorite;
    setFavorite(next); // optimista
    setPending(true);
    const res = await toggleFavorite(kind, resourceId);
    if (!res.success) setFavorite(!next); // revertir
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
      title={favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
      className={`p-1 rounded-md transition-all ${
        favorite
          ? 'text-[#ff9500] opacity-100'
          : 'text-[#c7c7cc] opacity-0 group-hover:opacity-100 hover:text-[#ff9500]'
      } ${className}`}
    >
      <Star size={13} fill={favorite ? 'currentColor' : 'none'} />
    </button>
  );
}
