'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { acceptInvitation, declineInvitation } from '@/actions/invitation-actions';
import Button from '@/components/ui/Button';
import { MEMBER_ROLE_LABELS } from '@/lib/roles';
import { MemberRole } from '@/types';
import { CheckCircle2, XCircle, Mail, LogIn } from 'lucide-react';

const RESOURCE_LABELS: Record<string, string> = {
  project: 'el proyecto',
  board: 'el tablero',
  note: 'la nota',
};

interface InviteData {
  email: string;
  resourceName: string;
  resourceType: 'project' | 'board' | 'note';
  invitedByName: string;
  role: MemberRole;
  status: 'pending' | 'accepted' | 'declined';
  expired: boolean;
}

export default function InviteClient({
  token,
  invitation,
}: {
  token: string;
  invitation: InviteData | null;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  const resourceLabel = invitation ? RESOURCE_LABELS[invitation.resourceType] : '';

  const handleAccept = async () => {
    setIsLoading(true);
    setError('');
    const result = await acceptInvitation(token);
    setIsLoading(false);
    if (result.success && result.data?.link) {
      setDone('accepted');
      setTimeout(() => router.push(result.data!.link), 1200);
    } else {
      setError(result.error || 'Error al aceptar la invitación');
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    setError('');
    const result = await declineInvitation(token);
    setIsLoading(false);
    if (result.success) {
      setDone('declined');
    } else {
      setError(result.error || 'Error al rechazar la invitación');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e0e0e0] shadow-xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#e8f0fb] flex items-center justify-center mx-auto mb-5">
          <Mail size={26} className="text-[#0066cc]" />
        </div>

        {!invitation ? (
          <>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">Invitación no válida</h1>
            <p className="text-sm text-[#7a7a7a] mb-6">
              Este enlace de invitación no existe o ya no está disponible.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Ir al inicio
            </Button>
          </>
        ) : done === 'accepted' ? (
          <>
            <CheckCircle2 size={40} className="text-[#34c759] mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">¡Invitación aceptada!</h1>
            <p className="text-sm text-[#7a7a7a]">Redirigiendo a {resourceLabel}...</p>
          </>
        ) : done === 'declined' ? (
          <>
            <XCircle size={40} className="text-[#a0a0a8] mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">Invitación rechazada</h1>
            <p className="text-sm text-[#7a7a7a] mb-6">No se agregó nada a tu cuenta.</p>
            <Button variant="secondary" onClick={() => router.push('/dashboard')} className="w-full">
              Ir al inicio
            </Button>
          </>
        ) : invitation.status !== 'pending' ? (
          <>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">Invitación ya respondida</h1>
            <p className="text-sm text-[#7a7a7a] mb-6">
              Esta invitación ya fue {invitation.status === 'accepted' ? 'aceptada' : 'rechazada'}.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Ir al inicio
            </Button>
          </>
        ) : invitation.expired ? (
          <>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">Invitación expirada</h1>
            <p className="text-sm text-[#7a7a7a] mb-6">
              Pide a {invitation.invitedByName} que te envíe una nueva invitación.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Ir al inicio
            </Button>
          </>
        ) : sessionStatus === 'loading' ? (
          <p className="text-sm text-[#7a7a7a]">Cargando...</p>
        ) : !session?.user ? (
          <>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">
              {invitation.invitedByName} te invitó
            </h1>
            <p className="text-sm text-[#7a7a7a] mb-1">
              a colaborar en {resourceLabel} <strong className="text-[#1d1d1f]">“{invitation.resourceName}”</strong>
            </p>
            <p className="text-xs text-[#a0a0a8] mb-6">
              Rol: {MEMBER_ROLE_LABELS[invitation.role]} · Enviada a {invitation.email}
            </p>
            <Button
              onClick={() => signIn(undefined, { callbackUrl: `/invite/${token}` })}
              className="w-full"
            >
              <LogIn size={16} className="mr-2" />
              Iniciar sesión para responder
            </Button>
          </>
        ) : session.user.email?.toLowerCase() !== invitation.email ? (
          <>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">Email incorrecto</h1>
            <p className="text-sm text-[#7a7a7a] mb-6">
              Esta invitación fue enviada a <strong>{invitation.email}</strong>. Estás conectado
              como {session.user.email}.
            </p>
            <Button
              variant="secondary"
              onClick={() => signIn(undefined, { callbackUrl: `/invite/${token}` })}
              className="w-full"
            >
              Cambiar de cuenta
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-[#1d1d1f] mb-2">
              {invitation.invitedByName} te invitó
            </h1>
            <p className="text-sm text-[#7a7a7a] mb-1">
              a colaborar en {resourceLabel} <strong className="text-[#1d1d1f]">“{invitation.resourceName}”</strong>
            </p>
            <p className="text-xs text-[#a0a0a8] mb-6">
              Rol: {MEMBER_ROLE_LABELS[invitation.role]}
            </p>
            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg mb-4">{error}</div>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleDecline} disabled={isLoading} className="flex-1">
                Rechazar
              </Button>
              <Button onClick={handleAccept} isLoading={isLoading} className="flex-1">
                Aceptar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
