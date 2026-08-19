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
        {/* Animated fire bottom border — SVG flames */}
        <div className="relative h-3 overflow-visible pointer-events-none">
          <svg
            className="absolute bottom-0 left-0 w-full h-6"
            viewBox="0 0 1200 24"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="flame-grad-1" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#f97316" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="flame-grad-2" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Layer 1: larger flames */}
            <path className="animate-flames-1" fill="url(#flame-grad-1)" d="M0,24 C30,24 40,14 60,10 C80,6 90,16 120,12 C150,8 160,18 200,14 C240,10 250,20 280,16 C310,12 330,22 360,18 C390,14 410,24 440,20 C470,16 490,22 520,18 C550,14 570,24 600,20 C630,16 650,10 680,14 C710,18 730,8 760,12 C790,16 810,6 840,10 C870,14 900,20 930,16 C960,12 980,22 1010,18 C1040,14 1060,24 1090,20 C1120,16 1140,10 1170,14 C1190,16 1200,20 1200,24 Z" />
            {/* Layer 2: smaller accent flames */}
            <path className="animate-flames-2" fill="url(#flame-grad-2)" d="M0,24 C20,24 30,18 50,16 C70,14 80,20 110,17 C140,14 150,22 180,19 C210,16 230,24 260,21 C290,18 310,14 340,17 C370,20 390,12 420,15 C450,18 470,24 500,21 C530,18 550,14 580,17 C610,20 630,12 660,15 C690,18 720,24 750,21 C780,18 800,14 830,17 C860,20 880,12 910,15 C940,18 960,24 990,21 C1020,18 1040,14 1070,17 C1100,20 1130,24 1160,21 C1180,19 1200,22 1200,24 Z" />
          </svg>
          {/* Glow line at the base */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-fire-500/80 to-transparent" />
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
