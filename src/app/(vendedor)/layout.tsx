'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * Navigation items for the vendedor module.
 * - Pedidos: Real-time panel + order status management
 * - Cuenta: Send bill to client
 */
const NAV_ITEMS = [
  { href: '/pedidos', label: 'Pedidos', icon: '📋' },
  { href: '/pedidos/captura', label: 'Captura', icon: '📝' },
  { href: '/cuenta', label: 'Cuenta', icon: '🧾' },
];

/**
 * Vendedor module layout with dark enterprise theme.
 *
 * Route protection by "vendedor" role is handled by the Next.js middleware (task 16.3).
 * Requirements: 19.1, 7.1
 */
export default function VendedorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f]">
      {/* Top Navigation Bar */}
      <header className="bg-[#111118] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold text-white">
                A-la Burguer
              </h1>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider border-l border-white/10 pl-3">
                Cocina
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1" aria-label="Navegación vendedor">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${
                        isActive
                          ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="text-base" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Vendedor</span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">V</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
