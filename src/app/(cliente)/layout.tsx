'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CarritoProvider, useCarrito } from './_context/CarritoContext';
import { QrMesaProvider } from './_context/QrMesaContext';

/**
 * Navigation items for the cliente module.
 * Each item has a minimum touch target of 44x44px (Req 18.2).
 */
const NAV_ITEMS = [
  { href: '/menu', label: 'Menú', icon: '🍔' },
  { href: '/pedido', label: 'Mi Pedido', icon: '🛒' },
  { href: '/pago', label: 'Pago', icon: '💳' },
  { href: '/rastreo', label: 'Rastreo', icon: '📍' },
];

/**
 * Inner layout component that uses the cart context for badge display.
 */
function ClienteLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { cantidadTotal } = useCarrito();

  return (
    <div className="flex flex-col min-h-screen bg-brand-50">
      {/* Top Header */}
      <header className="bg-wood-800 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center h-14 sm:h-16">
            <h1 className="text-lg sm:text-xl font-bold text-golden-300">
              🍗 Wings & Burgers
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 sm:pb-24">
        {children}
      </main>

      {/* Bottom Tab Navigation - fixed at bottom for mobile */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-wood-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <ul className="flex items-center justify-around h-16 sm:h-18">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname?.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      relative flex flex-col items-center justify-center
                      min-w-[44px] min-h-[44px] px-3 py-2
                      rounded-lg text-xs sm:text-sm font-medium
                      transition-colors duration-200
                      motion-reduce:transition-none
                      ${
                        isActive
                          ? 'text-brand-600 bg-brand-50'
                          : 'text-wood-500 hover:text-brand-500 hover:bg-brand-50/50'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="relative text-xl sm:text-2xl mb-0.5" aria-hidden="true">
                      {item.icon}
                      {item.href === '/pedido' && cantidadTotal > 0 && (
                        <span className="absolute -top-1 -right-2 bg-fire-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                          {cantidadTotal > 99 ? '99+' : cantidadTotal}
                        </span>
                      )}
                    </span>
                    <span>{item.label}</span>
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

/**
 * Cliente module layout with bottom tab navigation.
 *
 * Designed for mobile-first experience with bottom navigation bar,
 * responsive from 320px to 1920px (Req 18.2).
 * Touch targets are minimum 44x44px.
 * Animations respect prefers-reduced-motion (Req 18.5).
 *
 * Route protection by "cliente" role is handled by middleware (task 16.3).
 */
export default function ClienteLayout({ children }: { children: ReactNode }) {
  return (
    <QrMesaProvider>
      <CarritoProvider>
        <ClienteLayoutInner>{children}</ClienteLayoutInner>
      </CarritoProvider>
    </QrMesaProvider>
  );
}
