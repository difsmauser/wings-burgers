'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQrMesa } from '../_context/QrMesaContext';
import { useCarrito } from '../_context/CarritoContext';

/**
 * Formats a number as Mexican Peso currency.
 */
function formatPrecio(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Steps configuration by modality.
 */
function getOrderSteps(modalidad: string | null) {
  if (modalidad === 'domicilio' || modalidad === 'DOMICILIO') {
    return [
      { key: 'recibido', label: 'Recibido', icon: '📋', desc: 'Pedido recibido por el restaurante' },
      { key: 'en_preparacion', label: 'Preparando', icon: '🔥', desc: 'Cocinando tu pedido' },
      { key: 'empacado', label: 'Listo', icon: '📦', desc: 'Tu pedido está listo para envío' },
      { key: 'en_camino', label: 'En camino', icon: '🛵', desc: 'El repartidor va hacia ti' },
      { key: 'entregado', label: 'Entregado', icon: '✅', desc: '¡Buen provecho!' },
    ];
  }
  // LOCAL / RETIRO
  return [
    { key: 'recibido', label: 'Recibido', icon: '📋', desc: 'Pedido recibido por cocina' },
    { key: 'en_preparacion', label: 'Preparando', icon: '🔥', desc: 'Cocinando tu pedido' },
    { key: 'listo_para_servir', label: 'Mesero', icon: '🍽️', desc: 'Mesero asignado, en camino a tu mesa' },
    { key: 'servido', label: 'Servido', icon: '✅', desc: '¡Buen provecho!' },
  ];
}

function mapEstado(apiEstado: string, modalidad: string | null): string {
  const esDomicilio = modalidad === 'domicilio' || modalidad === 'DOMICILIO';
  if (apiEstado === 'servido') return 'servido';
  if (apiEstado === 'listo' || apiEstado === 'listo_para_servir') return 'listo_para_servir';
  if ((apiEstado === 'empacado' || apiEstado === 'empaquetado') && !esDomicilio) return 'listo_para_servir';
  if (apiEstado === 'empacado' || apiEstado === 'empaquetado') return 'empacado';
  if (apiEstado === 'en_camino') return 'en_camino';
  if (apiEstado === 'entregado') return 'entregado';
  if (apiEstado === 'en_preparacion') return 'en_preparacion';
  return 'recibido';
}

/**
 * Premium step indicator for the tracking page.
 */
function StepIndicator({ pasos, currentIdx }: { pasos: ReturnType<typeof getOrderSteps>; currentIdx: number }) {
  const progressPercent = pasos.length > 1 ? (currentIdx / (pasos.length - 1)) * 100 : 0;

  return (
    <div className="relative px-2 py-4">
      {/* Background line */}
      <div className="absolute top-[28px] left-10 right-10 h-[3px] rounded-full bg-white/[0.04]" />
      {/* Animated progress line */}
      <div
        className="absolute top-[28px] left-10 h-[3px] rounded-full transition-all duration-1000 ease-out"
        style={{
          width: `calc(${progressPercent}% - ${progressPercent > 0 ? '0px' : '0px'})`,
          maxWidth: 'calc(100% - 80px)',
          background: 'linear-gradient(90deg, #f59e0b, #f97316, #ef4444)',
          boxShadow: '0 0 8px rgba(249, 115, 22, 0.4)',
        }}
      />

      <div className="relative flex items-start justify-between">
        {pasos.map((paso, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div key={paso.key} className="flex flex-col items-center w-0 flex-1">
              <div className={`
                relative w-[42px] h-[42px] rounded-full flex items-center justify-center text-base
                transition-all duration-700 ease-out
                ${isCurrent
                  ? 'bg-gradient-to-br from-brand-400 to-fire-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] scale-110 ring-[3px] ring-fire-500/20'
                  : isCompleted
                  ? 'bg-gradient-to-br from-brand-400/90 to-brand-500/90 text-black'
                  : 'bg-[#16161f] border border-white/[0.08] text-gray-600'
                }
              `}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={isPending ? 'opacity-40' : ''}>{paso.icon}</span>
                )}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full bg-fire-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                )}
              </div>
              <span className={`
                text-[10px] sm:text-xs mt-2 font-semibold text-center leading-tight
                ${isCurrent ? 'text-brand-400' : isCompleted ? 'text-gray-300' : 'text-gray-600'}
              `}>
                {paso.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PedidoTracking {
  id: string;
  numero: string;
  estado: string;
  modalidad: string;
  total: number;
  mesaZona: string | null;
  meseroNombre: string | null;
  estaciones: { cocina: string | null; bar: string | null };
}

/**
 * Rastreo/Tracking page — shows real-time order status.
 * Polls /api/pedidos/[id]/estado every 5 seconds.
 * Supports both mesa flow (multiple orders) and single-order flow (domicilio/retiro).
 */
export default function RastreoPage() {
  const { qrMesa, setQrMesa } = useQrMesa();
  const { limpiarCarrito } = useCarrito();
  const menuHref = qrMesa ? `/menu?qr=${qrMesa.codigo}` : '/menu';

  const [pedido, setPedido] = useState<PedidoTracking | null>(null);
  const [pedidosMesa, setPedidosMesa] = useState<PedidoTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);
  const [pagoCelebrado, setPagoCelebrado] = useState(false);

  // Get pedidoId from localStorage
  const getPedidoId = (): string | null => {
    try {
      const single = localStorage.getItem('alaburguer-pedido-id');
      if (single) return single;
      const ids = localStorage.getItem('alaburguer-pedido-ids');
      if (ids) {
        const arr = JSON.parse(ids);
        return arr.length > 0 ? arr[arr.length - 1] : null;
      }
    } catch { /* */ }
    return null;
  };

  // Fetch for QR mesa flow — gets all orders for the mesa
  useEffect(() => {
    if (!qrMesa) return;

    const fetchMesa = async () => {
      try {
        const res = await fetch(`/api/pedidos/mesa?mesaZona=${encodeURIComponent(qrMesa.mesaZona)}`);
        if (res.ok) {
          const json = await res.json();
          const todos = json.data || [];
          const activos = todos
            .filter((p: { estadoPago?: string }) => p.estadoPago !== 'pagado')
            .map((p: Record<string, unknown>) => ({
              id: p.id as string,
              numero: p.numero as string,
              estado: p.estado as string,
              modalidad: p.modalidad as string,
              total: p.total as number,
              mesaZona: p.mesaZona as string | null,
              meseroNombre: p.meseroNombre as string | null,
              estaciones: { cocina: null, bar: null },
            }));
          setPedidosMesa(activos);

          // Detectar pago completado — todos pagados
          if (activos.length === 0 && todos.length > 0) {
            setPagoCelebrado(true);
          }
        }
      } catch { /* */ }
      finally { setLoading(false); }
    };

    fetchMesa();
    const interval = setInterval(fetchMesa, 5000);
    return () => clearInterval(interval);
  }, [qrMesa]);

  // Limpieza después de celebración
  useEffect(() => {
    if (!pagoCelebrado) return;
    const timer = setTimeout(() => {
      limpiarCarrito();
      localStorage.removeItem('alaburguer-pedido-ids');
      localStorage.removeItem('alaburguer-pedido-id');
      localStorage.removeItem('alaburguer-cliente-nombre');
      localStorage.removeItem('alaburguer-cliente-telefono');
      setQrMesa(null);
      window.location.href = '/menu';
    }, 10000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagoCelebrado]);

  // Fetch for single-order flow (domicilio/retiro)
  useEffect(() => {
    if (qrMesa) return; // Mesa flow handled above

    const pedidoId = getPedidoId();
    if (!pedidoId) {
      setLoading(false);
      return;
    }

    const fetchEstado = async () => {
      try {
        const res = await fetch(`/api/pedidos/${pedidoId}/estado`);
        if (res.ok) {
          const json = await res.json();
          const d = json.data;
          setPedido({
            id: d.id,
            numero: d.numero || pedidoId.slice(-4),
            estado: d.estado,
            modalidad: d.modalidad,
            total: d.total,
            mesaZona: d.mesaZona,
            meseroNombre: d.meseroNombre,
            estaciones: d.estaciones || { cocina: null, bar: null },
          });

          if (['servido', 'entregado'].includes(d.estado)) {
            setPolling(false);
          }
        }
      } catch { /* */ }
      finally { setLoading(false); }
    };

    fetchEstado();
    if (polling) {
      const interval = setInterval(fetchEstado, 5000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrMesa, polling]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-gray-400">Cargando estado del pedido...</p>
      </div>
    );
  }

  // Celebración de pago
  if (pagoCelebrado) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f] overflow-hidden">
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {Array.from({ length: 50 }).map((_, i) => (
            <span
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                animation: `confetti-fall ${2.5 + Math.random() * 2}s ${Math.random() * 3}s linear forwards`,
                fontSize: `${12 + Math.random() * 16}px`,
              }}
            >
              {['🎉', '🎊', '✨', '🍔', '🍗', '⭐', '💛', '🔥', '🥳'][Math.floor(Math.random() * 9)]}
            </span>
          ))}
        </div>
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px] animate-pulse" />
        {/* Content */}
        <div className="relative text-center px-6 max-w-md animate-scale-in">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)]">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">¡Pago Completado!</h1>
          <p className="text-lg text-green-400 font-semibold mb-2">Gracias por tu preferencia</p>
          <p className="text-sm text-gray-400 mb-6">🍔 ¡Vuelve pronto!</p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-600">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Esta pantalla se cerrará automáticamente
          </div>
        </div>
        <style jsx>{`
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  // No order found
  if (!qrMesa && !pedido) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <span className="text-5xl block mb-4" aria-hidden="true">📦</span>
        <h2 className="text-xl font-bold text-white mb-2">No hay pedidos activos</h2>
        <p className="text-sm text-gray-400 mb-6">
          Realiza un pedido desde el menú para poder rastrearlo aquí.
        </p>
        <Link
          href={menuHref}
          className="inline-flex items-center min-h-[44px] px-6 py-3 rounded-xl text-black font-semibold text-sm gradient-brand shadow-lg shadow-brand-500/20 transition-all duration-150"
        >
          Ir al menú
        </Link>
      </div>
    );
  }

  // MESA flow — multiple orders
  if (qrMesa && pedidosMesa.length > 0) {
    const totalMesa = pedidosMesa.reduce((sum, p) => sum + (p.total || 0), 0);
    const todosListos = pedidosMesa.every(p => ['servido', 'entregado'].includes(p.estado));

    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold text-white">📍 {qrMesa.mesaZona}</h1>
          <p className="text-xs text-gray-500 mt-1">{pedidosMesa.length} pedido{pedidosMesa.length > 1 ? 's' : ''} activo{pedidosMesa.length > 1 ? 's' : ''}</p>
        </div>

        {/* Each order */}
        {pedidosMesa.map((p) => {
          const pasos = getOrderSteps(p.modalidad);
          const mapped = mapEstado(p.estado, p.modalidad);
          const currentIdx = Math.max(0, pasos.findIndex(s => s.key === mapped));
          const currentPaso = pasos[currentIdx];
          const isTerminal = ['servido', 'entregado'].includes(mapped);

          return (
            <div key={p.id} className="rounded-2xl bg-[#0e0e16] border border-white/[0.06] p-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">#{p.numero}</span>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${isTerminal ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'}`}>
                  {currentPaso.icon} {currentPaso.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{currentPaso.desc}</p>
              <StepIndicator pasos={pasos} currentIdx={currentIdx} />
              {isTerminal && (
                <p className="mt-2 text-center text-[11px] text-green-400 font-medium">🎉 {currentPaso.desc}</p>
              )}
            </div>
          );
        })}

        {/* Total and pay button */}
        <div className="rounded-2xl bg-[#16161f] border border-white/5 p-4 text-center">
          <p className="text-sm text-gray-400">Total mesa: <span className="text-brand-400 font-bold">{formatPrecio(totalMesa)}</span></p>
        </div>

        {todosListos && (
          <Link
            href="/pago"
            className="block w-full py-4 rounded-2xl font-bold text-base text-center text-black bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 shadow-xl shadow-brand-500/20 hover:shadow-2xl transition-all active:scale-[0.97]"
          >
            💳 Pagar — {formatPrecio(totalMesa)}
          </Link>
        )}

        {!todosListos && (
          <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Actualizando en tiempo real
          </div>
        )}
      </div>
    );
  }

  // MESA flow — no active orders
  if (qrMesa && pedidosMesa.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <span className="text-5xl block mb-4" aria-hidden="true">🍽️</span>
        <h2 className="text-xl font-bold text-white mb-2">Estás en {qrMesa.mesaZona.split(' - ')[0]}</h2>
        <p className="text-sm text-gray-400 mb-6">
          Aún no tienes pedidos activos. ¡Pide desde el menú!
        </p>
        <Link
          href={`/menu?qr=${qrMesa.codigo}`}
          className="inline-flex items-center min-h-[44px] px-6 py-3 rounded-xl text-black font-semibold text-sm gradient-brand shadow-lg shadow-brand-500/20 transition-all duration-150"
        >
          Ver menú
        </Link>
      </div>
    );
  }

  // SINGLE-ORDER flow (domicilio, retiro, mostrador)
  if (pedido) {
    const pasos = getOrderSteps(pedido.modalidad);
    const mapped = mapEstado(pedido.estado, pedido.modalidad);
    const currentIdx = Math.max(0, pasos.findIndex(s => s.key === mapped));
    const currentPaso = pasos[currentIdx];
    const isTerminal = ['servido', 'entregado'].includes(mapped);
    const esDomicilio = pedido.modalidad === 'domicilio' || pedido.modalidad === 'DOMICILIO';

    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-2">
          <span className="text-4xl block mb-2" aria-hidden="true">{esDomicilio ? '🛵' : '🍔'}</span>
          <h1 className="text-xl font-bold text-white">Rastreo de Pedido</h1>
          <p className="text-xs text-gray-500 mt-1">Pedido #{pedido.numero}</p>
        </div>

        {/* Tracker card */}
        <div className="rounded-2xl bg-[#0e0e16] border border-white/[0.06] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-white">#{pedido.numero}</span>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${isTerminal ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'}`}>
              {currentPaso.icon} {currentPaso.label}
            </span>
          </div>

          <p className="text-sm text-gray-300 mb-4">{currentPaso.desc}</p>

          <StepIndicator pasos={pasos} currentIdx={currentIdx} />

          {/* Station progress */}
          {pedido.estaciones.cocina !== null || pedido.estaciones.bar !== null ? (
            <div className="flex items-center gap-2 mt-4">
              {pedido.estaciones.cocina !== null && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold ${pedido.estaciones.cocina === 'listo' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  <span>🔥</span> Cocina: {pedido.estaciones.cocina === 'listo' ? 'Listo' : pedido.estaciones.cocina === 'preparando' ? 'Preparando' : 'Pendiente'}
                </div>
              )}
              {pedido.estaciones.bar !== null && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold ${pedido.estaciones.bar === 'listo' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  <span>🍸</span> Bar: {pedido.estaciones.bar === 'listo' ? 'Listo' : pedido.estaciones.bar === 'preparando' ? 'Preparando' : 'Pendiente'}
                </div>
              )}
            </div>
          ) : null}

          {/* Terminal message */}
          {isTerminal && (
            <div className="mt-4 text-center">
              <p className="text-sm text-green-400 font-medium">🎉 {currentPaso.desc}</p>
            </div>
          )}

          {/* Polling indicator */}
          {polling && !isTerminal && (
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Actualizando en tiempo real
            </div>
          )}
        </div>

        {/* Order total */}
        {pedido.total > 0 && (
          <div className="rounded-2xl bg-[#16161f] border border-white/5 p-4 text-center">
            <p className="text-sm text-gray-400">Total: <span className="text-brand-400 font-bold text-lg">{formatPrecio(pedido.total)}</span></p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {isTerminal && (
            <Link
              href="/pago"
              className="block w-full py-4 rounded-2xl font-bold text-base text-center text-black bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 shadow-xl shadow-brand-500/20"
            >
              💳 Ir a Pagar
            </Link>
          )}
          <Link
            href={menuHref}
            className="block w-full py-3 rounded-xl font-medium text-sm text-center text-brand-400 bg-brand-50/10 border border-brand-400/20 hover:bg-brand-400/10 transition-colors"
          >
            ← Volver al menú
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
