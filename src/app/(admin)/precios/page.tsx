'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Table, Modal, Alert } from '../_components';

type Categoria = 'alitas' | 'hamburguesas' | 'bebidas' | 'otros';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  imagen?: string;
  categoria: Categoria;
  precio: number;
  disponible: boolean;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

interface HistorialPrecio {
  id: string;
  productoId: string;
  precioAnterior: number;
  precioNuevo: number;
  fechaCambio: string;
}

export default function PreciosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit price modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [precioError, setPrecioError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // History modal
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<HistorialPrecio[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [productoHistorial, setProductoHistorial] = useState<Producto | null>(null);

  // Filter
  const [busqueda, setBusqueda] = useState('');

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/productos');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || 'Error al cargar productos');
      }
      const json = await res.json();
      setProductos(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const productosFiltrados = productos.filter((p) => {
    if (!busqueda) return true;
    return p.nombre.toLowerCase().includes(busqueda.toLowerCase());
  });

  const handleEditarPrecio = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setNuevoPrecio(producto.precio.toString());
    setPrecioError(null);
    setShowEditModal(true);
  };

  const handleGuardarPrecio = async () => {
    if (!productoSeleccionado) return;

    const precioNum = parseFloat(nuevoPrecio);
    if (isNaN(precioNum) || precioNum < 0.01 || precioNum > 99999.99) {
      setPrecioError('El precio debe estar entre $0.01 y $99,999.99');
      return;
    }

    // Check max 2 decimal places
    const decimales = nuevoPrecio.includes('.')
      ? nuevoPrecio.split('.')[1]?.length || 0
      : 0;
    if (decimales > 2) {
      setPrecioError('El precio no puede tener más de 2 decimales');
      return;
    }

    if (precioNum === productoSeleccionado.precio) {
      setPrecioError('El nuevo precio debe ser diferente al precio actual');
      return;
    }

    setEditLoading(true);
    setPrecioError(null);

    try {
      const res = await fetch(`/api/productos/${productoSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio: precioNum }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || 'Error al actualizar precio');
      }

      setSuccessMsg(
        `Precio de "${productoSeleccionado.nombre}" actualizado a $${precioNum.toFixed(2)}`
      );
      setShowEditModal(false);
      setProductoSeleccionado(null);
      fetchProductos();
    } catch (err) {
      setPrecioError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setEditLoading(false);
    }
  };

  const handleVerHistorial = async (producto: Producto) => {
    setProductoHistorial(producto);
    setShowHistorial(true);
    setHistorialLoading(true);

    try {
      const res = await fetch(`/api/productos/${producto.id}/historial-precios`);
      if (!res.ok) {
        // If the API endpoint doesn't exist yet, show empty state
        setHistorial([]);
        return;
      }
      const json = await res.json();
      setHistorial(json.data || []);
    } catch {
      setHistorial([]);
    } finally {
      setHistorialLoading(false);
    }
  };

  const formatFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns = [
    {
      key: 'nombre',
      header: 'Producto',
      render: (p: Producto) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-wood-100 flex items-center justify-center flex-shrink-0">
            {p.imagen ? (
              <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="text-wood-400 text-[10px]">Sin img</span>
            )}
          </div>
          <div>
            <p className="font-medium text-wood-800">{p.nombre}</p>
            <span className="text-xs text-wood-500 capitalize">{p.categoria}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'precio',
      header: 'Precio Actual',
      render: (p: Producto) => (
        <span className="text-lg font-bold text-brand-700">
          ${p.precio.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (p: Producto) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            p.activo
              ? 'bg-green-100 text-green-700'
              : 'bg-wood-200 text-wood-600'
          }`}
        >
          {p.activo ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (p: Producto) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleEditarPrecio(p)}
            className="text-brand-600 hover:text-brand-800 text-sm font-medium transition-colors"
            aria-label={`Editar precio de ${p.nombre}`}
          >
            Editar Precio
          </button>
          <button
            onClick={() => handleVerHistorial(p)}
            className="text-wood-600 hover:text-wood-800 text-sm font-medium transition-colors"
            aria-label={`Ver historial de precios de ${p.nombre}`}
          >
            Historial
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-wood-800">Precios</h1>
        <p className="text-sm text-wood-500 mt-1">
          Gestiona los precios de tus productos y consulta el historial de cambios
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-wood-200">
        <div className="w-64">
          <Input
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <span className="text-sm text-wood-500 ml-auto">
          {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
        </div>
      ) : (
        <Table
          columns={columns}
          data={productosFiltrados}
          keyExtractor={(p) => p.id}
          emptyMessage="No se encontraron productos"
        />
      )}

      {/* Edit Price Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setProductoSeleccionado(null);
        }}
        title="Editar Precio"
      >
        {productoSeleccionado && (
          <div className="space-y-4">
            <div className="bg-wood-50 p-3 rounded-lg">
              <p className="font-medium text-wood-800">{productoSeleccionado.nombre}</p>
              <p className="text-sm text-wood-500 capitalize">
                {productoSeleccionado.categoria}
              </p>
              <p className="mt-2 text-sm text-wood-600">
                Precio actual:{' '}
                <span className="font-semibold text-wood-800">
                  ${productoSeleccionado.precio.toFixed(2)}
                </span>
              </p>
            </div>

            <Input
              label="Nuevo Precio *"
              type="number"
              step="0.01"
              min="0.01"
              max="99999.99"
              placeholder="0.00"
              value={nuevoPrecio}
              onChange={(e) => {
                setNuevoPrecio(e.target.value);
                setPrecioError(null);
              }}
              error={precioError || undefined}
            />

            {nuevoPrecio && parseFloat(nuevoPrecio) > 0 && (
              <div className="text-sm text-wood-600 bg-brand-50 p-3 rounded-lg">
                <p>
                  Cambio:{' '}
                  <span
                    className={
                      parseFloat(nuevoPrecio) > productoSeleccionado.precio
                        ? 'text-fire-600 font-medium'
                        : 'text-green-600 font-medium'
                    }
                  >
                    {parseFloat(nuevoPrecio) > productoSeleccionado.precio ? '▲' : '▼'} $
                    {Math.abs(
                      parseFloat(nuevoPrecio) - productoSeleccionado.precio
                    ).toFixed(2)}
                  </span>{' '}
                  ({(
                    ((parseFloat(nuevoPrecio) - productoSeleccionado.precio) /
                      productoSeleccionado.precio) *
                    100
                  ).toFixed(1)}
                  %)
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-wood-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditModal(false);
                  setProductoSeleccionado(null);
                }}
              >
                Cancelar
              </Button>
              <Button loading={editLoading} onClick={handleGuardarPrecio}>
                Guardar Precio
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Price History Modal */}
      <Modal
        isOpen={showHistorial}
        onClose={() => {
          setShowHistorial(false);
          setProductoHistorial(null);
          setHistorial([]);
        }}
        title={`Historial de Precios${productoHistorial ? ` - ${productoHistorial.nombre}` : ''}`}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {productoHistorial && (
            <div className="bg-brand-50 p-3 rounded-lg">
              <p className="text-sm text-wood-600">
                Precio actual:{' '}
                <span className="font-bold text-brand-700 text-lg">
                  ${productoHistorial.precio.toFixed(2)}
                </span>
              </p>
            </div>
          )}

          {historialLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-3 border-brand-200 border-t-brand-600 rounded-full" />
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-wood-500 text-sm">
                No hay cambios de precio registrados para este producto.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {historial.map((h, idx) => (
                <div
                  key={h.id || idx}
                  className="flex items-center justify-between p-3 bg-white border border-wood-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        h.precioNuevo > h.precioAnterior
                          ? 'bg-fire-100 text-fire-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      {h.precioNuevo > h.precioAnterior ? '▲' : '▼'}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="text-wood-500 line-through">
                          ${h.precioAnterior.toFixed(2)}
                        </span>
                        <span className="mx-2 text-wood-400">→</span>
                        <span className="font-semibold text-wood-800">
                          ${h.precioNuevo.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-xs text-wood-500">
                        {formatFecha(h.fechaCambio)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      h.precioNuevo > h.precioAnterior
                        ? 'text-fire-600'
                        : 'text-green-600'
                    }`}
                  >
                    {h.precioNuevo > h.precioAnterior ? '+' : ''}
                    {(
                      ((h.precioNuevo - h.precioAnterior) / h.precioAnterior) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-wood-200">
            <Button
              variant="secondary"
              onClick={() => {
                setShowHistorial(false);
                setProductoHistorial(null);
                setHistorial([]);
              }}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
