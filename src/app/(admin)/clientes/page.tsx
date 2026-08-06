'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Table, Modal } from '../_components';

// Types
interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  direccion?: string;
  correo?: string;
  creadoEn: string;
  actualizadoEn: string;
  totalPedidos?: number;
  montoTotal?: number;
}

interface Pedido {
  id: string;
  numero: string;
  estado: string;
  total: number;
  items: ItemPedido[];
  creadoEn: string;
}

interface ItemPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

interface PedidoPaginado {
  datos: Pedido[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

interface Filtros {
  nombre: string;
  pedidosMinimos: string;
  montoTotalMin: string;
}

const ITEMS_POR_PAGINA = 50;

export default function ClientesPage() {
  // State
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filtros, setFiltros] = useState<Filtros>({
    nombre: '',
    pedidosMinimos: '',
    montoTotalMin: '',
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>({
    nombre: '',
    pedidosMinimos: '',
    montoTotalMin: '',
  });

  // Detail modal
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [pedidos, setPedidos] = useState<PedidoPaginado | null>(null);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);

  // Fetch clients
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();

      if (filtrosAplicados.nombre.trim()) {
        params.set('nombre', filtrosAplicados.nombre.trim());
      }
      if (filtrosAplicados.pedidosMinimos) {
        params.set('pedidosMinimos', filtrosAplicados.pedidosMinimos);
      }
      if (filtrosAplicados.montoTotalMin) {
        params.set('montoTotalMin', filtrosAplicados.montoTotalMin);
      }

      const response = await fetch(`/api/clientes?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Error al cargar clientes');
      }
      const { data } = await response.json();
      setClientes(data?.datos || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // Fetch client orders
  const fetchPedidosCliente = useCallback(async (clienteId: string, pagina: number) => {
    setLoadingPedidos(true);
    try {
      const params = new URLSearchParams();
      params.set('pagina', pagina.toString());
      params.set('porPagina', ITEMS_POR_PAGINA.toString());

      const response = await fetch(`/api/clientes/${clienteId}?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Error al cargar historial de pedidos');
      }
      const { data } = await response.json();
      setPedidos(data?.pedidos || null);
    } catch {
      setPedidos(null);
    } finally {
      setLoadingPedidos(false);
    }
  }, []);

  // Apply filters
  function handleAplicarFiltros(e: React.FormEvent) {
    e.preventDefault();
    setFiltrosAplicados({ ...filtros });
  }

  // Clear filters
  function handleLimpiarFiltros() {
    const empty = { nombre: '', pedidosMinimos: '', montoTotalMin: '' };
    setFiltros(empty);
    setFiltrosAplicados(empty);
  }

  // Open detail modal
  function handleVerDetalle(cliente: Cliente) {
    setClienteSeleccionado(cliente);
    setPaginaActual(1);
    setPedidos(null);
    setShowDetalleModal(true);
    fetchPedidosCliente(cliente.id, 1);
  }

  // Navigate pages
  function handleCambiarPagina(pagina: number) {
    if (!clienteSeleccionado) return;
    setPaginaActual(pagina);
    fetchPedidosCliente(clienteSeleccionado.id, pagina);
  }

  // Format currency
  function formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(monto);
  }

  // Format date
  function formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  // Clients table columns
  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item: Cliente) => (
        <span className="font-medium text-wood-800">{item.nombre}</span>
      ),
    },
    {
      key: 'telefono',
      header: 'Teléfono',
      render: (item: Cliente) => (
        <span className="text-wood-600">{item.telefono}</span>
      ),
    },
    {
      key: 'totalPedidos',
      header: 'Pedidos',
      render: (item: Cliente) => (
        <span className="text-wood-700">{item.totalPedidos ?? '-'}</span>
      ),
    },
    {
      key: 'montoTotal',
      header: 'Monto Total',
      render: (item: Cliente) => (
        <span className="font-medium text-wood-800">
          {item.montoTotal != null ? formatMonto(item.montoTotal) : '-'}
        </span>
      ),
    },
    {
      key: 'creadoEn',
      header: 'Registrado',
      render: (item: Cliente) => (
        <span className="text-wood-500 text-xs">{formatFecha(item.creadoEn)}</span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item: Cliente) => (
        <Button size="sm" variant="secondary" onClick={() => handleVerDetalle(item)}>
          Ver Detalle
        </Button>
      ),
    },
  ];

  // Pedidos table columns (in modal)
  const pedidoColumns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (pedido: Pedido) => (
        <span className="text-wood-700 text-sm">{formatFecha(pedido.creadoEn)}</span>
      ),
    },
    {
      key: 'numero',
      header: 'Pedido #',
      render: (pedido: Pedido) => (
        <span className="font-medium text-brand-700">{pedido.numero}</span>
      ),
    },
    {
      key: 'total',
      header: 'Monto',
      render: (pedido: Pedido) => (
        <span className="font-semibold text-wood-800">{formatMonto(pedido.total)}</span>
      ),
    },
    {
      key: 'productos',
      header: 'Productos',
      render: (pedido: Pedido) => (
        <div className="text-xs text-wood-600 max-w-xs">
          {pedido.items.map((item, idx) => (
            <span key={idx}>
              {item.cantidad}x {item.nombre}
              {idx < pedido.items.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (pedido: Pedido) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getEstadoColor(pedido.estado)}`}>
          {formatEstado(pedido.estado)}
        </span>
      ),
    },
  ];

  function getEstadoColor(estado: string): string {
    const colores: Record<string, string> = {
      recibido: 'bg-brand-100 text-brand-700',
      en_preparacion: 'bg-golden-100 text-golden-700',
      empacado: 'bg-blue-100 text-blue-700',
      servido: 'bg-green-100 text-green-700',
      en_camino: 'bg-purple-100 text-purple-700',
      entregado: 'bg-green-100 text-green-800',
      cancelado: 'bg-fire-100 text-fire-700',
    };
    return colores[estado] || 'bg-wood-100 text-wood-700';
  }

  function formatEstado(estado: string): string {
    const nombres: Record<string, string> = {
      recibido: 'Recibido',
      en_preparacion: 'En Preparación',
      empacado: 'Empacado',
      servido: 'Servido',
      en_camino: 'En Camino',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      pagado: 'Pagado',
    };
    return nombres[estado] || estado;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-wood-800">Clientes</h1>
        <p className="text-sm text-wood-500 mt-1">
          Gestión y consulta de clientes del negocio
        </p>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleAplicarFiltros}
        className="bg-white rounded-lg border border-wood-200 p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Nombre"
            placeholder="Buscar por nombre..."
            value={filtros.nombre}
            onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
          />
          <Input
            label="Pedidos mínimos (últimos 30 días)"
            type="number"
            placeholder="Ej: 3"
            min="0"
            value={filtros.pedidosMinimos}
            onChange={(e) => setFiltros({ ...filtros, pedidosMinimos: e.target.value })}
          />
          <Input
            label="Monto total mínimo"
            type="number"
            placeholder="Ej: 500"
            min="0"
            step="0.01"
            value={filtros.montoTotalMin}
            onChange={(e) => setFiltros({ ...filtros, montoTotalMin: e.target.value })}
          />
          <div className="flex items-end gap-2">
            <Button type="submit" size="md">
              Filtrar
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={handleLimpiarFiltros}>
              Limpiar
            </Button>
          </div>
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="bg-fire-50 border border-fire-300 text-fire-800 px-4 py-3 rounded-lg text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Results Count */}
      {!loading && (
        <p className="text-sm text-wood-500">
          {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} encontrado{clientes.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
        </div>
      ) : (
        /* Clients Table */
        <Table
          columns={columns}
          data={clientes}
          keyExtractor={(item) => item.id}
          emptyMessage="No se encontraron clientes con los filtros aplicados"
        />
      )}

      {/* Client Detail Modal */}
      <Modal
        isOpen={showDetalleModal}
        onClose={() => {
          setShowDetalleModal(false);
          setClienteSeleccionado(null);
          setPedidos(null);
        }}
        title={`Cliente: ${clienteSeleccionado?.nombre || ''}`}
        className="max-w-4xl"
      >
        {clienteSeleccionado && (
          <div className="space-y-6">
            {/* Client Info */}
            <div className="bg-wood-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-wood-500 uppercase font-medium">Teléfono</p>
                <p className="text-sm font-semibold text-wood-800">{clienteSeleccionado.telefono}</p>
              </div>
              <div>
                <p className="text-xs text-wood-500 uppercase font-medium">Correo</p>
                <p className="text-sm text-wood-700">{clienteSeleccionado.correo || 'No registrado'}</p>
              </div>
              <div>
                <p className="text-xs text-wood-500 uppercase font-medium">Dirección</p>
                <p className="text-sm text-wood-700">{clienteSeleccionado.direccion || 'No registrada'}</p>
              </div>
              <div>
                <p className="text-xs text-wood-500 uppercase font-medium">Cliente desde</p>
                <p className="text-sm text-wood-700">{formatFecha(clienteSeleccionado.creadoEn)}</p>
              </div>
              {clienteSeleccionado.totalPedidos != null && (
                <div>
                  <p className="text-xs text-wood-500 uppercase font-medium">Total de Pedidos</p>
                  <p className="text-sm font-semibold text-wood-800">{clienteSeleccionado.totalPedidos}</p>
                </div>
              )}
              {clienteSeleccionado.montoTotal != null && (
                <div>
                  <p className="text-xs text-wood-500 uppercase font-medium">Monto Total Gastado</p>
                  <p className="text-sm font-semibold text-brand-700">{formatMonto(clienteSeleccionado.montoTotal)}</p>
                </div>
              )}
            </div>

            {/* Order History */}
            <div>
              <h3 className="text-lg font-semibold text-wood-800 mb-3">Historial de Pedidos</h3>

              {loadingPedidos ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-brand-200 border-t-brand-600 rounded-full" />
                </div>
              ) : pedidos && pedidos.datos.length > 0 ? (
                <>
                  <Table
                    columns={pedidoColumns}
                    data={pedidos.datos}
                    keyExtractor={(p) => p.id}
                    emptyMessage="No hay pedidos"
                  />

                  {/* Pagination */}
                  {pedidos.totalPaginas > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-wood-200">
                      <p className="text-sm text-wood-500">
                        Mostrando página {pedidos.pagina} de {pedidos.totalPaginas} ({pedidos.total} pedidos)
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={paginaActual <= 1}
                          onClick={() => handleCambiarPagina(paginaActual - 1)}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-wood-600 px-2">
                          {paginaActual}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={paginaActual >= pedidos.totalPaginas}
                          onClick={() => handleCambiarPagina(paginaActual + 1)}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-wood-500 py-4 text-center">
                  Este cliente no tiene pedidos registrados.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
