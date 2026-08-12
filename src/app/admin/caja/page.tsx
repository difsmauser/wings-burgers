import Link from 'next/link';

export default function AdminCajaPage() {
  return (
    <div className="max-w-md mx-auto text-center py-12 animate-fade-in">
      <span className="text-4xl block mb-3">💰</span>
      <h1 className="text-xl font-bold text-white mb-2">Módulo de Caja</h1>
      <p className="text-sm text-gray-400 mb-4">La caja ahora tiene su propio acceso independiente.</p>
      <Link href="/caja" className="text-sm text-brand-400 hover:text-brand-300 underline">
        Ir a Caja →
      </Link>
    </div>
  );
}
