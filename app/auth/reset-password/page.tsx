'use client';

import { Suspense, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { resetPassword } from '@/actions/auth-actions';
import { Logo } from '@/components/ui/Logotipo';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(token, password);

      if (!result.success) {
        setError(result.error || 'Error al restablecer la contraseña');
      } else {
        setDone(true);
      }
    } catch {
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-5 text-center">
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle size={16} />
          <span>El enlace es inválido.</span>
        </div>
        <Link
          href="/auth/forgot-password"
          className="text-[#0066cc] font-medium hover:underline text-sm"
        >
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg">
          <CheckCircle size={16} className="mt-0.5 shrink-0" />
          <span>Tu contraseña fue restablecida correctamente.</span>
        </div>
        <Link href="/auth/login">
          <Button className="w-full" size="lg">
            Ir a iniciar sesión
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#1d1d1f] mb-2">
          Nueva contraseña
        </label>
        <div className="relative">
          <Lock
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a]"
          />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400"
            disabled={isLoading}
            required
            minLength={6}
          />
        </div>
      </div>

      {/* Confirmar Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1d1d1f] mb-2">
          Confirmar contraseña
        </label>
        <div className="relative">
          <CheckCircle
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a]"
          />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400"
            disabled={isLoading}
            required
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
        Restablecer contraseña
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo size="large" linkTo="/" />
          </div>
          <p className="text-[#7a7a7a] text-sm">Gestiona tus proyectos con estilo</p>
        </div>

        {/* Card */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-[#1d1d1f] mb-6 text-center">
            Nueva Contraseña
          </h2>
          <Suspense>
            <ResetPasswordForm />
          </Suspense>

          {/* Link a login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#7a7a7a]">
              <Link
                href="/auth/login"
                className="text-[#0066cc] font-medium hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
