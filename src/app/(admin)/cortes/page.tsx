'use client';

import { useState } from 'react';
import { Button, Alert } from '../_components';

// --- Types ---

type TipoCorte = 'diario' | 'semanal' | 'mensual';

interface ProductoVendido {
  productoId: string;
  nombre: string;
  cantidadVendida: number;
}

interface DesgloseItem {
  periodo: string;
  ventas: number;
  gastos: number;
  ganancia: number;
}

interface CorteData {
  tipo: TipoCorte;
  fechaInicio: string;
  fechaFin: string;
  totalVentas: number;
  totalGastos: number;
  gananciaNeta: number;
  numeroPedidos: number;
  ticketPromedio: number;
  top5Productos: ProductoVendido[];
  desglose: DesgloseItem[];
}

// --- Helpers ---

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateRange(inicio: string, fin: string): string {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const startStr = new Date(inicio).toLocaleDateString('es-MX', opts);
  const endStr = new Date(fin).toLocaleDateString('es-MX', opts);
  return startStr === endStr ? startStr : `${startStr} — ${endStr}`;
}

const TIPO_LABELS: Record<TipoCorte, string> = {
  diario: 'Diario',
  semanal: 'Semanal',
  mensual: 'Mensual',
};

const TIPO_DESCRIPTIONS: Record<TipoCorte, string> = {
  diario: 'Resumen del día seleccionado',
  semanal: 'Últimos 7 días desde la fecha',
  mensual: 'Mes calendario completo',
};

// --- Main Component ---

