'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { requestPasswordReset } from '@/actions/auth-actions';
import { Logo } from '@/components/ui/Logotipo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (!result.success) {
        setError(result.error || 'Error al procesar la solicitud');
      } else {
        setSent(true);
      }
    } catch {
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Recuperar Contraseña
          </h2>

          {sent ? (
            <div className="space-y-5">
              <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <span>
                  Si el email está registrado, recibirás un enlace para restablecer
                  tu contraseña. Revisa tu bandeja de entrada y spam.
                </span>
              </div>
              <p className="text-sm text-[#7a7a7a] text-center">
                El enlace es válido por 1 hora.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-[#7a7a7a]">
                Ingresa tu email y te enviaremos un enlace para restablecer tu
                contraseña.
              </p>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#1d1d1f] mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7a7a]"
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
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
                Enviar enlace
              </Button>
            </form>
          )}

          {/* Link a login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#7a7a7a]">
              ¿Recordaste tu contraseña?{' '}
              <Link
                href="/auth/login"
                className="text-[#0066cc] font-medium hover:underline"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
