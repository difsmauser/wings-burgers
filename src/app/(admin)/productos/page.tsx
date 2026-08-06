'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Table, Modal, Alert } from '../_components';
import ProductoForm from './_components/ProductoForm';

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

const CATEGORIAS: { value: '' | Categoria; label: string }[] = [
  { value: '', label: 'Todas las categorías' },
  { value: 'alitas', label: 'Alitas' },
  { value: 'hamburguesas', label: 'Hamburguesas' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'otros', label: 'Otros' },
];

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<'' | Categoria>('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [productoDesactivar, setProductoDesactivar] = useState<Producto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtroCategoria) {
        params.set('categoria', filtroCategoria);
      }
      const url = `/api/productos${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
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
  }, [filtroCategoria]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const productosFiltrados = productos.filter((p) => {
    if (!busqueda) return true;
    return p.nombre.toLowerCase().includes(busqueda.toLowerCase());
  });

  const handleCrear = () => {
    setProductoEditar(null);
    setShowForm(true);
  };

  const handleEditar = (producto: Producto) => {
    setProductoEditar(producto);
    setShowForm(true);
  };

  const handleDesactivar = (producto: Producto) => {
    setProductoDesactivar(producto);
    setShowConfirmDelete(true);
  };

  const confirmarDesactivar = async () => {
    if (!productoDesactivar) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/productos/${productoDesactivar.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || 'Error al desactivar producto');
      }
      setSuccessMsg(`Producto "${productoDesactivar.nombre}" desactivado correctamente`);
      setShowConfirmDelete(false);
      setProductoDesactivar(null);
      fetchProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFormSuccess = (mensaje: string) => {
    setSuccessMsg(mensaje);
    setShowForm(false);
    setProductoEditar(null);
    fetchProductos();
  };

  const columns = [
    {
      key: 'imagen',
      header: 'Imagen',
      render: (p: Producto) => (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-wood-100 flex items-center justify-center">
          {p.imagen ? (
            <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />
          ) : (
            <span className="text-wood-400 text-xs">Sin img</span>
          )}
        </div>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre',
      render: (p: Producto) => (
        <div>
          <p className="font-medium text-wood-800">{p.nombre}</p>
          {p.descripcion && (
            <p className="text-xs text-wood-500 mt-0.5 truncate max-w-[200px]">
              {p.descripcion}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (p: Producto) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700 capitalize">
          {p.categoria}
        </span>
      ),
    },
    {
      key: 'precio',
      header: 'Precio',
      render: (p: Producto) => (
        <span className="font-semibold text-wood-800">
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditar(p)}
            className="text-brand-600 hover:text-brand-800 text-sm font-medium transition-colors"
            aria-label={`Editar ${p.nombre}`}
          >
            Editar
          </button>
          {p.activo && (
            <button
              onClick={() => handleDesactivar(p)}
              className="text-fire-600 hover:text-fire-800 text-sm font-medium transition-colors"
              aria-label={`Desactivar ${p.nombre}`}
            >
              Desactivar
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-wood-800">Productos</h1>
          <p className="text-sm text-wood-500 mt-1">
            Gestiona el catálogo de productos del menú
          </p>
        </div>
        <Button onClick={handleCrear}>+ Nuevo Producto</Button>
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
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border border-wood-200">
        <div className="w-64">
          <Input
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value as '' | Categoria)}
          className="px-3 py-2 rounded-lg border border-wood-300 text-sm text-wood-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          aria-label="Filtrar por categoría"
        >
          {CATEGORIAS.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
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

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setProductoEditar(null);
        }}
        title={productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
        className="max-w-2xl"
      >
        <ProductoForm
          producto={productoEditar}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setProductoEditar(null);
          }}
        />
      </Modal>

      {/* Confirm Deactivate Modal */}
      <Modal
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setProductoDesactivar(null);
        }}
        title="Confirmar Desactivación"
      >
        <div className="space-y-4">
          <p className="text-sm text-wood-600">
            ¿Estás seguro de que deseas desactivar el producto{' '}
            <strong>"{productoDesactivar?.nombre}"</strong>? El producto no aparecerá en
            el menú pero podrá reactivarse en el futuro.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowConfirmDelete(false);
                setProductoDesactivar(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={actionLoading}
              onClick={confirmarDesactivar}
            >
              Desactivar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
