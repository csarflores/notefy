'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useUpload } from '@/hooks/useUpload';
import { setUserAvatar, removeUserAvatar } from '@/actions/upload-actions';
import { updateUserProfile, changePassword, deleteAccount, updateNotificationPrefs } from '@/actions/user-actions';
import { exportAccountJSON, importAccountBackup } from '@/actions/export-actions';
import { useNotification } from '@/components/ui/NotificationContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Camera, Trash2, KeyRound, AlertTriangle, Bell, Download, Upload } from 'lucide-react';
import { IUser, INotificationPrefs } from '@/types';

export default function SettingsClient({ user }: { user: IUser }) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { showNotification } = useNotification();
  const { upload, progress, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.image || '');
  const [isSaving, setIsSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<INotificationPrefs>({
    assigned: user.notificationPrefs?.assigned ?? true,
    comment: user.notificationPrefs?.comment ?? true,
    reply: user.notificationPrefs?.reply ?? true,
    mention: user.notificationPrefs?.mention ?? true,
    invite: user.notificationPrefs?.invite ?? true,
    member: user.notificationPrefs?.member ?? true,
    reminder: user.notificationPrefs?.reminder ?? true,
    emailEnabled: user.notificationPrefs?.emailEnabled ?? false,
  });

  const handleTogglePref = async (key: keyof INotificationPrefs) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    const result = await updateNotificationPrefs({ [key]: next[key] });
    if (!result.success) {
      setNotifPrefs(notifPrefs);
      showNotification(result.error || 'Error al guardar preferencias', 'error');
    }
  };

  // ─── Backup ────────────────────────────────────────────────────────────────
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportBackup = async () => {
    setIsExporting(true);
    const result = await exportAccountJSON(user._id.toString());
    setIsExporting(false);
    if (result.success && result.data) {
      const blob = new Blob([result.data.json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.data.filename;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Backup descargado', 'success');
    } else {
      showNotification(result.error || 'Error al exportar', 'error');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const result = await importAccountBackup(user._id.toString(), text);
      if (result.success && result.data) {
        const { projects, boards, tasks, notes } = result.data;
        showNotification(
          `Restaurado: ${projects} proyectos, ${boards} tableros, ${tasks} tareas, ${notes} notas`,
          'success'
        );
        router.refresh();
      } else {
        showNotification(result.error || 'Error al restaurar el backup', 'error');
      }
    } catch {
      showNotification('Error al leer el archivo', 'error');
    } finally {
      setIsImporting(false);
    }
  };

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

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showNotification('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showNotification('Contraseña actualizada', 'success');
      } else {
        showNotification(result.error || 'Error al cambiar la contraseña', 'error');
      }
    } catch {
      showNotification('Error inesperado al cambiar la contraseña', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount(deletePassword);
      if (result.success) {
        showNotification('Cuenta eliminada', 'success');
        await signOut({ callbackUrl: '/auth/login' });
      } else {
        setShowDeleteDialog(false);
        setDeletePassword('');
        showNotification(result.error || 'Error al eliminar la cuenta', 'error');
      }
    } catch {
      setShowDeleteDialog(false);
      showNotification('Error inesperado al eliminar la cuenta', 'error');
    } finally {
      setIsDeletingAccount(false);
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

      {/* Apariencia */}
      <section className="bg-white rounded-xl border border-[#e0e0e0] p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">Apariencia</h2>
        <p className="text-[12px] text-[#7a7a7a] mb-4">
          Elige entre modo claro, oscuro o el tema de tu sistema.
        </p>
        <ThemeToggle />
      </section>

      {/* Notificaciones */}
      <section className="bg-white rounded-xl border border-[#e0e0e0] p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-1 flex items-center gap-2">
          <Bell size={15} className="text-[#7a7a7a]" />
          Notificaciones
        </h2>
        <p className="text-[12px] text-[#7a7a7a] mb-4">
          Elige qué avisos quieres recibir dentro de la app.
        </p>
        <div className="space-y-1">
          {(
            [
              ['assigned', 'Te asignan una tarea'],
              ['comment', 'Comentarios en tus tareas o notas'],
              ['reply', 'Respuestas a tus comentarios'],
              ['mention', 'Menciones con @tu nombre'],
              ['invite', 'Invitaciones a colaborar'],
              ['member', 'Cambios de miembros y roles'],
              ['reminder', 'Recordatorios de tareas próximas'],
            ] as [keyof INotificationPrefs, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[#fafafa] cursor-pointer"
            >
              <span className="text-[13px] text-[#3a3a3c]">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={notifPrefs[key]}
                aria-label={label}
                onClick={() => handleTogglePref(key)}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                  notifPrefs[key] ? 'bg-[#0066cc]' : 'bg-[#d1d1d6]'
                }`}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: notifPrefs[key] ? 'translateX(16px)' : 'translateX(0)' }}
                />
              </button>
            </label>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[#f0f0f2]">
          <label className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[#fafafa] cursor-pointer">
            <div>
              <span className="text-[13px] font-medium text-[#1d1d1f]">Notificaciones por email</span>
              <p className="text-[11px] text-[#a0a0a8]">
                Recibe además un correo por cada notificación activa.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifPrefs.emailEnabled}
              aria-label="Notificaciones por email"
              onClick={() => handleTogglePref('emailEnabled')}
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                notifPrefs.emailEnabled ? 'bg-[#0066cc]' : 'bg-[#d1d1d6]'
              }`}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow"
                style={{ transform: notifPrefs.emailEnabled ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </button>
          </label>
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

      {/* Contraseña */}
      <section className="bg-white rounded-xl border border-[#e0e0e0] p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-1 flex items-center gap-2">
          <KeyRound size={15} className="text-[#7a7a7a]" />
          Contraseña
        </h2>
        <p className="text-[12px] text-[#7a7a7a] mb-4">
          Cambiá tu contraseña de acceso. Mínimo 8 caracteres.
        </p>
        <div className="space-y-3 max-w-sm">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
            >
              Contraseña actual
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="newPassword"
              className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
            >
              Nueva contraseña
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword || !newPassword || newPassword.length < 8}
            size="sm"
            isLoading={isChangingPassword}
          >
            Cambiar contraseña
          </Button>
        </div>
      </section>

      {/* Exportar / importar datos */}
      <section className="bg-white rounded-xl border border-[#e0e0e0] p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-1 flex items-center gap-2">
          <Download size={15} className="text-[#7a7a7a]" />
          Tus datos
        </h2>
        <p className="text-[12px] text-[#7a7a7a] mb-4">
          Descarga un backup de tus proyectos, tableros, tareas y notas en JSON, o restáuralo más tarde.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleExportBackup}
            size="sm"
            variant="secondary"
            isLoading={isExporting}
          >
            <Download size={14} className="mr-1.5" />
            Descargar backup (JSON)
          </Button>
          <Button
            onClick={() => backupInputRef.current?.click()}
            size="sm"
            variant="ghost"
            isLoading={isImporting}
          >
            <Upload size={14} className="mr-1.5" />
            Restaurar backup
          </Button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportBackup}
          />
        </div>
        <p className="text-[11px] text-[#a0a0a8] mt-3">
          Al restaurar se crean copias nuevas — no se sobrescribe ni elimina nada existente.
        </p>
      </section>

      {/* Zona de peligro */}
      <section className="bg-white rounded-xl border border-red-200 p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-red-600 mb-1 flex items-center gap-2">
          <AlertTriangle size={15} />
          Zona de peligro
        </h2>
        <p className="text-[12px] text-[#7a7a7a] mb-4">
          Eliminar tu cuenta borra permanentemente tus proyectos, tableros, tareas y notas.
          También te quita como miembro de los recursos compartidos con vos.
        </p>
        <Button
          onClick={() => setShowDeleteDialog(true)}
          size="sm"
          className="bg-red-500 hover:bg-red-600"
        >
          Eliminar cuenta
        </Button>
      </section>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setDeletePassword(''); }}
        onConfirm={handleDeleteAccount}
        title="Eliminar cuenta"
        message={
          <div className="space-y-3 text-left">
            <p className="text-sm text-[#7a7a7a]">
              Esta acción es <strong className="text-red-500">permanente</strong> y no se puede deshacer.
              Se eliminarán todos tus proyectos, tableros, tareas y notas.
            </p>
            <div>
              <label
                htmlFor="deletePassword"
                className="block text-[10px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-1.5"
              >
                Confirmá con tu contraseña
              </label>
              <input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded-lg border border-[#e5e5ea] focus:border-red-400 focus:ring-2 focus:ring-red-400/10 outline-none transition-all text-[13px] text-[#1d1d1f] bg-white"
              />
            </div>
          </div>
        }
        confirmText="Eliminar definitivamente"
        isLoading={isDeletingAccount}
        variant="danger"
      />
    </div>
  );
}
