'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DireccionAutocomplete from '@/app/(cliente)/_components/DireccionAutocomplete';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
}

interface ItemSeleccionado {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  comentario: string;
}

/**
 * /mesero/domicilio — Captura de pedidos a domicilio (llegan por WhatsApp).
 * El mesero toma la orden, se envía a cocina, luego al repartidor,
 * y se genera un ticket WhatsApp para el cliente.
 */
export default function DomicilioCaptura() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemSeleccionado[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');

  // Client data
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{ numero: string; whatsappUrl: string } | null>(null);

  const fetchProductos = useCallback(async () => {
    try {
      const res = await fetch('/api/productos');
      if (res.ok) { const d = await res.json(); setProductos(d?.data ?? []); }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const agregarItem = (producto: Producto) => {
    setItems(prev => {
      const existing = prev.find(i => i.productoId === producto.id);
      if (existing) return prev.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, comentario: '' }];
    });
  };

  const quitarItem = (productoId: string) => {
    setItems(prev => {
      const existing = prev.find(i => i.productoId === productoId);
      if (!existing) return prev;
      if (existing.cantidad <= 1) return prev.filter(i => i.productoId !== productoId);
      return prev.map(i => i.productoId === productoId ? { ...i, cantidad: i.cantidad - 1 } : i);
    });
  };

  const actualizarComentario = (productoId: string, comentario: string) => {
    setItems(prev => prev.map(i => i.productoId === productoId ? { ...i, comentario } : i));
  };

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const handleEnviar = async () => {
    if (items.length === 0) { setError('Agrega al menos un producto'); return; }
    if (!nombreCliente.trim()) { setError('El nombre del cliente es obligatorio'); return; }
    if (!telefono.trim() || telefono.length < 10) { setError('Teléfono a 10 dígitos es obligatorio'); return; }
    if (!direccion.trim()) { setError('La dirección es obligatoria para domicilio'); return; }

    setEnviando(true); setError(null);

    try {
      const meseroNombre = localStorage.getItem('alaburguer-mesero-nombre') || '';
      const observaciones = `Dirección: ${direccion.trim()}${referencia.trim() ? ` (${referencia.trim()})` : ''}${notas.trim() ? ` | Notas: ${notas.trim()}` : ''}`;

      const payload = {
        nombre: nombreCliente.trim(),
        telefono: telefono.trim(),
        modalidad: 'domicilio',
        canal: 'QR_REDES',
        meseroNombre: meseroNombre || undefined,
        observaciones,
        items: items.map(i => ({
          productoId: i.productoId,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precio,
          comentario: i.comentario.trim() || undefined,
        })),
      };

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || 'Error al crear pedido');
      }

      const data = await res.json();
      const pedidoNumero = data?.data?.numero || 'PED';

      // Build WhatsApp ticket message
      const ticketLines = [
        `🧾 *A-la Burguer — Ticket de Pedido*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `📋 *Pedido:* #${pedidoNumero}`,
        `👤 *Cliente:* ${nombreCliente.trim()}`,
        `📍 *Dirección:* ${direccion.trim()}`,
        referencia.trim() ? `📌 *Referencia:* ${referencia.trim()}` : '',
        `━━━━━━━━━━━━━━━━━━━━`,
        `🍽️ *Tu pedido:*`,
        ...items.map(i => `   ${i.cantidad}x ${i.nombre} — $${(i.precio * i.cantidad).toFixed(0)}${i.comentario ? ` _(${i.comentario})_` : ''}`),
        `━━━━━━━━━━━━━━━━━━━━`,
        `💰 *Total: $${total.toFixed(0)}*`,
        ``,
        `⏱️ Tiempo estimado: 30-45 min`,
        `🛵 Tu pedido está siendo preparado`,
        ``,
        `¡Gracias por tu preferencia! 🙌`,
        `Para tu próximo pedido, usa nuestra app:`,
        `👉 https://wings-burgers-mocha.vercel.app/menu-domicilio`,
      ].filter(Boolean).join('\n');

      const whatsappUrl = `https://wa.me/52${telefono.trim()}?text=${encodeURIComponent(ticketLines)}`;

      setExito({ numero: pedidoNumero, whatsappUrl });
      setItems([]);
      setNombreCliente('');
      setTelefono('');
      setDireccion('');
      setReferencia('');
      setNotas('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setEnviando(false);
    }
  };

  const categorias = ['todas', ...new Set(productos.map(p => p.categoria))];
  const productosFiltrados = categoriaFiltro === 'todas' ? productos : productos.filter(p => p.categoria === categoriaFiltro);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-green-400 border-t-transparent rounded-full" />
    </div>
  );

  // Success — auto-redirect al panel después de mostrar confirmación
  if (exito) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">¡Pedido #{exito.numero} creado!</h2>
          <p className="text-sm text-gray-400 mb-6">Enviado a cocina. Lo verás en tu panel.</p>

          <a
            href={exito.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-2xl font-bold text-base text-white bg-[#25D366] hover:bg-[#20BA5C] shadow-lg shadow-[#25D366]/30 transition-all active:scale-[0.97] mb-4"
          >
            📱 Enviar Ticket al Cliente
          </a>

          <button
            onClick={() => router.push('/mesero')}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-brand-400 bg-brand-500/10 border border-brand-400/20 hover:bg-brand-500/20 transition-all active:scale-[0.97]"
          >
            ← Ver en mi panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Pedido a Domicilio</h1>
              <p className="text-xs text-gray-500">Orden recibida por WhatsApp</p>
            </div>
          </div>
          <button onClick={() => router.push('/mesero')} className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 bg-white/5 border border-white/[0.08] hover:text-white hover:bg-white/10 transition-all">
            ← Panel mesero
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products — scroll limitado en móvil */}
          <div className="lg:col-span-2 space-y-4 order-last lg:order-first">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {categorias.map(cat => (
                <button key={cat} onClick={() => setCategoriaFiltro(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium capitalize whitespace-nowrap transition-all ${categoriaFiltro === cat ? 'bg-green-500 text-black font-bold shadow-lg shadow-green-500/20' : 'bg-[#12121a] text-gray-400 border border-white/[0.06] hover:text-white hover:border-white/10'}`}>
                  {cat === 'todas' ? `Todas (${productos.length})` : cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {productosFiltrados.map(p => {
                const cant = items.find(i => i.productoId === p.id)?.cantidad || 0;
                return (
                  <div key={p.id} className={`rounded-2xl bg-[#12121a] border p-4 transition-all duration-200 ${cant > 0 ? 'border-green-400/30 bg-green-500/[0.03]' : 'border-white/[0.06] hover:border-white/10'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight">{p.nombre}</p>
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{p.descripcion}</p>
                      </div>
                      {cant > 0 && (
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-black text-xs font-bold flex items-center justify-center">{cant}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <span className="text-sm font-bold text-green-400">${p.precio}</span>
                      <div className="flex items-center gap-1.5">
                        {cant > 0 && (
                          <button onClick={() => quitarItem(p.id)} className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 text-sm font-bold flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all">−</button>
                        )}
                        <button onClick={() => agregarItem(p)} className="w-8 h-8 rounded-xl bg-green-500/10 text-green-400 text-sm font-bold flex items-center justify-center hover:bg-green-500/20 active:scale-95 transition-all">+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order form — aparece PRIMERO en móvil */}
          <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-5 sticky top-4 space-y-4 order-first lg:order-last">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Datos del Cliente
            </h3>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Nombre *</label>
              <input type="text" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Nombre completo"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp *</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="5512345678"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/30 font-mono transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Dirección completa *</label>
              <DireccionAutocomplete
                value={direccion}
                onChange={setDireccion}
                placeholder="Calle y número, ej: Hidalgo 108"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Referencia</label>
              <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Entre calles, color de casa..."
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Notas adicionales</label>
              <input type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Cambio de $500, tocar timbre..."
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-all" />
            </div>

            {/* Items with comments */}
            {items.length > 0 && (
              <div className="border-t border-white/[0.06] pt-4 space-y-2">
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">Pedido</label>
                {items.map(item => (
                  <div key={item.productoId} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white font-medium">{item.cantidad}× {item.nombre}</span>
                      <span className="text-green-400 font-bold">${item.precio * item.cantidad}</span>
                    </div>
                    <input type="text" value={item.comentario} onChange={e => actualizarComentario(item.productoId, e.target.value)}
                      placeholder="Instrucciones para cocina..." className="w-full px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-white placeholder:text-gray-700 focus:outline-none focus:border-green-400/30" />
                  </div>
                ))}
                <div className="flex justify-between pt-3 border-t border-white/[0.06]">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-xl font-black text-green-400">${total.toFixed(0)}</span>
                </div>
              </div>
            )}

            {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}

            <button onClick={handleEnviar} disabled={enviando || items.length === 0}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#25D366] hover:bg-[#20BA5C] shadow-lg shadow-[#25D366]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]">
              {enviando ? 'Enviando...' : items.length === 0 ? 'Agrega productos' : `✓ Crear Pedido + WhatsApp — $${total.toFixed(0)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
