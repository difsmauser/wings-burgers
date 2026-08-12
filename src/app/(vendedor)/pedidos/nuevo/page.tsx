'use client';

import { useState, useEffect, useCallback } from 'react';

// ========== Types ==========

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  imagenUrl: string | null;
  activo: boolean;
}

interface ItemPedido {
  productoId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
}

type ModalidadServicio = 'local' | 'retiro' | 'domicilio';

interface PedidoExistente {
  id: string;
  numero: string;
  estado: string;
  modalidad: ModalidadServicio;
  items: ItemPedido[];
  total: number;
  clienteNombre?: string;
}

// ========== Component ==========

export default function NuevoPedidoPage() {
  // Estado del catálogo
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [cargandoProductos, setCargandoProductos] = useState(true);

  // Estado del pedido actual
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [modalidad, setModalidad] = useState<ModalidadServicio | null>(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');

  // Estado para búsqueda de pedido existente
  const [busquedaPedido, setBusquedaPedido] = useState('');
  const [pedidoExistente, setPedidoExistente] = useState<PedidoExistente | null>(null);
  const [modoAgregar, setModoAgregar] = useState(false);

  // Estado general
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [buscandoPedido, setBuscandoPedido] = useState(false);

  // ========== Cargar catálogo ==========
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setCargandoProductos(true);
    try {
      const res = await fetch('/api/productos');
      if (!res.ok) throw new Error('Error al cargar productos');
      const json = await res.json();
      setProductos(json.data || []);
    } catch {
      setError('No se pudo cargar el catálogo de productos');
    } finally {
      setCargandoProductos(false);
    }
  };

  // ========== Filtrado de productos ==========
  const productosFiltrados = productos.filter((p) => {
    const matchCategoria = categoriaFiltro === 'todos' || p.categoria === categoriaFiltro;
    const matchBusqueda =
      busquedaProducto === '' ||
      p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase());
    return matchCategoria && matchBusqueda && p.activo;
  });

  const categorias = ['todos', ...new Set(productos.map((p) => p.categoria))];

  // ========== Gestión del pedido ==========
  const agregarProducto = useCallback((producto: Producto) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.productoId === producto.id);
      if (existente) {
        // Product already in cart — increment quantity
        return prev.map((i) =>
          i.productoId === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      // New product — check 50-item limit (Req 7.1)
      if (prev.length >= 50) {
        setError('Se alcanzó el límite máximo de 50 productos por pedido');
        return prev;
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precioUnitario: producto.precio,
          cantidad: 1,
        },
      ];
    });
    setError(null);
  }, []);

  const modificarCantidad = (productoId: string, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setItems((prev) => prev.filter((i) => i.productoId !== productoId));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.productoId === productoId ? { ...i, cantidad: nuevaCantidad } : i
        )
      );
    }
  };

  const eliminarItem = (productoId: string) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
  };

  const total = items.reduce((sum, i) => sum + i.precioUnitario * i.cantidad, 0);

  // ========== Buscar pedido existente ==========
  const buscarPedidoExistente = async () => {
    if (!busquedaPedido.trim()) return;
    setBuscandoPedido(true);
    setError(null);
    try {
      const res = await fetch(`/api/pedidos?numero=${encodeURIComponent(busquedaPedido.trim())}`);
      if (!res.ok) throw new Error('Error al buscar pedido');
      const json = await res.json();
      const pedidos = json.data || [];
      if (pedidos.length === 0) {
        setError(`No se encontró el pedido #${busquedaPedido.trim()}`);
        setPedidoExistente(null);
      } else {
        setPedidoExistente(pedidos[0]);
        setModoAgregar(true);
        setItems(pedidos[0].items || []);
        setModalidad(pedidos[0].modalidad || null);
      }
    } catch {
      setError('Error al buscar el pedido. Verifica el número e intenta de nuevo.');
    } finally {
      setBuscandoPedido(false);
    }
  };

  // ========== Confirmar pedido ==========
  const confirmarPedido = async () => {
    setError(null);
    setExito(null);

    if (items.length === 0) {
      setError('Agrega al menos un producto al pedido');
      return;
    }

    if (!modalidad) {
      setError('Selecciona la modalidad de servicio (local o domicilio)');
      return;
    }

    if (!modoAgregar && (!clienteNombre.trim() || !clienteTelefono.trim())) {
      setError('El nombre y teléfono del cliente son obligatorios');
      return;
    }

    setEnviando(true);
    try {
      if (modoAgregar && pedidoExistente) {
        // Agregar productos a pedido existente
        const nuevosItems = items.filter(
          (item) =>
            !pedidoExistente.items?.find(
              (ei) =>
                ei.productoId === item.productoId &&
                ei.cantidad === item.cantidad
            )
        );
        for (const item of nuevosItems) {
          await fetch(`/api/pedidos/${pedidoExistente.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productoId: item.productoId,
              cantidad: item.cantidad,
            }),
          });
        }
        setExito(`Productos agregados al pedido #${pedidoExistente.numero}`);
      } else {
        // Crear nuevo pedido
        const res = await fetch('/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: clienteNombre.trim(),
            telefono: clienteTelefono.trim(),
            modalidad,
            items: items.map((i) => ({
              productoId: i.productoId,
              cantidad: i.cantidad,
            })),
          }),
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => null);
          throw new Error(
            errorJson?.error?.message || 'Error al crear el pedido'
          );
        }

        const json = await res.json();
        setExito(`Pedido #${json.data?.numero || ''} creado exitosamente`);
      }

      // Limpiar formulario
      resetFormulario();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  const resetFormulario = () => {
    setItems([]);
    setModalidad(null);
    setClienteNombre('');
    setClienteTelefono('');
    setPedidoExistente(null);
    setModoAgregar(false);
    setBusquedaPedido('');
  };

  // ========== Render ==========
  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-wood-800 mb-6">Captura de Pedido</h2>

      {/* Mensajes de estado */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-fire-50 border border-fire-300 text-fire-800 text-sm flex items-center gap-2" role="alert">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:bg-fire-100 rounded" aria-label="Cerrar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {exito && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-300 text-green-800 text-sm flex items-center gap-2" role="status">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{exito}</span>
          <button onClick={() => setExito(null)} className="ml-auto p-0.5 hover:bg-green-100 rounded" aria-label="Cerrar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Búsqueda de pedido existente */}
      <div className="bg-white rounded-xl border border-wood-200 p-4 mb-6 shadow-sm">
        <h3 className="text-sm font-semibold text-wood-700 mb-3">Agregar a pedido existente</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Número de pedido"
            value={busquedaPedido}
            onChange={(e) => setBusquedaPedido(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarPedidoExistente()}
            className="flex-1 px-3 py-2 rounded-lg border border-wood-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            aria-label="Número de pedido a buscar"
          />
          <button
            onClick={buscarPedidoExistente}
            disabled={buscandoPedido || !busquedaPedido.trim()}
            className="px-4 py-2 bg-wood-100 text-wood-800 border border-wood-300 rounded-lg text-sm font-medium hover:bg-wood-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {buscandoPedido ? 'Buscando...' : 'Buscar'}
          </button>
          {modoAgregar && (
            <button
              onClick={resetFormulario}
              className="px-4 py-2 bg-fire-50 text-fire-700 border border-fire-200 rounded-lg text-sm font-medium hover:bg-fire-100 transition-colors"
            >
              Nuevo pedido
            </button>
          )}
        </div>
        {pedidoExistente && (
          <div className="mt-3 p-2 bg-brand-50 border border-brand-200 rounded-lg text-sm text-brand-800">
            Editando pedido <strong>#{pedidoExistente.numero}</strong> — {pedidoExistente.estado}
            {pedidoExistente.clienteNombre && ` — ${pedidoExistente.clienteNombre}`}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Catálogo */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-wood-200 shadow-sm">
            {/* Filtros */}
            <div className="p-4 border-b border-wood-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-wood-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                  aria-label="Buscar producto por nombre"
                />
                <div className="flex gap-1 flex-wrap">
                  {categorias.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoriaFiltro(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        categoriaFiltro === cat
                          ? 'bg-brand-600 text-white'
                          : 'bg-wood-100 text-wood-700 hover:bg-wood-200'
                      }`}
                    >
                      {cat === 'todos' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grid de productos */}
            <div className="p-4">
              {cargandoProductos ? (
                <div className="text-center py-8 text-wood-500">Cargando catálogo...</div>
              ) : productosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-wood-500">No se encontraron productos</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {productosFiltrados.map((producto) => (
                    <button
                      key={producto.id}
                      onClick={() => agregarProducto(producto)}
                      className="flex flex-col items-center p-3 rounded-xl border border-wood-200 hover:border-brand-400 hover:shadow-md transition-all text-center group"
                      aria-label={`Agregar ${producto.nombre} - $${producto.precio.toFixed(2)}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mb-2 group-hover:bg-brand-200 transition-colors">
                        {producto.imagenUrl ? (
                          <img
                            src={producto.imagenUrl}
                            alt={producto.nombre}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">🍔</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-wood-800 line-clamp-2">
                        {producto.nombre}
                      </span>
                      <span className="text-xs text-brand-700 font-bold mt-1">
                        ${producto.precio.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: Resumen del pedido */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-wood-200 shadow-sm sticky top-4">
            <div className="p-4 border-b border-wood-100">
              <h3 className="font-semibold text-wood-800">
                {modoAgregar ? `Pedido #${pedidoExistente?.numero}` : 'Nuevo Pedido'}
              </h3>
            </div>

            {/* Items del pedido */}
            <div className="p-4 max-h-64 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-wood-400 text-center py-4">
                  Selecciona productos del catálogo
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.productoId} className="flex items-center gap-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-wood-800 truncate font-medium">{item.nombre}</p>
                        <p className="text-wood-500 text-xs">
                          ${item.precioUnitario.toFixed(2)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => modificarCantidad(item.productoId, item.cantidad - 1)}
                          className="w-6 h-6 rounded-full bg-wood-100 text-wood-700 hover:bg-wood-200 flex items-center justify-center text-sm font-bold transition-colors"
                          aria-label={`Reducir cantidad de ${item.nombre}`}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
                        <button
                          onClick={() => modificarCantidad(item.productoId, item.cantidad + 1)}
                          className="w-6 h-6 rounded-full bg-wood-100 text-wood-700 hover:bg-wood-200 flex items-center justify-center text-sm font-bold transition-colors"
                          aria-label={`Aumentar cantidad de ${item.nombre}`}
                        >
                          +
                        </button>
                        <button
                          onClick={() => eliminarItem(item.productoId)}
                          className="w-6 h-6 rounded-full bg-fire-50 text-fire-600 hover:bg-fire-100 flex items-center justify-center ml-1 transition-colors"
                          aria-label={`Eliminar ${item.nombre}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Total */}
            <div className="px-4 py-3 border-t border-wood-100 bg-wood-50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-wood-600">Total</span>
                <span className="text-lg font-bold text-brand-700">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Modalidad de servicio */}
            <div className="p-4 border-t border-wood-100">
              <label className="block text-sm font-medium text-wood-700 mb-2">
                Modalidad de servicio
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setModalidad('local')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    modalidad === 'local'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-wood-700 border-wood-300 hover:bg-wood-50'
                  }`}
                >
                  Local
                </button>
                <button
                  onClick={() => setModalidad('domicilio')}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    modalidad === 'domicilio'
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-wood-700 border-wood-300 hover:bg-wood-50'
                  }`}
                >
                  Domicilio
                </button>
              </div>
            </div>

            {/* Datos del cliente (solo para nuevo pedido) */}
            {!modoAgregar && (
              <div className="p-4 border-t border-wood-100 space-y-3">
                <label className="block text-sm font-medium text-wood-700">Datos del cliente</label>
                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-wood-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                  aria-label="Nombre del cliente"
                />
                <input
                  type="tel"
                  placeholder="Teléfono (10 dígitos)"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  maxLength={10}
                  className="w-full px-3 py-2 rounded-lg border border-wood-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                  aria-label="Teléfono del cliente"
                />
              </div>
            )}

            {/* Botón confirmar */}
            <div className="p-4 border-t border-wood-100">
              <button
                onClick={confirmarPedido}
                disabled={enviando || items.length === 0}
                className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {enviando ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Procesando...
                  </>
                ) : modoAgregar ? (
                  'Agregar productos'
                ) : (
                  'Confirmar pedido'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
