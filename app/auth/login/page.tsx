'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logotipo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        setError('Email o contraseña incorrectos');
      } else if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
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
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Botón de login */}
            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              Iniciar Sesión
            </Button>
          </form>

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
