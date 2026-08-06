'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Table, Modal, Alert } from '../_components';

// Types
interface ArticuloInventario {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  nivelMinimo: number;
  productoIds: string[];
  creadoEn: string;
  actualizadoEn: string;
}

interface MovimientoInventario {
  id: string;
  articuloId: string;
  cantidadAnterior: number;
  cantidadNueva: number;
  tipoMovimiento: 'entrada' | 'salida';
  adminId: string;
  fecha: string;
}

interface FormData {
  nombre: string;
  cantidad: string;
  unidadMedida: string;
  nivelMinimo: string;
}

interface FormErrors {
  nombre?: string;
  cantidad?: string;
  unidadMedida?: string;
  nivelMinimo?: string;
}

const UNIDADES_MEDIDA = ['kg', 'g', 'litros', 'ml', 'unidades', 'piezas', 'paquetes'];

const initialFormData: FormData = {
  nombre: '',
  cantidad: '',
  unidadMedida: '',
  nivelMinimo: '',
};

export default function InventarioPage() {
  // State
  const [articulos, setArticulos] = useState<ArticuloInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [showActualizarModal, setShowActualizarModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Update quantity state
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<ArticuloInventario | null>(null);
  const [cantidadActualizar, setCantidadActualizar] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida'>('entrada');
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Historial state
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Filter state
  const [filtrarBajoStock, setFiltrarBajoStock] = useState(false);

  // Fetch articles
  const fetchArticulos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtrarBajoStock) params.set('bajoMinimo', 'true');

      const response = await fetch(`/api/inventario?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Error al cargar inventario');
      }
      const { data } = await response.json();
      setArticulos(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [filtrarBajoStock]);

  useEffect(() => {
    fetchArticulos();
  }, [fetchArticulos]);

  // Validation
  function validateForm(data: FormData): FormErrors {
    const errors: FormErrors = {};

    if (!data.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    } else if (data.nombre.length > 100) {
      errors.nombre = 'El nombre no puede exceder 100 caracteres';
    }

    const cantidad = parseFloat(data.cantidad);
    if (!data.cantidad) {
      errors.cantidad = 'La cantidad es obligatoria';
    } else if (isNaN(cantidad) || cantidad < 0 || cantidad > 999999) {
      errors.cantidad = 'La cantidad debe estar entre 0 y 999,999';
    }

    if (!data.unidadMedida) {
      errors.unidadMedida = 'La unidad de medida es obligatoria';
    }

    const nivelMinimo = parseFloat(data.nivelMinimo);
    if (!data.nivelMinimo) {
      errors.nivelMinimo = 'El nivel mínimo es obligatorio';
    } else if (isNaN(nivelMinimo) || nivelMinimo < 1) {
      errors.nivelMinimo = 'El nivel mínimo debe ser al menos 1';
    }

    return errors;
  }

  // Register article
  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault();

    const errors = validateForm(formData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          cantidad: parseFloat(formData.cantidad),
          unidadMedida: formData.unidadMedida,
          nivelMinimo: parseFloat(formData.nivelMinimo),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Error al registrar artículo');
      }

      setShowRegistroModal(false);
      setFormData(initialFormData);
      setFormErrors({});
      await fetchArticulos();
    } catch (err) {
      setFormErrors({
        nombre: err instanceof Error ? err.message : 'Error al registrar',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Update quantity
  async function handleActualizarCantidad(e: React.FormEvent) {
    e.preventDefault();

    if (!articuloSeleccionado) return;

    const cantidad = parseFloat(cantidadActualizar);
    if (isNaN(cantidad) || cantidad <= 0) {
      setUpdateError('La cantidad debe ser un número mayor a 0');
      return;
    }

    setSubmitting(true);
    setUpdateError(null);
    try {
      const response = await fetch(`/api/inventario/${articuloSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad,
          tipoMovimiento,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Error al actualizar cantidad');
      }

      setShowActualizarModal(false);
      setArticuloSeleccionado(null);
      setCantidadActualizar('');
      setTipoMovimiento('entrada');
      await fetchArticulos();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  }

  // Fetch movement history
  async function handleVerHistorial(articulo: ArticuloInventario) {
    setArticuloSeleccionado(articulo);
    setShowHistorialModal(true);
    setLoadingHistorial(true);
    try {
      // Note: This endpoint may need to be added to the API
      const response = await fetch(`/api/inventario/${articulo.id}?historial=true`);
      if (!response.ok) {
        throw new Error('Error al cargar historial');
      }
      const { data } = await response.json();
      setMovimientos(data?.movimientos || []);
    } catch {
      setMovimientos([]);
    } finally {
      setLoadingHistorial(false);
    }
  }

  // Open update modal
  function handleOpenActualizar(articulo: ArticuloInventario) {
    setArticuloSeleccionado(articulo);
    setCantidadActualizar('');
    setTipoMovimiento('entrada');
    setUpdateError(null);
    setShowActualizarModal(true);
  }

  // Check if article is at or below minimum
  function estaBajoMinimo(articulo: ArticuloInventario): boolean {
    return articulo.cantidad <= articulo.nivelMinimo;
  }

  function estaAgotado(articulo: ArticuloInventario): boolean {
    return articulo.cantidad === 0;
  }

  // Low stock articles count
  const articulosBajoStock = articulos.filter(estaBajoMinimo);

  // Table columns
  const columns = [
    {
      key: 'nombre',
      header: 'Artículo',
      render: (item: ArticuloInventario) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-wood-800">{item.nombre}</span>
          {estaAgotado(item) && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-fire-100 text-fire-700 font-semibold">
              Agotado
            </span>
          )}
          {!estaAgotado(item) && estaBajoMinimo(item) && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-golden-100 text-golden-700 font-semibold">
              Bajo stock
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      render: (item: ArticuloInventario) => (
        <span className={`font-semibold ${estaBajoMinimo(item) ? 'text-fire-600' : 'text-wood-800'}`}>
          {item.cantidad.toLocaleString()} {item.unidad}
        </span>
      ),
    },
    {
      key: 'nivelMinimo',
      header: 'Nivel Mínimo',
      render: (item: ArticuloInventario) => (
        <span className="text-wood-600">
          {item.nivelMinimo.toLocaleString()} {item.unidad}
        </span>
      ),
    },
    {
      key: 'actualizadoEn',
      header: 'Última Actualización',
      render: (item: ArticuloInventario) => (
        <span className="text-wood-500 text-xs">
          {new Date(item.actualizadoEn).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (item: ArticuloInventario) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => handleOpenActualizar(item)}>
            Actualizar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleVerHistorial(item)}>
            Historial
          </Button>
        </div>
      ),
    },
  ];

  // Historial columns
  const historialColumns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (mov: MovimientoInventario) => (
        <span className="text-wood-700 text-xs">
          {new Date(mov.fecha).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'cantidadAnterior',
      header: 'Anterior',
      render: (mov: MovimientoInventario) => (
        <span className="text-wood-600">{mov.cantidadAnterior.toLocaleString()}</span>
      ),
    },
    {
      key: 'cantidadNueva',
      header: 'Nueva',
      render: (mov: MovimientoInventario) => (
        <span className="font-semibold text-wood-800">{mov.cantidadNueva.toLocaleString()}</span>
      ),
    },
    {
      key: 'tipoMovimiento',
      header: 'Tipo',
      render: (mov: MovimientoInventario) => (
        <span
          className={`px-2 py-0.5 text-xs rounded-full font-medium ${
            mov.tipoMovimiento === 'entrada'
              ? 'bg-green-100 text-green-700'
              : 'bg-fire-100 text-fire-700'
          }`}
        >
          {mov.tipoMovimiento === 'entrada' ? '↑ Entrada' : '↓ Salida'}
        </span>
      ),
    },
    {
      key: 'adminId',
      header: 'Admin',
      render: (mov: MovimientoInventario) => (
        <span className="text-wood-500 text-xs">{mov.adminId.slice(0, 8)}...</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-wood-800">Inventario</h1>
          <p className="text-sm text-wood-500 mt-1">
            Gestión de artículos e ingredientes del negocio
          </p>
        </div>
        <Button onClick={() => setShowRegistroModal(true)}>
          + Nuevo Artículo
        </Button>
      </div>

      {/* Low Stock Alerts */}
      {articulosBajoStock.length > 0 && !filtrarBajoStock && (
        <Alert variant="warning" title="Alerta de Bajo Stock">
          <p>
            {articulosBajoStock.length} artículo{articulosBajoStock.length > 1 ? 's' : ''} con nivel
            bajo o agotado:{' '}
            {articulosBajoStock.map((a) => a.nombre).join(', ')}
          </p>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-wood-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filtrarBajoStock}
            onChange={(e) => setFiltrarBajoStock(e.target.checked)}
            className="w-4 h-4 rounded border-wood-300 text-brand-600 focus:ring-brand-300"
          />
          Mostrar solo bajo stock
        </label>
        <span className="text-sm text-wood-500">
          {articulos.length} artículo{articulos.length !== 1 ? 's' : ''} encontrado{articulos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full" />
        </div>
      ) : (
        /* Articles Table */
        <Table
          columns={columns}
          data={articulos}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay artículos en el inventario"
        />
      )}

      {/* Registration Modal */}
      <Modal
        isOpen={showRegistroModal}
        onClose={() => {
          setShowRegistroModal(false);
          setFormData(initialFormData);
          setFormErrors({});
        }}
        title="Registrar Artículo"
      >
        <form onSubmit={handleRegistrar} className="space-y-4">
          <Input
            label="Nombre del artículo"
            placeholder="Ej: Pechuga de pollo"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            error={formErrors.nombre}
            maxLength={100}
          />

          <Input
            label="Cantidad"
            type="number"
            placeholder="0"
            min="0"
            max="999999"
            step="0.01"
            value={formData.cantidad}
            onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
            error={formErrors.cantidad}
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-wood-700 mb-1">
              Unidad de medida
            </label>
            <select
              value={formData.unidadMedida}
              onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
              className={`
                w-full px-3 py-2 rounded-lg border text-sm
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-1
                ${formErrors.unidadMedida
                  ? 'border-fire-400 focus:ring-fire-300 bg-fire-50'
                  : 'border-wood-300 focus:ring-brand-300 focus:border-brand-400 bg-white'
                }
              `}
            >
              <option value="">Seleccionar unidad</option>
              {UNIDADES_MEDIDA.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {formErrors.unidadMedida && (
              <p className="mt-1 text-xs text-fire-600" role="alert">{formErrors.unidadMedida}</p>
            )}
          </div>

          <Input
            label="Nivel mínimo de alerta"
            type="number"
            placeholder="1"
            min="1"
            step="1"
            value={formData.nivelMinimo}
            onChange={(e) => setFormData({ ...formData, nivelMinimo: e.target.value })}
            error={formErrors.nivelMinimo}
            helperText="Cantidad a la cual se mostrará alerta de bajo stock"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-wood-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowRegistroModal(false);
                setFormData(initialFormData);
                setFormErrors({});
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Quantity Modal */}
      <Modal
        isOpen={showActualizarModal}
        onClose={() => {
          setShowActualizarModal(false);
          setArticuloSeleccionado(null);
          setUpdateError(null);
        }}
        title="Actualizar Cantidad"
      >
        {articuloSeleccionado && (
          <form onSubmit={handleActualizarCantidad} className="space-y-4">
            <div className="bg-wood-50 rounded-lg p-3">
              <p className="text-sm text-wood-600">Artículo:</p>
              <p className="font-semibold text-wood-800">{articuloSeleccionado.nombre}</p>
              <p className="text-sm text-wood-500 mt-1">
                Cantidad actual: <span className="font-medium">{articuloSeleccionado.cantidad.toLocaleString()} {articuloSeleccionado.unidad}</span>
              </p>
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-wood-700 mb-1">
                Tipo de movimiento
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoMovimiento"
                    value="entrada"
                    checked={tipoMovimiento === 'entrada'}
                    onChange={() => setTipoMovimiento('entrada')}
                    className="w-4 h-4 text-green-600 focus:ring-green-300"
                  />
                  <span className="text-sm text-wood-700">Entrada (agregar)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoMovimiento"
                    value="salida"
                    checked={tipoMovimiento === 'salida'}
                    onChange={() => setTipoMovimiento('salida')}
                    className="w-4 h-4 text-fire-600 focus:ring-fire-300"
                  />
                  <span className="text-sm text-wood-700">Salida (retirar)</span>
                </label>
              </div>
            </div>

            <Input
              label={`Cantidad a ${tipoMovimiento === 'entrada' ? 'agregar' : 'retirar'}`}
              type="number"
              placeholder="0"
              min="0.01"
              step="0.01"
              value={cantidadActualizar}
              onChange={(e) => setCantidadActualizar(e.target.value)}
              error={updateError || undefined}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-wood-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowActualizarModal(false);
                  setArticuloSeleccionado(null);
                  setUpdateError(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={submitting}>
                Actualizar
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Movement History Modal */}
      <Modal
        isOpen={showHistorialModal}
        onClose={() => {
          setShowHistorialModal(false);
          setArticuloSeleccionado(null);
          setMovimientos([]);
        }}
        title={`Historial - ${articuloSeleccionado?.nombre || ''}`}
        className="max-w-2xl"
      >
        {loadingHistorial ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-4 border-brand-200 border-t-brand-600 rounded-full" />
          </div>
        ) : (
          <Table
            columns={historialColumns}
            data={movimientos}
            keyExtractor={(mov) => mov.id || `${mov.fecha}-${mov.tipoMovimiento}`}
            emptyMessage="No hay movimientos registrados"
          />
        )}
      </Modal>
    </div>
  );
}
