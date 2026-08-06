'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * Navigation items for the vendedor module.
 * - Pedidos: Real-time panel + order capture
 * - Cuenta: Send bill to client
 */
const NAV_ITEMS = [
  { href: '/pedidos', label: 'Pedidos', icon: '📋' },
  { href: '/cuenta', label: 'Cuenta', icon: '🧾' },
];

/**
 * Vendedor module layout with top navigation bar.
 *
 * Route protection by "vendedor" role is handled by the Next.js middleware (task 16.3).
 * The middleware checks the URL path prefix and validates the user's Supabase Auth
 * session has role "vendedor" (or "admin") before allowing access.
 *
 * Requirements: 19.1, 7.1
 */
export default function VendedorLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-brand-50">
      {/* Top Navigation Bar */}
      <header className="bg-wood-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-golden-300">
                Wings & Burgers
              </h1>
              <span className="text-xs text-wood-300 border-l border-wood-600 pl-3">
                Vendedor
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
                      transition-colors duration-200
                      ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'text-wood-200 hover:bg-wood-700 hover:text-white'
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
              <span className="text-sm text-wood-300">Vendedor</span>
              <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center">
                <span className="text-brand-700 text-sm font-medium">V</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
