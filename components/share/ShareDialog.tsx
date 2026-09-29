'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useNotification } from '@/components/ui/NotificationContext';
import {
  createInvitation,
  getPendingInvitations,
  cancelInvitation,
  resendInvitation,
  setMemberRole,
  getResourceMembers,
  removeResourceMember,
  leaveResource,
  ResourceMembersResult,
} from '@/actions/invitation-actions';
import { createPublicNoteLink, revokePublicNoteLink } from '@/actions/note-actions';
import { createPublicBoardLink, revokePublicBoardLink } from '@/actions/board-actions';
import { MEMBER_ROLE_LABELS, rolesForResource, RESOURCE_TYPE_LABELS } from '@/lib/roles';
import { MemberRole, ResourceType } from '@/types';
import {
  Mail,
  X,
  UserPlus,
  Clock,
  Link2,
  Link2Off,
  Send,
  LogOut,
  Globe,
  Loader2,
} from 'lucide-react';

interface PendingInvite {
  _id: string;
  email: string;
  role: MemberRole;
  token: string;
  expiresAt: string;
}

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  ownerId: string;
  /** Token del link público actual (si existe) — notas y tableros */
  notePublicToken?: string | null;
  boardPublicToken?: string | null;
}

export default function ShareDialog({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  ownerId,
  notePublicToken,
  boardPublicToken,
}: ShareDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { showNotification } = useNotification();

  const currentUserId = session?.user?.id ?? '';
  const currentUserEmail = session?.user?.email ?? '';
  const isOwner = currentUserId === ownerId;
  const allowedRoles = rolesForResource(resourceType);
  const resourceLabel = RESOURCE_TYPE_LABELS[resourceType];

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [error, setError] = useState('');
  const [membersData, setMembersData] = useState<ResourceMembersResult | null>(null);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(
    notePublicToken ?? boardPublicToken ?? null
  );
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoadingMembers(true);
    const membersResult = await getResourceMembers(resourceType, resourceId);
    if (membersResult.success && membersResult.data) {
      setMembersData(membersResult.data);
    }
    if (currentUserId === ownerId) {
      const pendingResult = await getPendingInvitations(resourceType, resourceId);
      if (pendingResult.success && pendingResult.data) {
        setPending(pendingResult.data as unknown as PendingInvite[]);
      }
    }
    setIsLoadingMembers(false);
  }, [resourceType, resourceId, currentUserId, ownerId]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      void loadData();
    }
  }, [isOpen, loadData]);

  // ─── Invitar ───────────────────────────────────────────────────────────────
  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const normalized = email.toLowerCase().trim();
    if (!normalized) {
      setError('El email es requerido');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError('Por favor ingresa un email válido');
      return;
    }
    if (normalized === currentUserEmail.toLowerCase()) {
      setError('No puedes invitarte a ti mismo');
      return;
    }
    if (membersData?.members.some((m) => m.email === normalized)) {
      setError('El usuario ya es miembro');
      return;
    }

    setBusy('invite');
    const result = await createInvitation(resourceType, resourceId, normalized, role);
    setBusy(null);
    if (result.success) {
      setEmail('');
      showNotification(`Invitación enviada a ${normalized}`, 'success');
      void loadData();
      router.refresh();
    } else {
      setError(result.error || 'Error al enviar la invitación');
    }
  };

  // ─── Miembros ──────────────────────────────────────────────────────────────
  const handleRoleChange = async (memberEmail: string, newRole: MemberRole) => {
    setBusy(`role-${memberEmail}`);
    const result = await setMemberRole(resourceType, resourceId, memberEmail, newRole);
    setBusy(null);
    if (result.success) {
      setMembersData((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) =>
                m.email === memberEmail ? { ...m, role: newRole } : m
              ),
            }
          : prev
      );
      router.refresh();
    } else {
      showNotification(result.error || 'Error al cambiar el rol', 'error');
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemove) return;
    const target = confirmRemove;
    setBusy('remove');
    const result = await removeResourceMember(resourceType, resourceId, target);
    setBusy(null);
    setConfirmRemove(null);
    if (result.success) {
      setMembersData((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.email !== target) } : prev
      );
      showNotification('Miembro eliminado', 'success');
      router.refresh();
    } else {
      showNotification(result.error || 'Error al eliminar el miembro', 'error');
    }
  };

  // ─── Invitaciones pendientes ───────────────────────────────────────────────
  const handleCancelInvite = async (invitationId: string) => {
    setBusy(`cancel-${invitationId}`);
    const result = await cancelInvitation(invitationId);
    setBusy(null);
    if (result.success) {
      setPending((prev) => prev.filter((inv) => inv._id !== invitationId));
    } else {
      showNotification(result.error || 'Error al cancelar la invitación', 'error');
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    setBusy(`resend-${invitationId}`);
    const result = await resendInvitation(invitationId);
    setBusy(null);
    if (result.success) {
      showNotification('Invitación reenviada', 'success');
    } else {
      showNotification(result.error || 'Error al reenviar la invitación', 'error');
    }
  };

  const handleCopyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    showNotification('Link de invitación copiado', 'success');
  };

  // ─── Link público (notas y tableros) ───────────────────────────────────────
  const publicPath = resourceType === 'board' ? 'share/board' : 'share/note';

  const handleCreatePublicLink = async () => {
    setBusy('public-link');
    const result =
      resourceType === 'board'
        ? await createPublicBoardLink(resourceId, currentUserId)
        : await createPublicNoteLink(resourceId, currentUserId);
    setBusy(null);
    if (result.success && result.data) {
      setPublicToken(result.data.token);
      navigator.clipboard.writeText(`${window.location.origin}/${publicPath}/${result.data.token}`);
      showNotification('Link público creado y copiado', 'success');
      router.refresh();
    } else {
      showNotification(result.error || 'Error al crear el link', 'error');
    }
  };

  const handleRevokePublicLink = async () => {
    setBusy('public-link');
    const result =
      resourceType === 'board'
        ? await revokePublicBoardLink(resourceId, currentUserId)
        : await revokePublicNoteLink(resourceId, currentUserId);
    setBusy(null);
    if (result.success) {
      setPublicToken(null);
      showNotification('Link público revocado', 'success');
      router.refresh();
    } else {
      showNotification(result.error || 'Error al revocar el link', 'error');
    }
  };

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/${publicPath}/${publicToken}`);
    showNotification('Link público copiado', 'success');
  };

  // ─── Abandonar recurso ─────────────────────────────────────────────────────
  const handleLeave = async () => {
    setBusy('leave');
    const result = await leaveResource(resourceType, resourceId);
    setBusy(null);
    setConfirmLeave(false);
    if (result.success) {
      onClose();
      router.push('/dashboard');
      router.refresh();
    } else {
      showNotification(result.error || 'Error al abandonar el recurso', 'error');
    }
  };

  const members = (membersData?.members ?? []).filter(
    (m) => m.email !== membersData?.owner?.email
  );

  const daysLeft = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    return days <= 1 ? 'expira hoy' : `expira en ${days} días`;
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Compartir ${resourceLabel}`}>
        <div className="space-y-5">
          <p className="text-[13px] text-[#7a7a7a] -mt-1 truncate">
            &quot;{resourceName}&quot;
          </p>

          {/* Formulario de invitación (solo propietario) */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a0a0a8]"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email del colaborador"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#e5e5ea] focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/15 outline-none transition-all text-[13px] text-[#1d1d1f] placeholder:text-[#c7c7cc]"
                    disabled={busy === 'invite'}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as MemberRole)}
                    className="px-3 py-2.5 rounded-xl border border-[#e5e5ea] focus:border-[#0066cc] outline-none text-[13px] text-[#1d1d1f] bg-white"
                    disabled={busy === 'invite'}
                    aria-label="Rol del invitado"
                  >
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>
                        {MEMBER_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" isLoading={busy === 'invite'} className="whitespace-nowrap">
                    <UserPlus size={15} className="mr-1.5" />
                    Invitar
                  </Button>
                </div>
              </div>
              {error && (
                <div className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
              )}
            </form>
          )}

          {/* Personas con acceso */}
          <div>
            <h4 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2.5">
              Personas con acceso
            </h4>
            {isLoadingMembers && !membersData ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="animate-spin text-[#a0a0a8]" />
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto -mx-1 px-1">
                {/* Propietario */}
                {membersData?.owner && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={membersData.owner.image}
                        name={membersData.owner.name || membersData.owner.email}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1d1d1f] truncate">
                          {membersData.owner.name || membersData.owner.email}
                          {membersData.owner.email === currentUserEmail && (
                            <span className="text-[#a0a0a8] font-normal"> (tú)</span>
                          )}
                        </p>
                        <p className="text-[11px] text-[#a0a0a8] truncate">
                          {membersData.owner.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-[#7a7a7a] bg-[#f5f5f7] px-2 py-1 rounded-md shrink-0">
                      Propietario
                    </span>
                  </div>
                )}

                {/* Miembros */}
                {members.map((member) => {
                  const isSelf = member.email === currentUserEmail.toLowerCase();
                  return (
                    <div
                      key={member.email}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-[#fafafa] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={member.image}
                          name={member.name || member.email}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#1d1d1f] truncate">
                            {member.name || member.email}
                            {isSelf && <span className="text-[#a0a0a8] font-normal"> (tú)</span>}
                          </p>
                          {member.name && (
                            <p className="text-[11px] text-[#a0a0a8] truncate">{member.email}</p>
                          )}
                          {!member.registered && (
                            <p className="text-[11px] text-[#b36400]">Sin cuenta registrada</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner ? (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(member.email, e.target.value as MemberRole)
                              }
                              disabled={busy === `role-${member.email}`}
                              className="px-2 py-1 rounded-lg border border-[#e5e5ea] text-[12px] text-[#3a3a3c] bg-white outline-none focus:border-[#0066cc] disabled:opacity-50"
                              aria-label={`Rol de ${member.email}`}
                            >
                              {allowedRoles.map((r) => (
                                <option key={r} value={r}>
                                  {MEMBER_ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setConfirmRemove(member.email)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
                              title="Quitar acceso"
                            >
                              <X
                                size={15}
                                className="text-[#a0a0a8] group-hover:text-red-500"
                              />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-[#7a7a7a] bg-[#f5f5f7] px-2 py-1 rounded-md">
                            {MEMBER_ROLE_LABELS[member.role]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {membersData && members.length === 0 && (
                  <p className="text-[12px] text-[#c7c7cc] py-3 text-center">
                    Todavía no hay colaboradores
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Invitaciones pendientes (solo propietario) */}
          {isOwner && pending.length > 0 && (
            <div className="pt-4 border-t border-[#f0f0f2]">
              <h4 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <Clock size={12} className="text-[#ff9500]" />
                Invitaciones pendientes ({pending.length})
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto -mx-1 px-1">
                {pending.map((inv) => (
                  <div
                    key={inv._id}
                    className="flex items-center justify-between gap-2 p-2.5 bg-[#fff8ec] rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={inv.email} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[13px] text-[#1d1d1f] truncate">{inv.email}</p>
                        <p className="text-[11px] text-[#b36400]">
                          {MEMBER_ROLE_LABELS[inv.role]} · {daysLeft(inv.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleCopyInviteLink(inv.token)}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                        title="Copiar link de invitación"
                      >
                        <Link2 size={14} className="text-[#7a7a7a]" />
                      </button>
                      <button
                        onClick={() => handleResendInvite(inv._id)}
                        disabled={busy === `resend-${inv._id}`}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors disabled:opacity-40"
                        title="Reenviar invitación"
                      >
                        {busy === `resend-${inv._id}` ? (
                          <Loader2 size={14} className="text-[#7a7a7a] animate-spin" />
                        ) : (
                          <Send size={14} className="text-[#7a7a7a]" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCancelInvite(inv._id)}
                        disabled={busy === `cancel-${inv._id}`}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 group"
                        title="Cancelar invitación"
                      >
                        <X size={14} className="text-[#7a7a7a] group-hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link público de solo lectura (notas y tableros, solo propietario) */}
          {(resourceType === 'note' || resourceType === 'board') && isOwner && (
            <div className="pt-4 border-t border-[#f0f0f2]">
              <h4 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                <Globe size={12} />
                Link público
              </h4>
              {publicToken ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#f5f5f7] text-[12px] text-[#7a7a7a] truncate">
                    /{publicPath}/{publicToken.slice(0, 12)}…
                  </div>
                  <button
                    onClick={handleCopyPublicLink}
                    className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors shrink-0"
                    title="Copiar link público"
                  >
                    <Link2 size={15} className="text-[#0066cc]" />
                  </button>
                  <button
                    onClick={handleRevokePublicLink}
                    disabled={busy === 'public-link'}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-40 group"
                    title="Revocar link público"
                  >
                    <Link2Off size={15} className="text-[#7a7a7a] group-hover:text-red-500" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreatePublicLink}
                  disabled={busy === 'public-link'}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#e5e5ea] text-[12px] text-[#8e8e93] hover:border-[#0066cc] hover:text-[#0066cc] transition-all disabled:opacity-50 w-full"
                >
                  {busy === 'public-link' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Link2 size={14} />
                  )}
                  Crear link público (cualquiera puede ver, solo lectura)
                </button>
              )}
            </div>
          )}

          {/* Abandonar recurso (miembros que no son owner) */}
          {!isOwner && membersData && (
            <div className="pt-4 border-t border-[#f0f0f2]">
              <button
                onClick={() => setConfirmLeave(true)}
                className="flex items-center gap-1.5 text-[12px] text-[#7a7a7a] hover:text-red-500 transition-colors"
              >
                <LogOut size={13} />
                Salir de {resourceLabel === 'nota' ? 'la nota' : resourceLabel === 'tablero' ? 'el tablero' : 'el proyecto'}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmación: quitar miembro */}
      <ConfirmDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveMember}
        title="Quitar acceso"
        message={
          <p className="text-[#7a7a7a]">
            ¿Quitar a <strong>{confirmRemove}</strong>? Perderá acceso a {resourceLabel === 'nota' ? 'la nota' : resourceLabel === 'tablero' ? 'el tablero' : 'el proyecto'} inmediatamente.
          </p>
        }
        confirmText="Quitar"
        isLoading={busy === 'remove'}
        variant="danger"
      />

      {/* Confirmación: abandonar recurso */}
      <ConfirmDialog
        isOpen={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeave}
        title={`Salir de ${resourceLabel === 'nota' ? 'la nota' : resourceLabel === 'tablero' ? 'el tablero' : 'el proyecto'}`}
        message="Perderás acceso a este recurso. El propietario tendrá que invitarte de nuevo para recuperarlo."
        confirmText="Salir"
        isLoading={busy === 'leave'}
        variant="danger"
      />
    </>
  );
}
