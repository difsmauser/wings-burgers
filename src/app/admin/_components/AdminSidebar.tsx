'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/mesas', label: 'Mesas', icon: '🪑' },
  { href: '/admin/meseros', label: 'Meseros', icon: '🧑‍🍳' },
  { href: '/admin/productos', label: 'Productos', icon: '🍗' },
  { href: '/admin/categorias', label: 'Categorías', icon: '📂' },
  { href: '/admin/inventario', label: 'Inventario', icon: '📦' },
  { href: '/admin/gastos', label: 'Gastos', icon: '💰' },
  { href: '/admin/cortes', label: 'Cortes', icon: '📈' },
  { href: '/admin/clientes', label: 'Clientes', icon: '👥' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-[#111118] border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="A-la Burguer" className="h-9 w-9 rounded-full" />
          <div>
            <h1 className="text-sm font-bold text-white">A-la Burguer</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div>
            <p className="text-xs font-medium text-white">Administrador</p>
            <p className="text-[10px] text-gray-500">admin@alaburguer.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all duration-200"
        >
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
