'use client';

import { useState } from 'react';

// ========== Types ==========

type CanalEnvio = 'whatsapp' | 'email' | 'app';

interface ItemCuenta {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
}

interface ResumenCuenta {
  pedidoId: string;
  numero: string;
  clienteNombre: string;
  items: ItemCuenta[];
  subtotal: number;
  impuestos: number;
  total: number;
}

// ========== Component ==========

export default function CuentaPage() {
  // Estado de búsqueda
  const [numeroPedido, setNumeroPedido] = useState('');
  const [buscando, setBuscando] = useState(false);

  // Estado del resumen
  const [resumen, setResumen] = useState<ResumenCuenta | null>(null);

  // Estado de envío
  const [canalSeleccionado, setCanalSeleccionado] = useState<CanalEnvio | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [envioExitoso, setEnvioExitoso] = useState(false);

  // Estado de errores
  const [error, setError] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // ========== Buscar pedido y generar resumen ==========
  const buscarPedido = async () => {
    if (!numeroPedido.trim()) return;
    setBuscando(true);
    setError(null);
    setResumen(null);
    setEnvioExitoso(false);
    setErrorEnvio(null);
    setCanalSeleccionado(null);

    try {
      const res = await fetch(
        `/api/pedidos?numero=${encodeURIComponent(numeroPedido.trim())}`
      );
      if (!res.ok) throw new Error('Error al buscar pedido');

      const json = await res.json();
      const pedidos = json.data || [];

      if (pedidos.length === 0) {
        setError(`No se encontró el pedido #${numeroPedido.trim()}`);
        return;
      }

      const pedido = pedidos[0];

      // Construir resumen de cuenta
      const items: ItemCuenta[] = (pedido.items || []).map(
        (item: { nombre?: string; productoNombre?: string; cantidad: number; precioUnitario: number; precioTotal?: number }) => ({
          nombre: item.nombre || item.productoNombre || 'Producto',
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          precioTotal: item.precioTotal || item.precioUnitario * item.cantidad,
        })
      );

      const subtotal = items.reduce((sum, i) => sum + i.precioTotal, 0);
      const impuestos = pedido.impuestos || subtotal * 0.16;
      const total = pedido.total || subtotal + impuestos;

      setResumen({
        pedidoId: pedido.id,
        numero: pedido.numero,
        clienteNombre: pedido.clienteNombre || pedido.nombre || 'Cliente',
        items,
        subtotal,
        impuestos,
        total,
      });
    } catch {
      setError('Error al buscar el pedido. Verifica el número e intenta de nuevo.');
    } finally {
      setBuscando(false);
    }
  };

  // ========== Enviar cuenta ==========
  const enviarCuenta = async (canal?: CanalEnvio) => {
    const canalAUsar = canal || canalSeleccionado;
    if (!resumen || !canalAUsar) return;

    setEnviando(true);
    setErrorEnvio(null);
    setEnvioExitoso(false);
    setCanalSeleccionado(canalAUsar);

    try {
      // Timeout de 30 segundos según Req 9.2, 9.3, 9.4
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch('/api/cuenta/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId: resumen.pedidoId,
          canal: canalAUsar,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const code = json?.error?.code;
        const mensajeError = json?.error?.message;

        // Req 9.5: Client lacks required contact data for the selected channel
        if (code === 'CONTACTO_FALTANTE' || (res.status === 422 && mensajeError)) {
          const datoFaltante =
            canalAUsar === 'whatsapp'
              ? 'número de teléfono'
              : canalAUsar === 'email'
              ? 'correo electrónico'
              : 'cuenta en la app';
          throw new Error(
            mensajeError ||
            `El cliente no tiene registrado ${datoFaltante}. Puedes cambiar el canal de envío o registrar el dato de contacto del cliente.`
          );
        }

        throw new Error(
          mensajeError || `Error al enviar la cuenta por ${canalAUsar}`
        );
      }

      setEnvioExitoso(true);
      setErrorEnvio(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorEnvio(
          'El envío excedió el tiempo de espera (30s). Puedes reintentar o cambiar el canal de envío.'
        );
      } else {
        setErrorEnvio(
          err instanceof Error ? err.message : 'Error al enviar la cuenta'
        );
      }
      setEnvioExitoso(false);
    } finally {
      setEnviando(false);
    }
  };

  const reintentarEnvio = () => {
    if (canalSeleccionado) {
      enviarCuenta(canalSeleccionado);
    }
  };

  const cambiarCanal = () => {
    setErrorEnvio(null);
    setCanalSeleccionado(null);
    setEnvioExitoso(false);
  };

  // ========== Render ==========
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-wood-800 mb-6">Envío de Cuenta</h2>

      {/* Búsqueda de pedido */}
      <div className="bg-white rounded-xl border border-wood-200 p-6 shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-wood-700 mb-3">
          Buscar pedido para generar cuenta
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Número de pedido"
            value={numeroPedido}
            onChange={(e) => setNumeroPedido(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPedido()}
            className="flex-1 px-3 py-2 rounded-lg border border-wood-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            aria-label="Número de pedido para generar cuenta"
          />
          <button
            onClick={buscarPedido}
            disabled={buscando || !numeroPedido.trim()}
            className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {buscando ? 'Buscando...' : 'Generar cuenta'}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-fire-50 border border-fire-300 text-fire-800 text-sm" role="alert">
            {error}
          </div>
        )}
      </div>

      {/* Resumen de cuenta */}
      {resumen && (
        <div className="bg-white rounded-xl border border-wood-200 shadow-sm overflow-hidden mb-6">
          {/* Encabezado */}
          <div className="bg-wood-800 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-golden-300">Wings & Burgers</h3>
                <p className="text-wood-300 text-sm mt-1">Cuenta #{resumen.numero}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-wood-300">Cliente</p>
                <p className="font-medium">{resumen.clienteNombre}</p>
              </div>
            </div>
          </div>

          {/* Tabla de items */}
          <div className="p-6">
            <table className="w-full text-sm" aria-label="Detalle de la cuenta">
              <thead>
                <tr className="border-b border-wood-200">
                  <th className="text-left py-2 text-wood-600 font-medium">Producto</th>
                  <th className="text-center py-2 text-wood-600 font-medium">Cant.</th>
                  <th className="text-right py-2 text-wood-600 font-medium">P. Unit.</th>
                  <th className="text-right py-2 text-wood-600 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumen.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-wood-100">
                    <td className="py-2 text-wood-800">{item.nombre}</td>
                    <td className="py-2 text-center text-wood-600">{item.cantidad}</td>
                    <td className="py-2 text-right text-wood-600">
                      ${item.precioUnitario.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-wood-800 font-medium">
                      ${item.precioTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="mt-4 pt-4 border-t border-wood-200 space-y-2">
              <div className="flex justify-between text-sm text-wood-600">
                <span>Subtotal</span>
                <span>${resumen.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-wood-600">
                <span>Impuestos (IVA)</span>
                <span>${resumen.impuestos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-wood-800 pt-2 border-t border-wood-200">
                <span>Total a pagar</span>
                <span className="text-brand-700">${resumen.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Canales de envío */}
          <div className="p-6 border-t border-wood-200 bg-wood-50">
            <h4 className="text-sm font-semibold text-wood-700 mb-3">Enviar cuenta al cliente</h4>

            {!envioExitoso && !errorEnvio && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => enviarCuenta('whatsapp')}
                  disabled={enviando}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-green-300 bg-green-50 text-green-800 font-medium text-sm hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {enviando && canalSeleccionado === 'whatsapp' ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="text-lg">📱</span>
                  )}
                  WhatsApp
                </button>
                <button
                  onClick={() => enviarCuenta('email')}
                  disabled={enviando}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-brand-300 bg-brand-50 text-brand-800 font-medium text-sm hover:bg-brand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {enviando && canalSeleccionado === 'email' ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="text-lg">✉️</span>
                  )}
                  Correo
                </button>
                <button
                  onClick={() => enviarCuenta('app')}
                  disabled={enviando}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-golden-300 bg-golden-50 text-golden-800 font-medium text-sm hover:bg-golden-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {enviando && canalSeleccionado === 'app' ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="text-lg">🔔</span>
                  )}
                  Notificación App
                </button>
              </div>
            )}

            {/* Éxito de envío */}
            {envioExitoso && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm flex items-center gap-3" role="status">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium">Cuenta enviada exitosamente</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Enviada por {canalSeleccionado === 'whatsapp' ? 'WhatsApp' : canalSeleccionado === 'email' ? 'correo electrónico' : 'notificación en la app'}
                  </p>
                </div>
                <button
                  onClick={cambiarCanal}
                  className="text-xs underline text-green-700 hover:text-green-900"
                >
                  Enviar por otro canal
                </button>
              </div>
            )}

            {/* Error de envío con opciones de reintentar o cambiar canal */}
            {errorEnvio && (
              <div className="p-4 rounded-lg bg-fire-50 border border-fire-300 text-fire-800 text-sm" role="alert">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">Error al enviar la cuenta</p>
                    <p className="text-xs text-fire-600 mt-0.5">{errorEnvio}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={reintentarEnvio}
                    disabled={enviando}
                    className="px-4 py-2 bg-fire-600 text-white rounded-lg text-xs font-medium hover:bg-fire-700 disabled:opacity-50 transition-colors"
                  >
                    {enviando ? 'Reintentando...' : 'Reintentar envío'}
                  </button>
                  <button
                    onClick={cambiarCanal}
                    className="px-4 py-2 bg-white text-wood-700 border border-wood-300 rounded-lg text-xs font-medium hover:bg-wood-50 transition-colors"
                  >
                    Cambiar canal de envío
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {!resumen && !error && (
        <div className="bg-white rounded-xl border border-wood-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🧾</span>
          </div>
          <p className="text-wood-600 text-sm">
            Ingresa el número de pedido para generar y enviar la cuenta al cliente
          </p>
        </div>
      )}
    </div>
  );
}
