'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQrMesa } from '../_context/QrMesaContext';
import { useCarrito } from '../_context/CarritoContext';

interface CuentaBancaria {
  id: string;
  banco: string;
  titular: string;
  clabe: string;
  numero_tarjeta: string | null;
  referencia: string | null;
}

type PasoPago = 'esperando' | 'seleccion' | 'transferencia' | 'efectivo' | 'esperando_mesero' | 'validando' | 'completado';

export default function PagarPage() {
  const { qrMesa } = useQrMesa();
  const { modalidad, confirmado, total: carritoTotal } = useCarrito();

  const [paso, setPaso] = useState<PasoPago>('esperando');
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [total, setTotal] = useState(0);
  const [pedidoIds, setPedidoIds] = useState<string[]>([]);
  const [pedidoEstado, setPedidoEstado] = useState<string>('');
  const [meseroNombre, setMeseroNombre] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [billete, setBillete] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Determine if payment should be active based on channel + order state
  const determinarEstadoPago = useCallback(() => {
    // DOMICILIO: payment available immediately after order is confirmed
    if (modalidad === 'DOMICILIO' && confirmado) {
      return 'seleccion';
    }
    // LOCAL/RETIRO: depends on order status from server
    if (pedidoEstado === 'servido' || pedidoEstado === 'listo_para_servir') {
      return 'seleccion';
    }
    return 'esperando';
  }, [modalidad, confirmado, pedidoEstado]);

  // Fetch order data (for LOCAL/RETIRO channels)
  const fetchPedidos = useCallback(async () => {
    // For mesa orders
    if (qrMesa) {
      const res = await fetch(`/api/pedidos/mesa?mesaZona=${encodeURIComponent(qrMesa.mesaZona)}`);
      if (res.ok) {
        const json = await res.json();
        const activos = (json.data || []).filter((p: { estadoPago?: string }) => p.estadoPago !== 'pagado');
        setTotal(activos.reduce((s: number, p: { total: number }) => s + p.total, 0));
        setPedidoIds(activos.map((p: { id: string }) => p.id));
        if (activos.length > 0) {
          setPedidoEstado(activos[0].estado || '');
          // Obtener nombre del mesero asignado
          const mesero = activos.find((p: { meseroNombre?: string }) => p.meseroNombre)?.meseroNombre || '';
          if (mesero) setMeseroNombre(mesero);
        }
        // Check if already paid
        if (activos.length === 0 && (json.data || []).length > 0) {
          setPaso('completado');
          return;
        }
      }
    } else if (modalidad === 'DOMICILIO' || modalidad === 'RETIRO') {
      // For domicilio/para-llevar: get from localStorage pedido IDs
      try {
        const stored = localStorage.getItem('alaburguer-pedido-ids');
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          setPedidoIds(ids);
          // Use cart total
          setTotal(carritoTotal);
        }
      } catch { /* */ }
    }
  }, [qrMesa, modalidad, carritoTotal]);

  // Load bank accounts
  useEffect(() => {
    fetch('/api/cuentas-bancarias')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setCuentas(j.data || []))
      .catch(() => {});
  }, []);

  // Fetch pedidos on mount and poll
  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 8000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  // Determine paso based on state
  useEffect(() => {
    if (paso === 'validando' || paso === 'completado' || paso === 'transferencia' || paso === 'efectivo' || paso === 'esperando_mesero') return;
    const newPaso = determinarEstadoPago();
    setPaso(newPaso);
  }, [determinarEstadoPago, paso]);

  // Poll for validation completion
  useEffect(() => {
    if (paso !== 'validando') return;
    const interval = setInterval(async () => {
      if (qrMesa) {
        const res = await fetch(`/api/pedidos/mesa?mesaZona=${encodeURIComponent(qrMesa.mesaZona)}`);
        if (res.ok) {
          const json = await res.json();
          const activos = (json.data || []).filter((p: { estadoPago?: string }) => p.estadoPago !== 'pagado');
          if (activos.length === 0) {
            setPaso('completado');
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [paso, qrMesa]);

  // Copy to clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  // Submit transferencia
  const handleTransferencia = async () => {
    if (!comprobante && pedidoIds.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (comprobante) formData.append('file', comprobante);
      formData.append('pedidoId', pedidoIds[0] || '');
      formData.append('mesaZona', qrMesa?.mesaZona || '');
      formData.append('total', total.toString());
      formData.append('metodoPago', 'transferencia');

      const res = await fetch('/api/pagos/comprobante-upload', { method: 'POST', body: formData });
      if (res.ok) {
        setPaso('validando');
      }
    } catch { /* */ }
    finally { setUploading(false); }
  };

  // Submit efectivo
  const handleEfectivo = async () => {
    for (const id of pedidoIds) {
      await fetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodoPago: 'efectivo',
          estadoPago: 'esperando_mesero',
          observaciones: billete ? `[EFECTIVO] Paga con $${billete}` : '[EFECTIVO] Monto exacto',
        }),
      });
    }
    // También notificar al endpoint de pagos para que mesero lo vea
    for (const id of pedidoIds) {
      await fetch('/api/pagos/efectivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId: id }),
      });
    }
    setPaso('esperando_mesero');
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  // ═══════════════════════════════════════════════════════
  // RENDER: ESPERANDO (pedido no listo aún)
  // ═══════════════════════════════════════════════════════
  if (paso === 'esperando') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Pago no disponible aún</h2>
          <p className="text-sm text-gray-400 mb-4">
            {modalidad === 'DOMICILIO'
              ? 'Primero confirma tu pedido para poder pagar.'
              : 'Tu pedido aún está en preparación. Podrás pagar cuando esté listo para entregarte.'}
          </p>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Estado actual</p>
            <p className="text-sm text-brand-400 font-medium mt-1">
              {pedidoEstado === 'en_preparacion' ? '🔥 En preparación' :
               pedidoEstado === 'recibido' ? '📋 Recibido' :
               pedidoEstado === 'empacado' ? '📦 Empacado' :
               !confirmado ? '🛒 Pedido no confirmado' :
               '⏳ En proceso'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: COMPLETADO
  // ═══════════════════════════════════════════════════════
  if (paso === 'completado') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-scale-in">
          <span className="text-7xl block mb-5">🎉</span>
          <h1 className="text-2xl font-extrabold text-white mb-3">¡Pago Confirmado!</h1>
          <p className="text-sm text-gray-400 mb-6">Tu pago ha sido procesado exitosamente.</p>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 mb-4">
            <p className="text-green-400 text-sm font-medium">Total pagado: <span className="text-lg font-bold">{fmt(total)}</span></p>
          </div>
          <p className="text-xs text-gray-600">¡Gracias por tu preferencia!</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: ESPERANDO MESERO (cliente eligió efectivo)
  // ═══════════════════════════════════════════════════════
  if (paso === 'esperando_mesero') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          {/* Animated waiter icon */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-brand-500/15 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand-400/20 to-brand-500/20 border-2 border-brand-400/30 flex items-center justify-center">
              <span className="text-4xl animate-bounce" style={{ animationDuration: '2s' }}>🧑‍🍳</span>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-2">¡Listo!</h2>
          <p className="text-lg text-brand-400 font-semibold mb-4">
            {meseroNombre
              ? `${meseroNombre} irá a cobrar`
              : 'Tu mesero irá a cobrar'}
          </p>

          <div className="rounded-2xl bg-white/[0.03] border border-brand-400/20 p-5 mb-6">
            <p className="text-sm text-gray-300 leading-relaxed">
              Un mesero pasará a tu mesa a recoger el pago.
            </p>
            {billete && billete > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-gray-500">Pagas con: <span className="text-brand-400 font-bold">${billete}</span></p>
                {billete > total && (
                  <p className="text-xs text-gray-500">Cambio: <span className="text-green-400 font-bold">{fmt(billete - total)}</span></p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-green-500/5 border border-green-500/10 p-4 mb-4">
            <p className="text-sm font-bold text-green-400">Total: {fmt(total)}</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Esperando confirmación del mesero
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: VALIDANDO (transferencia - esperando que caja apruebe)
  // ═══════════════════════════════════════════════════════
  if (paso === 'validando') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-purple-500/15 rounded-full blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-400/20 to-purple-500/20 border-2 border-purple-400/30 flex items-center justify-center">
              <span className="text-3xl">🏦</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Verificando transferencia</h2>
          <p className="text-sm text-gray-400 mb-6">El equipo de caja está revisando tu comprobante. No cierres esta página.</p>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-purple-400 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: TRANSFERENCIA
  // ═══════════════════════════════════════════════════════
  if (paso === 'transferencia') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
        <div className="max-w-md mx-auto space-y-5 animate-fade-in">
          <button onClick={() => setPaso('seleccion')} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Cambiar método
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white">Transferencia Bancaria</h2>
            <p className="text-2xl font-black text-brand-400 mt-2">{fmt(total)}</p>
          </div>

          {/* Bank accounts with copy buttons */}
          <div className="space-y-3">
            {cuentas.length > 0 ? cuentas.map(c => (
              <div key={c.id} className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-4">
                <p className="text-xs font-bold text-brand-400 mb-3">{c.banco}</p>
                <div className="space-y-2">
                  <BankField label="Titular" value={c.titular} onCopy={handleCopy} copied={copied} />
                  <BankField label="CLABE" value={c.clabe} onCopy={handleCopy} copied={copied} mono />
                  {c.numero_tarjeta && <BankField label="Tarjeta" value={c.numero_tarjeta} onCopy={handleCopy} copied={copied} mono />}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-4 text-center">
                <p className="text-sm text-gray-500">No hay cuentas configuradas</p>
              </div>
            )}
          </div>

          {/* Upload comprobante */}
          <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white mb-3">Adjunta tu comprobante de pago</p>
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={e => setComprobante(e.target.files?.[0] || null)} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-brand-400/30 text-sm text-gray-400 hover:text-white transition-all">
              {comprobante ? `📎 ${comprobante.name}` : '📷 Tomar foto o seleccionar imagen'}
            </button>
          </div>

          <button
            onClick={handleTransferencia}
            disabled={!comprobante || uploading}
            className="w-full py-4 rounded-2xl font-bold text-sm text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
          >
            {uploading ? 'Enviando...' : '✓ Ya realicé la transferencia'}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: EFECTIVO
  // ═══════════════════════════════════════════════════════
  if (paso === 'efectivo') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
        <div className="max-w-md mx-auto space-y-5 animate-fade-in">
          <button onClick={() => setPaso('seleccion')} className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Cambiar método
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white">Pago en Efectivo</h2>
            <p className="text-2xl font-black text-green-400 mt-2">{fmt(total)}</p>
          </div>

          {/* For DOMICILIO: ask bill amount for change */}
          {modalidad === 'DOMICILIO' && (
            <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-4">
              <p className="text-xs font-semibold text-white mb-3">¿Con cuánto vas a pagar?</p>
              <p className="text-[10px] text-gray-500 mb-3">Para que el repartidor lleve cambio</p>
              <div className="grid grid-cols-2 gap-2">
                {[null, 100, 200, 500].map(monto => (
                  <button
                    key={monto ?? 'exacto'}
                    onClick={() => setBillete(monto)}
                    className={`p-3 rounded-xl text-sm font-medium border transition-all ${billete === monto ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'text-gray-400 border-white/[0.06] hover:bg-white/5'}`}
                  >
                    {monto === null ? '💰 Exacto' : `$${monto}`}
                  </button>
                ))}
              </div>
              {billete && billete >= total && (
                <p className="text-xs text-green-400 mt-2 text-center">Cambio: {fmt(billete - total)}</p>
              )}
            </div>
          )}

          {/* Confirmation message */}
          <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-4 text-center">
            <span className="text-3xl block mb-2">💵</span>
            <p className="text-sm text-gray-300">
              {modalidad === 'DOMICILIO'
                ? 'El repartidor cobrará al entregar tu pedido.'
                : modalidad === 'RETIRO'
                  ? 'Pasa a caja cuando te llamen para recoger tu pedido.'
                  : 'Tu mesero pasará a cobrar a tu mesa.'}
            </p>
          </div>

          <button
            onClick={handleEfectivo}
            className="w-full py-4 rounded-2xl font-bold text-sm text-black bg-gradient-to-r from-green-400 to-green-600 shadow-lg shadow-green-500/20 transition-all active:scale-[0.97]"
          >
            ✓ Confirmar pago en efectivo
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RENDER: SELECCIÓN DE MÉTODO
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
      <div className="max-w-md mx-auto space-y-6 animate-fade-in">
        <div className="text-center pt-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-white">¿Cómo deseas pagar?</h2>
          {qrMesa && <p className="text-xs text-gray-500 mt-1">{qrMesa.mesaZona}</p>}
          <p className="text-2xl font-black text-brand-400 mt-3">{fmt(total || carritoTotal)}</p>
        </div>

        {/* Transferencia */}
        <button
          onClick={() => setPaso('transferencia')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-[#12121a] border border-white/[0.06] hover:border-brand-400/30 hover:bg-brand-500/[0.03] transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
          <div className="text-left">
            <p className="text-base font-bold text-white">Transferencia</p>
            <p className="text-xs text-gray-500">CLABE o número de tarjeta — copia y pega</p>
          </div>
        </button>

        {/* Efectivo */}
        <button
          onClick={() => setPaso('efectivo')}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-[#12121a] border border-white/[0.06] hover:border-green-400/30 hover:bg-green-500/[0.03] transition-all group active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-all">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div className="text-left">
            <p className="text-base font-bold text-white">Efectivo</p>
            <p className="text-xs text-gray-500">
              {modalidad === 'DOMICILIO' ? 'Pagas al repartidor al recibir' :
               modalidad === 'RETIRO' ? 'Pagas en caja al recoger' :
               'Tu mesero cobra en tu mesa'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Bank Field Component with Copy
// ═══════════════════════════════════════════════════════
function BankField({ label, value, onCopy, copied, mono }: {
  label: string; value: string; onCopy: (text: string, label: string) => void; copied: string | null; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[9px] text-gray-600 uppercase">{label}</p>
        <p className={`text-xs text-white truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      <button
        onClick={() => onCopy(value, label)}
        className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
          copied === label ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
        }`}
      >
        {copied === label ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  );
}
