import { ReactNode } from 'react';
import { Sidebar } from './_components';

/**
 * Admin module layout with sidebar navigation.
 * 
 * Route protection by "admin" role will be connected in task 16.3
 * via Next.js middleware with Supabase Auth.
 * For now, the layout renders directly assuming authenticated admin.
 */
export const metadata = {
  title: 'Admin - Wings & Burgers',
  description: 'Panel de Administración Wings & Burgers',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  // TODO (task 16.3): Connect auth middleware to validate admin role
  // The actual protection will be handled by Next.js middleware checking
  // Supabase Auth session and user role before rendering this layout.

  return (
    <div className="flex min-h-screen bg-brand-50">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-wood-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-wood-800">
              Wings & Burgers - Admin
            </h2>
            <div className="flex items-center gap-3">
              {/* Placeholder for user info - will be connected with auth */}
              <span className="text-sm text-wood-600">Administrador</span>
              <div className="w-8 h-8 rounded-full bg-brand-200 flex items-center justify-center">
                <span className="text-brand-700 text-sm font-medium">A</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
