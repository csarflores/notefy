'use client';

import { useState, useEffect, Suspense, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { verifyEmail, resendVerificationEmail } from '@/actions/auth-actions';
import { Logo } from '@/components/ui/Logotipo';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle'
  );
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendOk, setResendOk] = useState(false);

  useEffect(() => {
    if (!token) return;
    verifyEmail(token).then((result) => {
      if (result.success) {
        setStatus('success');
      } else {
        setError(result.error || 'El enlace es inválido o ya expiró');
        setStatus('error');
      }
    });
  }, [token]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    setResendOk(false);
    setError('');
    try {
      const result = await resendVerificationEmail(email);
      if (result.success) {
        setResendOk(true);
      } else {
        setError(result.error || 'Error al reenviar el email');
      }
    } catch {
      setError('Error inesperado');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="p-8">
      {status === 'verifying' && (
        <div className="text-center py-4">
          <Loader2 size={32} className="animate-spin text-[#0066cc] mx-auto mb-4" />
          <p className="text-[#7a7a7a] text-sm">Verificando tu email…</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-[#e6f9ec] flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-[#34c759]" />
          </div>
          <h2 className="text-xl font-semibold text-[#1d1d1f] mb-2">Email verificado</h2>
          <p className="text-sm text-[#7a7a7a] mb-6">
            Tu cuenta ya está lista. Ahora podés iniciar sesión.
          </p>
          <Link href="/auth/login">
            <Button className="w-full" size="lg">Ir a iniciar sesión</Button>
          </Link>
        </div>
      )}

      {(status === 'idle' || status === 'error') && (
        <>
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#e8f0fb] flex items-center justify-center mx-auto mb-4">
              <Mail size={26} className="text-[#0066cc]" />
            </div>
            <h2 className="text-xl font-semibold text-[#1d1d1f] mb-2">Verifica tu email</h2>
            <p className="text-sm text-[#7a7a7a]">
              Te enviamos un enlace de verificación a tu correo. Si no lo encuentras,
              revisá spam o pedí uno nuevo abajo.
            </p>
          </div>

          {status === 'error' && error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg mb-4">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {resendOk ? (
            <div className="flex items-center gap-2 text-sm text-[#1a7a33] bg-[#e6f9ec] px-4 py-3 rounded-lg">
              <CheckCircle size={16} />
              <span>Si el email está registrado, te enviamos un nuevo enlace.</span>
            </div>
          ) : (
            <form onSubmit={handleResend} className="space-y-4">
              {status === 'idle' && error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400"
                  disabled={isResending}
                  required
                />
              </div>
              <Button type="submit" isLoading={isResending} className="w-full" size="lg">
                Reenviar verificación
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-[#0066cc] font-medium hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo size="large" linkTo="/" />
          </div>
        </div>
        <Suspense fallback={<Card className="p-8"><div className="h-32 animate-pulse" /></Card>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
