'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CarritoProvider, useCarrito } from './_context/CarritoContext';
import { QrMesaProvider, useQrMesa } from './_context/QrMesaContext';

function ClienteLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { cantidadTotal } = useCarrito();
  const { qrMesa } = useQrMesa();

  // Build nav items with QR context preserved
  const navItems = [
    { href: qrMesa ? `/menu?qr=${qrMesa.codigo}` : '/menu', label: 'Menú', icon: '🍔' },
    { href: '/pedido', label: 'Mi Pedido', icon: '🛒' },
    { href: '/pagar', label: 'Pago', icon: '💳' },
    { href: '/rastreo', label: 'Rastreo', icon: '📍' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Premium Header with Fire Effects */}
      <header className="bg-[#111118] text-white sticky top-0 z-40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center h-14 sm:h-16 relative">
            <img src="/logo.png" alt="A-la Burguer" className="h-10 sm:h-12 w-auto drop-shadow-[0_0_12px_rgba(245,166,35,0.4)] relative z-10" />
            {/* Ambient fire glow behind logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-10 bg-gradient-to-t from-fire-500/15 via-brand-500/10 to-transparent blur-lg" />
            </div>
          </div>
        </div>
        {/* Fire bottom edge — organic flames using CSS shapes */}
        <div className="relative h-[10px] overflow-visible pointer-events-none">
          {/* Base glow */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-fire-500/70 to-transparent blur-[1px]" />
          {/* Flame tips — small organic bumps */}
          <div className="absolute bottom-0 left-0 right-0 h-[10px] fire-edge" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 sm:pb-28">
        {children}
      </main>

      {/* Premium Bottom Navigation - Dark Theme */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#111118]/95 backdrop-blur-xl border-t border-white/5 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]"
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="max-w-lg mx-auto px-3 sm:px-6 safe-area-inset-bottom">
          <ul className="flex items-center justify-around h-18 sm:h-20">
            {navItems.map((item) => {
              const hrefPath = item.href.split('?')[0];
              const isActive =
                pathname === hrefPath ||
                pathname?.startsWith(hrefPath + '/');
              return (
                <li key={hrefPath}>
                  <Link
                    href={item.href}
                    className={`
                      relative flex flex-col items-center justify-center
                      min-w-[56px] min-h-[56px] px-3 py-2
                      rounded-2xl text-xs font-semibold
                      transition-all duration-300 ease-out
                      motion-reduce:transition-none
                      ${
                        isActive
                          ? 'text-brand-400 bg-brand-500/10 scale-105 shadow-sm'
                          : 'text-gray-500 hover:text-brand-400 hover:bg-white/5 active:scale-95'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="relative text-xl sm:text-2xl mb-0.5 transition-transform duration-300" aria-hidden="true">
                      {item.icon}
                      {item.href === '/pedido' && cantidadTotal > 0 && (
                        <span className="absolute -top-1.5 -right-2.5 bg-fire-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg shadow-fire-500/30 animate-bounce-subtle">
                          {cantidadTotal > 99 ? '99+' : cantidadTotal}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5">{item.label}</span>
                    {/* Active indicator dot */}
                    {isActive && (
                      <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-brand-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </div>
  );
}

export default function ClienteLayout({ children }: { children: ReactNode }) {
  return (
    <QrMesaProvider>
      <CarritoProvider>
        <ClienteLayoutInner>{children}</ClienteLayoutInner>
      </CarritoProvider>
    </QrMesaProvider>
  );
}
