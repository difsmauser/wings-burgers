'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Table, Alert } from '../_components';

// --- Types ---

interface GastoItem {
  id: string;
  monto: number;
  concepto: string;
  categoria: string;
  fecha: string;
}

interface ResumenCategoria {
  categoria: string;
  total: number;
  cantidad: number;
}

const CATEGORIAS = [
  'INSUMOS',
  'SERVICIOS',
  'NOMINA',
  'MANTENIMIENTO',
  'MARKETING',
  'RENTA',
  'OTROS',
] as const;

const CATEGORIA_LABELS: Record<string, string> = {
  INSUMOS: 'Insumos',
  SERVICIOS: 'Servicios',
  NOMINA: 'Nómina',
  MANTENIMIENTO: 'Mantenimiento',
  MARKETING: 'Marketing',
  RENTA: 'Renta',
  OTROS: 'Otros',
};

// --- Helper ---

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

// --- Main Component ---

export default function GastosPage() {
  // Registration form state
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Query/filter state
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroMontoMin, setFiltroMontoMin] = useState('');
  const [filtroMontoMax, setFiltroMontoMax] = useState('');
  const [filterError, setFilterError] = useState('');

  // Results state
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [resumen, setResumen] = useState<ResumenCategoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryError, setQueryError] = useState('');

  // --- Registration Form ---

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum)) {
      errors.monto = 'Ingresa un monto válido';
    } else if (montoNum < 0.01 || montoNum > 999999.99) {
      errors.monto = 'El monto debe estar entre $0.01 y $999,999.99';
    } else {
      // Check max 2 decimal places
      const parts = monto.split('.');
      if (parts[1] && parts[1].length > 2) {
        errors.monto = 'Máximo 2 decimales';
      }
    }

    if (!concepto.trim()) {
      errors.concepto = 'El concepto es obligatorio';
    } else if (concepto.trim().length > 200) {
      errors.concepto = 'Máximo 200 caracteres';
    }

    if (!categoria) {
      errors.categoria = 'Selecciona una categoría';
    }

    if (!fecha) {
      errors.fecha = 'La fecha es obligatoria';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: parseFloat(monto),
          concepto: concepto.trim(),
          categoria,
          fecha: new Date(fecha).toISOString(),
          adminId: 'admin-placeholder', // Will be replaced with real auth in task 16.3
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormErrors({ general: data.error?.message || 'Error al registrar gasto' });
        return;
      }

      // Clear form on success
      setMonto('');
      setConcepto('');
      setCategoria('');
      setFecha(new Date().toISOString().split('T')[0]);
      setFormErrors({});
      setSuccessMsg('Gasto registrado exitosamente');

      // Refresh results if filters are applied
      handleQuery();
    } catch {
      setFormErrors({ general: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  }

  // --- Query & Filters ---

  function validateFilters(): boolean {
    setFilterError('');

    if (filtroFechaInicio && filtroFechaFin) {
      const inicio = new Date(filtroFechaInicio);
      const fin = new Date(filtroFechaFin);
      if (fin < inicio) {
        setFilterError('La fecha fin no puede ser anterior a la fecha inicio');
        return false;
      }
      const diffDays = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        setFilterError('El rango de fechas no puede exceder 365 días');
        return false;
      }
    }

    if (filtroMontoMin && filtroMontoMax) {
      if (parseFloat(filtroMontoMin) > parseFloat(filtroMontoMax)) {
        setFilterError('El monto mínimo no puede ser mayor al máximo');
        return false;
      }
    }

    return true;
  }

  const handleQuery = useCallback(async () => {
    if (!validateFilters()) return;

    setLoading(true);
    setQueryError('');

    try {
      const params = new URLSearchParams();
      if (filtroCategoria) params.set('categoria', filtroCategoria);
      if (filtroFechaInicio) params.set('fechaInicio', new Date(filtroFechaInicio).toISOString());
      if (filtroFechaFin) params.set('fechaFin', new Date(filtroFechaFin).toISOString());
      if (filtroMontoMin) params.set('montoMin', filtroMontoMin);
      if (filtroMontoMax) params.set('montoMax', filtroMontoMax);

      const res = await fetch(`/api/gastos?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        setQueryError(data.error?.message || 'Error al consultar gastos');
        return;
      }

      const { data } = await res.json();
      const sorted = (data as GastoItem[]).sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      setGastos(sorted);

      // Calculate category summary
      const categorySums = new Map<string, { total: number; cantidad: number }>();
      for (const g of sorted) {
        const existing = categorySums.get(g.categoria) || { total: 0, cantidad: 0 };
        existing.total += g.monto;
        existing.cantidad += 1;
        categorySums.set(g.categoria, existing);
      }
      const resumenArr: ResumenCategoria[] = Array.from(categorySums.entries()).map(
        ([cat, { total, cantidad }]) => ({ categoria: cat, total, cantidad })
      );
      setResumen(resumenArr);
    } catch {
      setQueryError('Error de conexión al consultar gastos');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCategoria, filtroFechaInicio, filtroFechaFin, filtroMontoMin, filtroMontoMax]);

  function handleClearFilters() {
    setFiltroCategoria('');
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    setFiltroMontoMin('');
    setFiltroMontoMax('');
    setFilterError('');
    setGastos([]);
    setResumen([]);
  }

  // Load initial data on mount
  useEffect(() => {
    handleQuery();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Table columns ---
  const columns = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: GastoItem) => formatDate(item.fecha),
    },
    {
      key: 'concepto',
      header: 'Concepto',
      render: (item: GastoItem) => (
        <span className="max-w-[200px] truncate block" title={item.concepto}>
          {item.concepto}
        </span>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      render: (item: GastoItem) => (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-wood-100 text-wood-700">
          {CATEGORIA_LABELS[item.categoria] || item.categoria}
        </span>
      ),
    },
    {
      key: 'monto',
      header: 'Monto',
      render: (item: GastoItem) => (
        <span className="font-medium text-fire-700">{formatCurrency(item.monto)}</span>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-wood-900">Gastos</h1>
        <p className="text-sm text-wood-600 mt-1">
          Registra y consulta los gastos del negocio
        </p>
      </div>

      {/* Registration Form */}
      <section className="bg-white rounded-xl border border-wood-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-wood-800 mb-4">Registrar Gasto</h2>

        {successMsg && (
          <Alert variant="success" className="mb-4" onDismiss={() => setSuccessMsg('')}>
            {successMsg}
          </Alert>
        )}

        {formErrors.general && (
          <Alert variant="error" className="mb-4" onDismiss={() => setFormErrors({})}>
            {formErrors.general}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Monto ($)"
            type="number"
            step="0.01"
            min="0.01"
            max="999999.99"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            error={formErrors.monto}
          />

          <Input
            label="Concepto"
            type="text"
            maxLength={200}
            placeholder="Descripción del gasto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            error={formErrors.concepto}
            helperText={`${concepto.length}/200`}
          />

          <div className="w-full">
            <label htmlFor="categoria-select" className="block text-sm font-medium text-wood-700 mb-1">
              Categoría
            </label>
            <select
              id="categoria-select"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={`
                w-full px-3 py-2 rounded-lg border text-sm
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-1
                ${formErrors.categoria
                  ? 'border-fire-400 focus:ring-fire-300 bg-fire-50'
                  : 'border-wood-300 focus:ring-brand-300 focus:border-brand-400 bg-white'
                }
              `}
              aria-invalid={formErrors.categoria ? 'true' : 'false'}
            >
              <option value="">Seleccionar...</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORIA_LABELS[cat]}
                </option>
              ))}
            </select>
            {formErrors.categoria && (
              <p className="mt-1 text-xs text-fire-600" role="alert">{formErrors.categoria}</p>
            )}
          </div>

          <Input
            label="Fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={formErrors.fecha}
          />

          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <Button type="submit" loading={submitting}>
              Registrar Gasto
            </Button>
          </div>
        </form>
      </section>

      {/* Filters Section */}
      <section className="bg-white rounded-xl border border-wood-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-wood-800 mb-4">Consultar Gastos</h2>

        {filterError && (
          <Alert variant="warning" className="mb-4" onDismiss={() => setFilterError('')}>
            {filterError}
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <div className="w-full">
            <label htmlFor="filtro-categoria" className="block text-sm font-medium text-wood-700 mb-1">
              Categoría
            </label>
            <select
              id="filtro-categoria"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-wood-300 text-sm
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-300 focus:border-brand-400 bg-white"
            >
              <option value="">Todas</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORIA_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Fecha inicio"
            type="date"
            value={filtroFechaInicio}
            onChange={(e) => setFiltroFechaInicio(e.target.value)}
          />

          <Input
            label="Fecha fin"
            type="date"
            value={filtroFechaFin}
            onChange={(e) => setFiltroFechaFin(e.target.value)}
          />

          <Input
            label="Monto mín."
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={filtroMontoMin}
            onChange={(e) => setFiltroMontoMin(e.target.value)}
          />

          <Input
            label="Monto máx."
            type="number"
            step="0.01"
            min="0"
            placeholder="999999.99"
            value={filtroMontoMax}
            onChange={(e) => setFiltroMontoMax(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={handleQuery} loading={loading}>
            Buscar
          </Button>
          <Button variant="secondary" onClick={handleClearFilters}>
            Limpiar filtros
          </Button>
        </div>
      </section>

      {/* Query Error */}
      {queryError && (
        <Alert variant="error" onDismiss={() => setQueryError('')}>
          {queryError}
        </Alert>
      )}

      {/* Category Summary */}
      {resumen.length > 0 && (
        <section className="bg-white rounded-xl border border-wood-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-wood-800 mb-4">Resumen por Categoría</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resumen.map((r) => (
              <div
                key={r.categoria}
                className="bg-brand-50 border border-brand-200 rounded-lg p-4"
              >
                <p className="text-sm font-medium text-wood-700">
                  {CATEGORIA_LABELS[r.categoria] || r.categoria}
                </p>
                <p className="text-xl font-bold text-brand-700 mt-1">
                  {formatCurrency(r.total)}
                </p>
                <p className="text-xs text-wood-500 mt-0.5">
                  {r.cantidad} {r.cantidad === 1 ? 'registro' : 'registros'}
                </p>
              </div>
            ))}
            {/* Grand total card */}
            <div className="bg-fire-50 border border-fire-200 rounded-lg p-4">
              <p className="text-sm font-medium text-wood-700">Total General</p>
              <p className="text-xl font-bold text-fire-700 mt-1">
                {formatCurrency(resumen.reduce((sum, r) => sum + r.total, 0))}
              </p>
              <p className="text-xs text-wood-500 mt-0.5">
                {resumen.reduce((sum, r) => sum + r.cantidad, 0)} registros
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Results Table */}
      <section>
        <Table
          columns={columns}
          data={gastos}
          keyExtractor={(item) => item.id}
          emptyMessage="No se encontraron gastos con los filtros seleccionados"
        />
      </section>
    </div>
  );
}
