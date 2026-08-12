import { ReactNode } from 'react';
import AdminSidebar from './_components/AdminSidebar';

export const metadata = {
  title: 'Admin - A-la Burguer',
  description: 'Panel de Administración',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
