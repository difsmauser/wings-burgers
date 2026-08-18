'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect') || null;
  const errorParam = searchParams.get('error');

  // Sanitize redirect URL: only allow internal paths (starts with / and no protocol-relative //)
  const redirectTo = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('://') 
    ? rawRedirect 
    : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
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
      if (!response.ok) { setError(data.error?.message || 'Credenciales inválidas'); return; }

      // Use full page navigation (not client-side) to ensure cookies are sent with the next request
      const destino = redirectTo || (() => {
        switch (data.data.rol) {
          case 'admin': return '/admin';
          case 'vendedor': return '/pedidos';
          case 'bar': return '/bar';
          case 'repartidor': return '/entregas';
          case 'caja': return '/caja';
          default: return '/menu-domicilio';
        }
      })();
      window.location.href = destino;
      return; // Don't reach finally's setLoading(false) during navigation
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#030306] relative overflow-hidden">
      {/* Aurora animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] top-[-200px] left-[-100px] rounded-full bg-gradient-to-br from-brand-500/15 to-fire-500/10 blur-[100px] animate-aurora" />
        <div className="absolute w-[500px] h-[500px] bottom-[-150px] right-[-100px] rounded-full bg-gradient-to-tl from-purple-600/12 to-brand-400/8 blur-[120px] animate-aurora" style={{ animationDelay: '-5s' }} />
        <div className="absolute w-[400px] h-[400px] top-[30%] left-[50%] rounded-full bg-gradient-to-r from-fire-600/8 to-purple-500/6 blur-[80px] animate-aurora" style={{ animationDelay: '-10s' }} />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-brand-400/30 animate-float" style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${4 + i}s`,
          }} />
        ))}
      </div>

      {/* Login card */}
      <div className="w-full max-w-[420px] relative z-10 animate-float" style={{ animationDuration: '8s' }}>
        {/* Outer glow */}
        <div className="absolute -inset-[2px] rounded-[28px] bg-gradient-to-b from-brand-400/25 via-white/5 to-purple-500/15 opacity-70" />
        <div className="absolute -inset-[1px] rounded-[27px] bg-[#030306]" />

        <div className="relative bg-[#0a0a12]/80 backdrop-blur-2xl rounded-[26px] border border-white/[0.08] p-8 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)]">
          {/* Logo with animated ring */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-brand-400/30 to-fire-500/20 animate-spin" style={{ animationDuration: '8s' }} />
              <div className="absolute -inset-3 rounded-full bg-[#030306]" />
              <div className="relative animate-glow-pulse rounded-full">
                <img src="/logo.png" alt="A-la Burguer" className="relative h-20 w-20 rounded-full border-2 border-brand-400/40" />
              </div>
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-fire-400 bg-clip-text text-transparent">A-la</span>
              <span className="text-white ml-2">Burguer</span>
            </h1>
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-brand-400/50" />
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">Panel de Gestión</p>
              <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-brand-400/50" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 animate-scale-in">
              <span className="text-base">⚠️</span>
              <span className="text-xs">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className={`transition-all duration-300 ${focused === 'email' ? 'scale-[1.02]' : ''}`}>
              <label htmlFor="email" className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-[0.2em]">
                Correo electrónico
              </label>
              <div className={`relative rounded-xl transition-all duration-300 ${focused === 'email' ? 'shadow-[0_0_20px_rgba(245,166,35,0.15)]' : ''}`}>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="usuario@alaburguer.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-white text-sm placeholder:text-gray-700 focus:outline-none focus:border-brand-400/40 transition-all duration-300"
                />
              </div>
            </div>

            <div className={`transition-all duration-300 ${focused === 'password' ? 'scale-[1.02]' : ''}`}>
              <label htmlFor="password" className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-[0.2em]">
                Contraseña
              </label>
              <div className={`relative rounded-xl transition-all duration-300 ${focused === 'password' ? 'shadow-[0_0_20px_rgba(245,166,35,0.15)]' : ''}`}>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-white text-sm placeholder:text-gray-700 focus:outline-none focus:border-brand-400/40 transition-all duration-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full min-h-[52px] px-6 py-4 rounded-2xl text-black font-black text-sm overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 active:scale-[0.97]"
            >
              {/* Button gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-400 via-fire-400 to-brand-500 transition-all duration-500" />
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {/* Glow */}
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_30px_rgba(245,166,35,0.4)] group-hover:shadow-[0_0_50px_rgba(245,166,35,0.6)] transition-all duration-500" />
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verificando...
                  </span>
                ) : 'Ingresar al Sistema'}
              </span>
            </button>
          </form>

          {/* Modules */}
          <div className="mt-8 pt-6 border-t border-white/[0.04]">
            <p className="text-[9px] text-gray-600 text-center mb-4 uppercase tracking-[0.3em]">Estaciones</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { icon: '👨‍💼', label: 'Admin' },
                { icon: '🔥', label: 'Cocina' },
                { icon: '🍸', label: 'Bar' },
                { icon: '💰', label: 'Caja' },
                { icon: '🛵', label: 'Envíos' },
              ].map((m, i) => (
                <div key={m.label} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-brand-400/20 hover:bg-brand-500/5 transition-all duration-300 text-center cursor-default group animate-card-enter" style={{ animationDelay: `${600 + i * 100}ms` }}>
                  <span className="text-base block group-hover:scale-125 transition-transform duration-300">{m.icon}</span>
                  <span className="text-[7px] text-gray-600 group-hover:text-gray-400 transition-colors uppercase tracking-wider">{m.label}</span>
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
      <div className="min-h-screen flex items-center justify-center bg-[#030306]">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
