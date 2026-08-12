'use client';

import Link from 'next/link';
import { useQrMesa } from '../_context/QrMesaContext';

export default function RastreoPage() {
  const { qrMesa } = useQrMesa();
  const menuHref = qrMesa ? `/menu?qr=${qrMesa.codigo}` : '/menu';

  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      {qrMesa ? (
        <>
          <span className="text-5xl block mb-4" aria-hidden="true">🍽️</span>
          <h2 className="text-xl font-bold text-white mb-2">Estás en {qrMesa.mesaZona.split(' - ')[0]}</h2>
          <p className="text-sm text-gray-400 mb-6">
            El rastreo GPS solo está disponible para pedidos a domicilio. 
            Tu pedido llegará directo a tu mesa.
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Puedes ver el estado de tu pedido en la sección &quot;Mi Pedido&quot;.
          </p>
          <Link
            href="/pedido"
            className="inline-flex items-center min-h-[44px] px-6 py-3 rounded-xl text-black font-semibold text-sm gradient-brand shadow-lg shadow-brand-500/20 transition-all duration-150"
          >
            Ver mi pedido
          </Link>
        </>
      ) : (
        <>
          <span className="text-5xl block mb-4" aria-hidden="true">🛵</span>
          <h2 className="text-xl font-bold text-white mb-2">Rastreo de Pedido</h2>
          <p className="text-sm text-gray-400 mb-6">
            El rastreo está disponible para pedidos a domicilio. 
            Primero realiza un pedido desde el menú.
          </p>
          <Link
            href={menuHref}
            className="inline-flex items-center min-h-[44px] px-6 py-3 rounded-xl text-black font-semibold text-sm gradient-brand shadow-lg shadow-brand-500/20 transition-all duration-150"
          >
            Ir al menú
          </Link>
        </>
      )}
    </div>
  );
}
