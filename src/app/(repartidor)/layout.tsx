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
}

/**
 * Login por PIN para repartidores — mismo estilo que meseros.
 */
function RepartidorLogin({ onLogin }: { onLogin: (nombre: string) => void }) {
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Repartidor | null>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && anonKey) {
      fetch(`${supabaseUrl}/rest/v1/repartidor?activo=eq.true&select=id,nombre,telefono&order=nombre.asc`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => { if (Array.isArray(data)) setRepartidores(data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetch('/api/repartidores')
        .then(res => res.ok ? res.json() : { data: [] })
        .then(json => setRepartidores(json.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

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
              onClick={() => {
                setSelected(r);
                onLogin(r.nombre);
              }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.97] ${
                selected?.id === r.id
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-[#16161f] border-white/5 hover:border-green-500/20'
              }`}
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

  const handleLogin = (nombre: string) => {
    localStorage.setItem(STORAGE_KEY, nombre);
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
