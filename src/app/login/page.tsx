'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || null;
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'no_autorizado' ? 'No tienes permisos para acceder a esa sección.' : null
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || 'Credenciales inválidas');
        return;
      }

      // Redirect based on role or redirect param
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        // Redirect based on user role
        switch (data.data.rol) {
          case 'admin':
            router.push('/admin');
            break;
          case 'vendedor':
            router.push('/pedidos');
            break;
          case 'bar':
            router.push('/bar');
            break;
          case 'repartidor':
            router.push('/entregas');
            break;
          case 'caja':
            router.push('/caja');
            break;
          default:
            router.push('/menu-domicilio');
        }
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0f] relative overflow-hidden">
      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-[10%] left-[10%] text-6xl opacity-10 animate-pulse">🍗</span>
        <span className="absolute top-[30%] right-[10%] text-5xl opacity-10 animate-pulse" style={{animationDelay: '1s'}}>🍔</span>
        <span className="absolute bottom-[20%] left-[15%] text-5xl opacity-10 animate-pulse" style={{animationDelay: '0.5s'}}>🔥</span>
        <span className="absolute bottom-[10%] right-[20%] text-6xl opacity-10 animate-pulse" style={{animationDelay: '1.5s'}}>🌶️</span>
      </div>

      <div className="w-full max-w-md glass rounded-3xl shadow-2xl p-8 sm:p-10 animate-slide-up relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="A-la Burguer" className="h-20 w-20 mx-auto mb-4 rounded-full" />
          <h1 className="text-2xl font-bold">
            <span className="text-brand-400">A-la</span>
            <span className="text-white ml-2">Burguer</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2">Panel de Gestión</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-fire-900/30 border border-fire-500/20 text-fire-300 text-sm flex items-start gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@alaburguer.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl text-black font-semibold text-sm gradient-brand shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98]"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Quick access info */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-xs text-gray-500 text-center mb-3">Acceso rápido por módulo:</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-lg block" aria-hidden="true">👨‍💼</span>
              <span className="text-[10px] text-gray-500">Admin</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-lg block" aria-hidden="true">👨‍🍳</span>
              <span className="text-[10px] text-gray-500">Cocina</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-lg block" aria-hidden="true">💰</span>
              <span className="text-[10px] text-gray-500">Caja</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-lg block" aria-hidden="true">🛵</span>
              <span className="text-[10px] text-gray-500">Repartidor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
