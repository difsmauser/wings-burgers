'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/entregas', label: 'Entregas', icon: '📦' },
  { href: '/mapa', label: 'Mapa', icon: '🗺️' },
];

const STORAGE_KEY = 'alaburguer-repartidor-nombre';

interface Repartidor {
  id: string;
  nombre: string;
  telefono?: string;
  pin?: string;
}

/**
 * Login por PIN para repartidores — mismo estilo que meseros.
 */
function RepartidorLogin({ onLogin }: { onLogin: (nombre: string, id: string) => void }) {
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Repartidor | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    fetch('/api/repartidores')
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => {
        const data = json.data || json || [];
        if (Array.isArray(data)) setRepartidores(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-submit cuando escribe 4 dígitos
  useEffect(() => {
    if (pinInput.length === 4 && selected) {
      if (!selected.pin || selected.pin === pinInput) {
        onLogin(selected.nombre, selected.id);
      } else {
        setPinError(true);
        setTimeout(() => { setPinError(false); setPinInput(''); }, 600);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinInput, selected]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-green-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (repartidores.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <span className="text-5xl block mb-4">🛵</span>
          <h2 className="text-xl font-bold text-white mb-2">Sin repartidores</h2>
          <p className="text-sm text-gray-400">No hay repartidores registrados. Ve a Admin → Repartidores para agregar uno.</p>
        </div>
      </div>
    );
  }

  // Pantalla de PIN después de seleccionar
  if (selected) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-xs text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
            <span className="text-2xl font-bold text-green-400">{selected.nombre.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{selected.nombre}</h2>
            <p className="text-xs text-gray-500 mt-1">Ingresa tu PIN de 4 dígitos</p>
          </div>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoFocus
            className={`w-full text-center text-2xl font-mono tracking-[0.5em] py-4 rounded-xl bg-white/[0.03] border ${pinError ? 'border-red-500 animate-shake' : 'border-white/[0.08]'} text-white focus:outline-none focus:ring-2 focus:ring-green-400/40`}
            placeholder="····"
          />

          {pinError && <p className="text-xs text-red-400">PIN incorrecto</p>}

          <button
            onClick={() => { setSelected(null); setPinInput(''); }}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            ← Cambiar perfil
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de selección de perfil
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center">
          <img src="/logo.png" alt="A-la Burguer" className="h-14 w-14 mx-auto rounded-full border border-brand-400/20 mb-4" />
          <h1 className="text-xl font-bold text-white">Módulo Repartidor</h1>
          <p className="text-sm text-gray-400 mt-1">Selecciona tu perfil</p>
        </div>

        <div className="space-y-2">
          {repartidores.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border bg-[#16161f] border-white/5 hover:border-green-500/20 transition-all active:scale-[0.97]"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <span className="text-lg font-bold text-green-400">{r.nombre.charAt(0).toUpperCase()}</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">{r.nombre}</p>
                {r.telefono && <p className="text-[10px] text-gray-500">{r.telefono}</p>}
              </div>
              <span className="ml-auto text-green-400">🛵</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RepartidorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [repartidorNombre, setRepartidorNombre] = useState('');
  const [registrado, setRegistrado] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setRepartidorNombre(stored);
      setRegistrado(true);
    }
  }, []);

  const handleLogin = (nombre: string, id: string) => {
    localStorage.setItem(STORAGE_KEY, nombre);
    localStorage.setItem('alaburguer-repartidor-id', id);
    setRepartidorNombre(nombre);
    setRegistrado(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRepartidorNombre('');
    setRegistrado(false);
  };

  if (!registrado) {
    return <RepartidorLogin onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      <header className="bg-[#111118] border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <span className="text-sm font-bold text-green-400">{repartidorNombre.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">{repartidorNombre}</h1>
                <span className="text-[10px] text-green-400 uppercase tracking-wider">Repartidor</span>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all">
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
