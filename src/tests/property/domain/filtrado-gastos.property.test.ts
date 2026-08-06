import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filtrarGastos, GastoFiltrable, FiltroGasto } from '@/domain/services';
import { CategoriaGasto } from '@/domain/value-objects';

/**
 * Property 10: Correctitud de Filtrado de Gastos
 *
 * **Validates: Requirements 3.3**
 *
 * Para cualquier conjunto de gastos almacenados y cualquier combinación de filtros
 * (categoría, rango de fechas, rango de monto), todos los resultados retornados deben
 * satisfacer todos los filtros aplicados, y ningún gasto que satisfaga los filtros debe
 * ser omitido del resultado.
 */
describe('Property 10: Correctitud de Filtrado de Gastos', () => {
  const categoriasValues = Object.values(CategoriaGasto);

  /**
   * Generador de CategoriaGasto aleatoria.
   */
  const categoriaArb = fc.constantFrom(...categoriasValues);

  /**
   * Generador de fechas dentro de un rango razonable (año 2023-2025).
   */
  const fechaArb = fc
    .integer({ min: new Date(2023, 0, 1).getTime(), max: new Date(2025, 11, 31).getTime() })
    .map((ts) => new Date(ts));

  /**
   * Generador de montos válidos (0.01 - 999999.99 con max 2 decimales).
   */
  const montoArb = fc.integer({ min: 1, max: 99999999 }).map((n) => n / 100);

  /**
   * Generador de un gasto filtrable.
   */
  const gastoArb: fc.Arbitrary<GastoFiltrable> = fc.record({
    id: fc.uuid(),
    monto: montoArb,
    concepto: fc.string({ minLength: 1, maxLength: 50 }),
    categoria: categoriaArb,
    fecha: fechaArb,
  });

  /**
   * Generador de filtros opcionales.
   * Cada campo del filtro tiene ~50% de probabilidad de estar presente.
   */
  const filtroArb: fc.Arbitrary<FiltroGasto> = fc
    .record({
      categoria: fc.option(categoriaArb, { nil: undefined }),
      fechaInicio: fc.option(fechaArb, { nil: undefined }),
      fechaFin: fc.option(fechaArb, { nil: undefined }),
      montoMin: fc.option(montoArb, { nil: undefined }),
      montoMax: fc.option(montoArb, { nil: undefined }),
    })
    .map((f) => {
      const filtro: FiltroGasto = {};
      if (f.categoria !== undefined) filtro.categoria = f.categoria;
      if (f.fechaInicio !== undefined && f.fechaFin !== undefined) {
        // Ensure fechaInicio <= fechaFin
        if (f.fechaInicio <= f.fechaFin) {
          filtro.fechaInicio = f.fechaInicio;
          filtro.fechaFin = f.fechaFin;
        } else {
          filtro.fechaInicio = f.fechaFin;
          filtro.fechaFin = f.fechaInicio;
        }
      } else if (f.fechaInicio !== undefined) {
        filtro.fechaInicio = f.fechaInicio;
      } else if (f.fechaFin !== undefined) {
        filtro.fechaFin = f.fechaFin;
      }
      if (f.montoMin !== undefined && f.montoMax !== undefined) {
        // Ensure montoMin <= montoMax
        if (f.montoMin <= f.montoMax) {
          filtro.montoMin = f.montoMin;
          filtro.montoMax = f.montoMax;
        } else {
          filtro.montoMin = f.montoMax;
          filtro.montoMax = f.montoMin;
        }
      } else if (f.montoMin !== undefined) {
        filtro.montoMin = f.montoMin;
      } else if (f.montoMax !== undefined) {
        filtro.montoMax = f.montoMax;
      }
      return filtro;
    });

  /**
   * Helper: verifica si un gasto satisface todos los filtros.
   */
  function satisfaceFiltros(gasto: GastoFiltrable, filtros: FiltroGasto): boolean {
    if (filtros.categoria !== undefined && gasto.categoria !== filtros.categoria) {
      return false;
    }
    if (filtros.fechaInicio !== undefined && gasto.fecha < filtros.fechaInicio) {
      return false;
    }
    if (filtros.fechaFin !== undefined && gasto.fecha > filtros.fechaFin) {
      return false;
    }
    if (filtros.montoMin !== undefined && gasto.monto < filtros.montoMin) {
      return false;
    }
    if (filtros.montoMax !== undefined && gasto.monto > filtros.montoMax) {
      return false;
    }
    return true;
  }

  it('todos los resultados satisfacen todos los filtros aplicados (soundness)', () => {
    fc.assert(
      fc.property(
        fc.array(gastoArb, { minLength: 0, maxLength: 30 }),
        filtroArb,
        (gastos, filtros) => {
          const resultados = filtrarGastos(gastos, filtros);

          for (const resultado of resultados) {
            expect(satisfaceFiltros(resultado, filtros)).toBe(true);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('ningún gasto que satisface todos los filtros es omitido (completeness)', () => {
    fc.assert(
      fc.property(
        fc.array(gastoArb, { minLength: 0, maxLength: 30 }),
        filtroArb,
        (gastos, filtros) => {
          const resultados = filtrarGastos(gastos, filtros);
          const idsResultados = new Set(resultados.map((r) => r.id));

          for (const gasto of gastos) {
            if (satisfaceFiltros(gasto, filtros)) {
              expect(idsResultados.has(gasto.id)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('con filtros vacíos, todos los gastos son retornados', () => {
    fc.assert(
      fc.property(
        fc.array(gastoArb, { minLength: 0, maxLength: 30 }),
        (gastos) => {
          const resultados = filtrarGastos(gastos, {});

          expect(resultados.length).toBe(gastos.length);
          const idsResultados = new Set(resultados.map((r) => r.id));
          for (const gasto of gastos) {
            expect(idsResultados.has(gasto.id)).toBe(true);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('el resultado es siempre un subconjunto del input', () => {
    fc.assert(
      fc.property(
        fc.array(gastoArb, { minLength: 0, maxLength: 30 }),
        filtroArb,
        (gastos, filtros) => {
          const resultados = filtrarGastos(gastos, filtros);
          const idsInput = new Set(gastos.map((g) => g.id));

          expect(resultados.length).toBeLessThanOrEqual(gastos.length);
          for (const resultado of resultados) {
            expect(idsInput.has(resultado.id)).toBe(true);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});
