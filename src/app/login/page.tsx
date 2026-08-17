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

      if (redirectTo) {
        router.push(redirectTo);
      } else {
        switch (data.data.rol) {
          case 'admin': router.push('/admin'); break;
          case 'vendedor': router.push('/pedidos'); break;
          case 'bar': router.push('/bar'); break;
          case 'repartidor': router.push('/entregas'); break;
          case 'caja': router.push('/caja'); break;
          default: router.push('/menu-domicilio');
        }
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#050508] relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-brand-500/8 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-fire-500/6 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Glow border effect */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-brand-400/20 via-transparent to-fire-500/10 blur-sm" />

        <div className="relative bg-[#0c0c14]/90 backdrop-blur-2xl rounded-3xl border border-white/[0.06] shadow-[0_0_60px_rgba(0,0,0,0.5)] p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-2xl animate-pulse" />
              <img src="/logo.png" alt="A-la Burguer" className="relative h-20 w-20 mx-auto rounded-full border-2 border-brand-400/30 shadow-xl shadow-brand-500/20" />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-brand-400 to-fire-400 bg-clip-text text-transparent">A-la</span>
              <span className="text-white ml-2">Burguer</span>
            </h1>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest">Sistema de Gestión</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-shake">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@alaburguer.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all duration-300"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all duration-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[52px] px-6 py-4 rounded-2xl text-black font-black text-sm tracking-wide bg-gradient-to-r from-brand-400 via-brand-500 to-fire-500 shadow-[0_0_30px_rgba(245,166,35,0.3)] hover:shadow-[0_0_40px_rgba(245,166,35,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 active:scale-[0.97]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          {/* Module quick access */}
          <div className="mt-8 pt-6 border-t border-white/[0.04]">
            <p className="text-[10px] text-gray-600 text-center mb-3 uppercase tracking-widest">Módulos del sistema</p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { icon: '👨‍💼', label: 'Admin', color: 'hover:border-brand-400/30' },
                { icon: '👨‍🍳', label: 'Cocina', color: 'hover:border-amber-400/30' },
                { icon: '🍸', label: 'Bar', color: 'hover:border-purple-400/30' },
                { icon: '💰', label: 'Caja', color: 'hover:border-green-400/30' },
                { icon: '🛵', label: 'Repartir', color: 'hover:border-blue-400/30' },
              ].map(m => (
                <div key={m.label} className={`p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] ${m.color} transition-all duration-200 text-center cursor-default group`}>
                  <span className="text-lg block group-hover:scale-110 transition-transform duration-200">{m.icon}</span>
                  <span className="text-[8px] text-gray-600 group-hover:text-gray-400 transition-colors">{m.label}</span>
                </div>
              ))}
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
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
