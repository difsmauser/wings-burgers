'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/productos', label: 'Productos', icon: '🍗' },
  { href: '/precios', label: 'Precios', icon: '💰' },
  { href: '/gastos', label: 'Gastos', icon: '📊' },
  { href: '/inventario', label: 'Inventario', icon: '📦' },
  { href: '/cortes', label: 'Cortes', icon: '📈' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-wood-800 text-white flex flex-col shadow-lg">
      {/* Logo / Title */}
      <div className="p-6 border-b border-wood-700">
        <h1 className="text-xl font-bold text-golden-300">
          A-la Burguer
        </h1>
        <p className="text-sm text-wood-300 mt-1">Panel de Administración</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${isActive
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-wood-200 hover:bg-wood-700 hover:text-white'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-wood-700">
        <p className="text-xs text-wood-400 text-center">
          © {new Date().getFullYear()} A-la Burguer
        </p>
      </div>
    </aside>
  );
}
