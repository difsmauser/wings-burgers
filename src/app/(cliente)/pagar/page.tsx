'use client';

import { useState, useEffect, useRef } from 'react';
import { useQrMesa } from '../_context/QrMesaContext';
import confetti from 'canvas-confetti';

interface CuentaBancaria {
  id: string;
  banco: string;
  titular: string;
  clabe: string;
  numero_tarjeta: string | null;
  referencia: string | null;
}

type PasosPago = 'seleccion' | 'transferencia' | 'efectivo' | 'validando' | 'completado';

export default function PagarPage() {
  const { qrMesa } = useQrMesa();
  const [paso, setPaso] = useState<PasosPago>('seleccion');
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [total, setTotal] = useState(0);
  const [pedidoIds, setPedidoIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load mesa orders to get total
  useEffect(() => {
    if (!qrMesa) return;
    const fetchTotal = async () => {
      const res = await fetch(`/api/pedidos/mesa?mesaZona=${encodeURIComponent(qrMesa.mesaZona)}`);
      if (res.ok) {
        const json = await res.json();
        const activos = (json.data || []).filter((p: { estadoPago?: string }) => p.estadoPago !== 'pagado');
        setTotal(activos.reduce((s: number, p: { total: number }) => s + p.total, 0));
        setPedidoIds(activos.map((p: { id: string }) => p.id));
      }
    };
    fetchTotal();
  }, [qrMesa]);

  // Load bank accounts
  useEffect(() => {
    fetch('/api/cuentas-bancarias')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setCuentas(j.data || []))
      .catch(() => {});
  }, []);

  // Poll for payment validation
  useEffect(() => {
    if (paso !== 'validando') return;
    const interval = setInterval(async () => {
      if (!qrMesa) return;
      const res = await fetch(`/api/pedidos/mesa?mesaZona=${encodeURIComponent(qrMesa.mesaZona)}`);
      if (res.ok) {
        const json = await res.json();
        const activos = (json.data || []).filter((p: { estadoPago?: string }) => p.estadoPago !== 'pagado');
        if (activos.length === 0 || activos.every((p: { estadoPago?: string }) => p.estadoPago === 'pagado')) {
          setPaso('completado');
          triggerCelebration();
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [paso, qrMesa]);

  const triggerCelebration = () => {
    if (typeof window !== 'undefined' && confetti) {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 120, origin: { y: 0.4 } }), 500);
      setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }), 1000);
    }
  };

  const handleTransferencia = async () => {
    if (!comprobante) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', comprobante);
      formData.append('pedidoId', pedidoIds[0] || '');
      formData.append('mesaZona', qrMesa?.mesaZona || '');
      formData.append('total', total.toString());
      formData.append('metodoPago', 'transferencia');

      const res = await fetch('/api/pagos/comprobante-upload', { method: 'POST', body: formData });
      if (res.ok) {
        // Mark all pedidos as validando
        for (const id of pedidoIds) {
          await fetch(`/api/pedidos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estadoPago: 'validando', metodoPago: 'transferencia' }),
          });
        }
        setPaso('validando');
      }
    } catch { /* */ }
    finally { setUploading(false); }
  };

  const handleEfectivo = async () => {
    // Mark pedidos as pendiente cobro efectivo and notify mesero
    for (const id of pedidoIds) {
      await fetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodoPago: 'efectivo', estadoPago: 'esperando_mesero' }),
      });
    }
    setPaso('validando');
  };

  const formatPrecio = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  // ========== COMPLETADO ==========
  if (paso === 'completado') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-scale-in">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/10 rounded-full blur-[80px] animate-pulse" />
            <span className="relative text-8xl block mb-6">🎉</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">¡Pago Confirmado!</h1>
          <p className="text-gray-400 mb-2">Tu pago ha sido procesado exitosamente.</p>
          <p className="text-gray-500 text-sm mb-8">Puedes proceder a abandonar la mesa. ¡Gracias por tu preferencia!</p>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 mb-6">
            <p className="text-green-400 text-sm font-medium">Total pagado: <span className="text-lg font-bold">{formatPrecio(total)}</span></p>
          </div>
          <p className="text-xs text-gray-600">Tu mesa se ha liberado automáticamente</p>
        </div>
      </div>
    );
  }

  // ========== VALIDANDO ==========
  if (paso === 'validando') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-pulse mb-6">
            <span className="text-6xl block">⏳</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Validando tu pago...</h2>
          <p className="text-gray-400 text-sm mb-6">Dame unos minutos mientras confirmamos tu pago. No cierres esta página.</p>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-brand-400 rounded-full animate-[pulse_2s_ease-in-out_infinite] w-2/3" />
          </div>
          <p className="text-[10px] text-gray-600 mt-4">Actualizando cada 5 segundos...</p>
        </div>
      </div>
    );
  }

  // ========== TRANSFERENCIA ==========
  if (paso === 'transferencia') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
        <div className="max-w-md mx-auto space-y-6 animate-fade-in">
          <button onClick={() => setPaso('seleccion')} className="text-xs text-gray-400 hover:text-white transition-colors">← Volver</button>
          
          <div className="text-center">
            <span className="text-4xl block mb-2">📱</span>
            <h2 className="text-xl font-bold text-white">Pago por Transferencia</h2>
            <p className="text-sm text-gray-400 mt-1">Transfiere a cualquiera de estas cuentas</p>
            <p className="text-2xl font-extrabold text-brand-400 mt-3">{formatPrecio(total)}</p>
          </div>

          {/* Bank accounts */}
          <div className="space-y-3">
            {cuentas.map(c => (
              <div key={c.id} className="rounded-xl bg-[#16161f] border border-white/5 p-4">
                <p className="text-xs font-bold text-brand-400 mb-2">{c.banco}</p>
                <div className="space-y-1 text-xs">
                  <p className="text-gray-400">Titular: <span className="text-white">{c.titular}</span></p>
                  <p className="text-gray-400">CLABE: <span className="text-white font-mono select-all">{c.clabe}</span></p>
                  {c.numero_tarjeta && <p className="text-gray-400">Tarjeta: <span className="text-white font-mono select-all">{c.numero_tarjeta}</span></p>}
                  {c.referencia && <p className="text-gray-400">Concepto: <span className="text-white">{c.referencia}</span></p>}
                </div>
              </div>
            ))}
            {cuentas.length === 0 && (
              <p className="text-center text-gray-500 text-sm">No hay cuentas configuradas. Contacta al personal.</p>
            )}
          </div>

          {/* Upload comprobante */}
          <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
            <p className="text-xs font-bold text-white mb-3">Adjunta tu comprobante de pago</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={e => setComprobante(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 hover:border-brand-400/30 text-sm text-gray-400 hover:text-white transition-all"
            >
              {comprobante ? `📎 ${comprobante.name}` : '📷 Tomar foto o seleccionar imagen'}
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={handleTransferencia}
            disabled={!comprobante || uploading}
            className="w-full py-4 rounded-2xl font-bold text-base text-black bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
          >
            {uploading ? 'Enviando...' : '✓ Ya realicé la transferencia'}
          </button>
        </div>
      </div>
    );
  }

  // ========== EFECTIVO ==========
  if (paso === 'efectivo') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
        <div className="max-w-md mx-auto space-y-6 animate-fade-in text-center">
          <button onClick={() => setPaso('seleccion')} className="text-xs text-gray-400 hover:text-white transition-colors block text-left">← Volver</button>
          <span className="text-5xl block">💵</span>
          <h2 className="text-xl font-bold text-white">Pago en Efectivo</h2>
          <p className="text-2xl font-extrabold text-brand-400">{formatPrecio(total)}</p>
          <p className="text-sm text-gray-400">Un mesero irá a tu mesa a recoger el pago. Ten listo tu efectivo.</p>
          
          <button
            onClick={handleEfectivo}
            className="w-full py-4 rounded-2xl font-bold text-base text-black bg-gradient-to-r from-green-400 to-green-500 shadow-xl transition-all active:scale-[0.97]"
          >
            💵 Solicitar mesero para cobro
          </button>
        </div>
      </div>
    );
  }

  // ========== SELECCIÓN DE MÉTODO ==========
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <span className="text-5xl block mb-3">💳</span>
          <h2 className="text-xl font-bold text-white">¿Cómo deseas pagar?</h2>
          <p className="text-sm text-gray-400 mt-1">{qrMesa?.mesaZona || 'Tu mesa'}</p>
          <p className="text-3xl font-extrabold text-brand-400 mt-4">{formatPrecio(total)}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setPaso('transferencia')}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-blue-400/30 hover:bg-blue-500/5 transition-all group active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center group-hover:scale-110 transition-all">
              <span className="text-2xl">📱</span>
            </div>
            <div className="text-left flex-1">
              <p className="text-base font-bold text-white">Transferencia</p>
              <p className="text-xs text-gray-500">CLABE o número de tarjeta</p>
            </div>
          </button>

          <button
            onClick={() => setPaso('efectivo')}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-green-400/30 hover:bg-green-500/5 transition-all group active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-400/20 flex items-center justify-center group-hover:scale-110 transition-all">
              <span className="text-2xl">💵</span>
            </div>
            <div className="text-left flex-1">
              <p className="text-base font-bold text-white">Efectivo</p>
              <p className="text-xs text-gray-500">Un mesero irá a tu mesa</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
