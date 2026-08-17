import { ReactNode } from 'react';
import AdminSidebar from './_components/AdminSidebar';

export const metadata = {
  title: 'Admin - A-la Burguer',
  description: 'Panel de Administración',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      {/* Sidebar: hidden on mobile, shown on lg+ */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header with menu */}
        <header className="lg:hidden bg-[#111118] border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="A-la Burguer" className="h-8 w-8 rounded-full" />
            <div>
              <h1 className="text-sm font-bold text-white">A-la Burguer</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin</p>
            </div>
          </div>
          {/* Mobile nav scroll */}
          <nav className="flex items-center gap-1 overflow-x-auto ml-4">
            <MobileNavLinks />
          </nav>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileNavLinks() {
  const links = [
    { href: '/admin', label: '📊' },
    { href: '/admin/mesas', label: '🪑' },
    { href: '/admin/meseros', label: '🧑‍🍳' },
    { href: '/admin/repartidores', label: '🛵' },
    { href: '/admin/productos', label: '🍗' },
    { href: '/admin/cuentas-bancarias', label: '🏦' },
    { href: '/admin/comprobantes', label: '🧾' },
    { href: '/admin/gastos', label: '💰' },
    { href: '/admin/cortes', label: '📈' },
  ];
  return (
    <>
      {links.map(l => (
        <a key={l.href} href={l.href} className="text-lg px-2 py-1 rounded hover:bg-white/10 transition-all shrink-0">{l.label}</a>
      ))}
    </>
  );
}
