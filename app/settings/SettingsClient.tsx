'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { useUpload } from '@/hooks/useUpload';
import { setUserAvatar, removeUserAvatar } from '@/actions/upload-actions';
import { updateUserProfile } from '@/actions/user-actions';
import { useNotification } from '@/components/ui/NotificationContext';
import { Camera, Trash2 } from 'lucide-react';
import { IUser } from '@/types';

export default function SettingsClient({ user }: { user: IUser }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { showNotification } = useNotification();
  const { upload, progress, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.image || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('El archivo debe ser una imagen', 'error');
      return;
    }

    const result = await upload(file, { scope: 'avatar' });
    if ('error' in result) {
      showNotification(result.error, 'error');
      return;
    }

    const saved = await setUserAvatar(result.key);
    if (saved.success && saved.data) {
      setAvatarUrl(saved.data);
      await updateSession({ image: saved.data });
      router.refresh();
      showNotification('Foto de perfil actualizada', 'success');
    } else {
      showNotification(saved.error || 'Error al guardar la foto', 'error');
    }
  };

  const handleRemoveAvatar = async () => {
    const result = await removeUserAvatar();
    if (result.success) {
      setAvatarUrl('');
      await updateSession({ image: null });
      router.refresh();
      showNotification('Foto de perfil eliminada', 'success');
    } else {
      showNotification(result.error || 'Error al eliminar la foto', 'error');
    }
  };

  const handleSaveName = async () => {
    if (name.trim() === user.name) return;
    setIsSaving(true);
    try {
      const result = await updateUserProfile({ name });
      if (result.success) {
        await updateSession({ name: name.trim() });
        router.refresh();
        showNotification('Nombre actualizado', 'success');
      } else {
        showNotification(result.error || 'Error al actualizar el nombre', 'error');
      }
    } catch {
      showNotification('Error inesperado al guardar', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Foto de perfil */}
      <section className="bg-white rounded-xl border border-[#e0e0e0] p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">Foto de perfil</h2>
        <p className="text-[12px] text-[#7a7a7a] mb-4">
          Se muestra en tareas asignadas y comentarios.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatarUrl || undefined} name={name} size="lg" />
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-white">{progress}%</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
              variant="secondary"
            >
              <Camera size={14} className="mr-1.5" />
              {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {avatarUrl && (
              <Button
                onClick={handleRemoveAvatar}
                disabled={isUploading}
                size="sm"
                variant="ghost"
              >
                <Trash2 size={14} className="mr-1.5" />
                Quitar
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>
      </section>

      {/* Datos personales */}
      <section className="bg-white rounded-xl border border-[#e0e0e0] p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Datos personales</h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
            >
              Nombre
            </label>
            <div className="flex gap-2">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="flex-1 px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
              />
              <Button
                onClick={handleSaveName}
                disabled={isSaving || !name.trim() || name.trim() === user.name}
                size="sm"
              >
                {isSaving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5">
              Email
            </label>
            <p className="px-3 py-2 rounded-lg bg-[#f5f5f7] text-[13px] text-[#7a7a7a]">
              {user.email}
            </p>
            <p className="text-[11px] text-[#a0a0a8] mt-1">
              El email se usa para invitaciones a proyectos y tableros.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
