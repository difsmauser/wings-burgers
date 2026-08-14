'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/entregas', label: 'Entregas', icon: '📦' },
  { href: '/mapa', label: 'Mapa', icon: '🗺️' },
];

export default function RepartidorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      <header className="bg-[#111118] border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="A-la Burguer" className="h-8 w-8 rounded-full" />
              <div>
                <h1 className="text-sm font-bold text-white">A-la Burguer</h1>
                <span className="text-[10px] text-brand-400 uppercase tracking-wider">Repartidor</span>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all">
              Cerrar Sesión
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