export default function CortesPage() {
  const [tipo, setTipo] = useState<TipoCorte>('diario');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [corte, setCorte] = useState<CorteData | null>(null);

  async function handleGenerarCorte() {
    setLoading(true);
    setError('');
    setCorte(null);

    try {
      const params = new URLSearchParams({ tipo });
      if (fecha) params.set('fecha', new Date(fecha).toISOString());

      const res = await fetch(`/api/cortes?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Error al generar corte');
        return;
      }

      const { data } = await res.json();
      setCorte(data as CorteData);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const noData =
    corte &&
    corte.totalVentas === 0 &&
    corte.totalGastos === 0 &&
    corte.numeroPedidos === 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-wood-900">Cortes Financieros</h1>
        <p className="text-sm text-wood-600 mt-1">
          Genera reportes financieros del negocio por período
        </p>
      </div>

      {/* Type Selector & Date */}
      <section className="bg-white rounded-xl border border-wood-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-wood-800 mb-4">Generar Reporte</h2>

        {/* Type selector cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {(['diario', 'semanal', 'mensual'] as TipoCorte[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-brand-300
                ${tipo === t
                  ? 'border-brand-500 bg-brand-50 shadow-sm'
                  : 'border-wood-200 bg-white hover:border-brand-300 hover:bg-brand-50/50'
                }
              `}
              aria-pressed={tipo === t}
            >
              <p className={`font-semibold ${tipo === t ? 'text-brand-700' : 'text-wood-700'}`}>
                {TIPO_LABELS[t]}
              </p>
              <p className="text-xs text-wood-500 mt-1">{TIPO_DESCRIPTIONS[t]}</p>
            </button>
          ))}
        </div>

        {/* Date picker and generate button */}
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-auto">
            <label htmlFor="corte-fecha" className="block text-sm font-medium text-wood-700 mb-1">
              Fecha de referencia
            </label>
            <input
              id="corte-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-lg border border-wood-300 text-sm
                focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-300 focus:border-brand-400 bg-white"
            />
          </div>
          <Button onClick={handleGenerarCorte} loading={loading}>
            Generar Corte
          </Button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <Alert variant="error" onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* No Data Message */}
      {noData && (
        <Alert variant="info" title="Sin datos">
          No se encontraron movimientos (ventas ni gastos) en el período seleccionado.
        </Alert>
      )}

      {/* Report Results */}
      {corte && !noData && (
        <>
          {/* Period header */}
          <div className="text-sm text-wood-600">
            Reporte <span className="font-medium">{TIPO_LABELS[corte.tipo]}</span>
            {' • '}
            {formatDateRange(corte.fechaInicio, corte.fechaFin)}
          </div>

          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Ventas"
              value={formatCurrency(corte.totalVentas)}
              icon="ventas"
              color="green"
            />
            <KpiCard
              label="Total Gastos"
              value={formatCurrency(corte.totalGastos)}
              icon="gastos"
              color="red"
            />
            <KpiCard
              label="Ganancia Neta"
              value={formatCurrency(corte.gananciaNeta)}
              icon="ganancia"
              color={corte.gananciaNeta >= 0 ? 'green' : 'red'}
            />
            <KpiCard
              label="Ticket Promedio"
              value={corte.numeroPedidos > 0 ? formatCurrency(corte.ticketPromedio) : '—'}
              icon="ticket"
              color="brand"
              subtitle={`${corte.numeroPedidos} pedido${corte.numeroPedidos === 1 ? '' : 's'}`}
            />
          </section>

          {/* Top 5 Products */}
          {corte.top5Productos.length > 0 && (
            <section className="bg-white rounded-xl border border-wood-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-wood-800 mb-4">Top 5 Productos</h2>
              <div className="space-y-3">
                {corte.top5Productos.map((prod, idx) => (
                  <div
                    key={prod.productoId}
                    className="flex items-center justify-between p-3 rounded-lg bg-brand-50/50 border border-brand-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                        ${idx === 0 ? 'bg-golden-200 text-golden-800' : 'bg-wood-200 text-wood-700'}
                      `}>
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-wood-800">{prod.nombre}</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-700">
                      {prod.cantidadVendida} vendido{prod.cantidadVendida === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Breakdown Table */}
          {corte.desglose.length > 1 && (
            <section className="bg-white rounded-xl border border-wood-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-wood-800 mb-4">
                Desglose {tipo === 'semanal' ? 'por Día' : 'por Semana'}
              </h2>
              <div className="overflow-x-auto rounded-lg border border-wood-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-wood-100 text-wood-700 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Período</th>
                      <th className="px-4 py-3 font-semibold text-right">Ventas</th>
                      <th className="px-4 py-3 font-semibold text-right">Gastos</th>
                      <th className="px-4 py-3 font-semibold text-right">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wood-100">
                    {corte.desglose.map((item) => (
                      <tr key={item.periodo} className="bg-white hover:bg-brand-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-wood-800">{item.periodo}</td>
                        <td className="px-4 py-3 text-right text-green-700">
                          {formatCurrency(item.ventas)}
                        </td>
                        <td className="px-4 py-3 text-right text-fire-700">
                          {formatCurrency(item.gastos)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          item.ganancia >= 0 ? 'text-green-700' : 'text-fire-700'
                        }`}>
                          {formatCurrency(item.ganancia)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// --- KPI Card Sub-component ---

interface KpiCardProps {
  label: string;
  value: string;
  icon: 'ventas' | 'gastos' | 'ganancia' | 'ticket';
  color: 'green' | 'red' | 'brand';
  subtitle?: string;
}

function KpiCard({ label, value, icon, color, subtitle }: KpiCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; iconBg: string }> = {
    green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100' },
    red: { bg: 'bg-fire-50', text: 'text-fire-700', iconBg: 'bg-fire-100' },
    brand: { bg: 'bg-brand-50', text: 'text-brand-700', iconBg: 'bg-brand-100' },
  };

  const c = colorClasses[color];

  const icons: Record<string, string> = {
    ventas: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
    gastos: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    ganancia: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    ticket: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  };

  return (
    <div className={`${c.bg} rounded-xl border border-wood-200 p-5`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`${c.iconBg} rounded-lg p-2`}>
          <svg className={`w-5 h-5 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[icon]} />
          </svg>
        </div>
        <span className="text-sm text-wood-600">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      {subtitle && <p className="text-xs text-wood-500 mt-1">{subtitle}</p>}
    </div>
  );
}
