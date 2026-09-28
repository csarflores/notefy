'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logotipo';

function GoogleButton() {
  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-gray-200 bg-white text-[14px] font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continuar con Google
    </button>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    getProviders().then((providers) => {
      setGoogleEnabled(!!providers?.google);
    });
  }, []);

  // Errores de OAuth (callback de Google) llegan via ?error=
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'OAuthAccountNotLinked') {
      setError('Ya existe una cuenta con este email');
    } else if (urlError && urlError !== 'CredentialsSignin') {
      setError('No se pudo iniciar sesión con el proveedor');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'EMAIL_NOT_VERIFIED') {
          setError('Debes verificar tu email antes de iniciar sesión');
        } else if (result.error === 'OAUTH_ACCOUNT') {
          setError('Esta cuenta usa Google. Inicia sesión con Google');
        } else {
          setError('Email o contraseña incorrectos');
        }
      } else if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Error al iniciar sesión');
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

        {/* Card de login */}
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-[#1d1d1f] mb-6 text-center">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1d1d1f] mb-2">
                Contraseña
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
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/20 outline-none transition-all text-[#1d1d1f] placeholder:text-gray-400"
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="mt-2 text-right">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-[#0066cc] font-medium hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
                {error.includes('verificar') && (
                  <Link href="/auth/verify-email" className="block mt-1.5 text-[#0066cc] font-medium hover:underline">
                    Reenviar email de verificación →
                  </Link>
                )}
              </div>
            )}

            {/* Botón de login */}
            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              Iniciar Sesión
            </Button>
          </form>

          {/* Divider + OAuth */}
          {googleEnabled && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[#e5e5ea]" />
                <span className="text-[11px] text-[#8e8e93] uppercase tracking-wider">o</span>
                <div className="flex-1 h-px bg-[#e5e5ea]" />
              </div>
              <GoogleButton />
            </>
          )}

          {/* Link a registro */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#7a7a7a]">
              ¿No tienes cuenta?{' '}
              <Link
                href="/auth/register"
                className="text-[#0066cc] font-medium hover:underline"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-[#7a7a7a] mt-8">
          Al iniciar sesión, aceptas nuestros términos y condiciones
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
