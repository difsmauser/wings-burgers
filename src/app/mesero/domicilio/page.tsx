'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

  // Success — show ticket + WhatsApp link
  if (exito) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-scale-in">
          <span className="text-6xl block mb-4">✅</span>
          <h2 className="text-xl font-bold text-white mb-2">¡Pedido #{exito.numero} creado!</h2>
          <p className="text-sm text-gray-400 mb-6">Enviado a cocina. Envía el ticket al cliente por WhatsApp:</p>

          <a
            href={exito.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-2xl font-bold text-base text-white bg-[#25D366] hover:bg-[#20BA5C] shadow-lg shadow-[#25D366]/30 transition-all active:scale-[0.97] mb-4"
          >
            📱 Enviar Ticket por WhatsApp
          </a>

          <button
            onClick={() => setExito(null)}
            className="w-full py-3 rounded-xl text-sm font-medium text-brand-400 bg-brand-500/5 border border-brand-400/20 hover:bg-brand-500/10 transition-all"
          >
            📝 Tomar otro pedido a domicilio
          </button>

          <button
            onClick={() => router.push('/mesero')}
            className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-white transition-colors"
          >
            ← Volver al panel
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
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🛵</span> Pedido a Domicilio
            </h1>
            <p className="text-sm text-gray-500 mt-1">Captura de pedido recibido por WhatsApp</p>
          </div>
          <button onClick={() => router.push('/mesero')} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all">
            ← Panel mesero
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {categorias.map(cat => (
                <button key={cat} onClick={() => setCategoriaFiltro(cat)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${categoriaFiltro === cat ? 'bg-green-500 text-black font-bold' : 'bg-[#16161f] text-gray-400 border border-white/5'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {productosFiltrados.map(p => {
                const cant = items.find(i => i.productoId === p.id)?.cantidad || 0;
                return (
                  <div key={p.id} className={`rounded-xl bg-[#16161f] border p-3 transition-all ${cant > 0 ? 'border-green-400/30' : 'border-white/5'}`}>
                    <p className="text-sm font-medium text-white line-clamp-1 mb-1">{p.nombre}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-green-400">${p.precio}</span>
                      <div className="flex items-center gap-2">
                        {cant > 0 && (
                          <>
                            <button onClick={() => quitarItem(p.id)} className="w-6 h-6 rounded-full bg-red-500/10 text-red-400 text-xs flex items-center justify-center">−</button>
                            <span className="text-xs font-bold text-white">{cant}</span>
                          </>
                        )}
                        <button onClick={() => agregarItem(p)} className="w-6 h-6 rounded-full bg-green-500/10 text-green-400 text-xs flex items-center justify-center">+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order form */}
          <div className="rounded-xl bg-[#16161f] border border-white/5 p-4 sticky top-4 space-y-3">
            <h3 className="text-sm font-bold text-white mb-2">📱 Datos del Cliente</h3>

            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Nombre *</label>
              <input type="text" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Nombre completo"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">WhatsApp *</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="5512345678"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 font-mono" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Dirección completa *</label>
              <textarea value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Calle, número, colonia..." rows={2}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50 resize-none" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Referencia</label>
              <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Entre calles, color de casa..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Notas adicionales</label>
              <input type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="Cambio de $500, tocar timbre..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-green-500/50" />
            </div>

            {/* Items with comments */}
            {items.length > 0 && (
              <div className="border-t border-white/5 pt-3 space-y-2">
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider">Pedido</label>
                {items.map(item => (
                  <div key={item.productoId} className="rounded-lg bg-white/[0.02] border border-white/5 p-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white">{item.cantidad}x {item.nombre}</span>
                      <span className="text-green-400 font-bold">${item.precio * item.cantidad}</span>
                    </div>
                    <input type="text" value={item.comentario} onChange={e => actualizarComentario(item.productoId, e.target.value)}
                      placeholder="Instrucciones..." className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white placeholder:text-gray-700 focus:outline-none focus:border-green-400/30" />
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-lg font-black text-green-400">${total.toFixed(0)}</span>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button onClick={handleEnviar} disabled={enviando || items.length === 0}
              className="w-full py-3 rounded-xl font-bold text-sm text-black bg-[#25D366] hover:bg-[#20BA5C] shadow-lg disabled:opacity-50 transition-all active:scale-[0.97]">
              {enviando ? 'Enviando...' : `✓ Crear Pedido + Enviar WhatsApp — $${total.toFixed(0)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
