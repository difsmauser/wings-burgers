'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export default function BarLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      <header className="bg-[#111118] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="A-la Burguer" className="h-8 w-8 rounded-full" />
              <div>
                <h1 className="text-sm font-bold text-white">A-la Burguer</h1>
                <span className="text-[10px] text-purple-400 uppercase tracking-wider">Bar / Bebidas</span>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
