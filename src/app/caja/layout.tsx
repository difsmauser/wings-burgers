import { ReactNode } from 'react';

export const metadata = { title: 'Caja - A-la Burguer' };

export default function CajaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {children}
    </div>
  );
}
