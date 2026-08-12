'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrito } from '../_context/CarritoContext';

/**
 * /menu-domicilio — Entrada directa al menú en modo domicilio.
 * Para compartir en redes sociales. Setea modalidad DOMICILIO y redirige a /menu.
 */
export default function MenuDomicilioPage() {
  const router = useRouter();
  const { setModalidad } = useCarrito();

  useEffect(() => {
    setModalidad('DOMICILIO');
    router.replace('/menu');
  }, [setModalidad, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando menú...</p>
      </div>
    </div>
  );
}
