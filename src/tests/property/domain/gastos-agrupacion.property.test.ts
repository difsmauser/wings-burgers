import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CategoriaGasto } from '@/domain/value-objects';

/**
 * Property 15: Correctitud de Agrupación de Gastos por Categoría
 *
 * **Validates: Requirements 3.5**
 *
 * Generar gastos aleatorios, verificar conteo y suma por categoría,
 * y que la suma de todas las categorías sea igual al total general.
 */

interface GastoInput {
  monto: number;
  categoria: CategoriaGasto;
}

interface GrupoCategoria {
  categoria: CategoriaGasto;
  total: number;
  cantidad: number;
}

/**
 * Función pura que agrupa gastos por categoría, calculando el total
 * y la cantidad de gastos para cada categoría presente.
 */
function agruparGastosPorCategoria(gastos: GastoInput[]): GrupoCategoria[] {
  const mapa = new Map<CategoriaGasto, { total: number; cantidad: number }>();

  for (const gasto of gastos) {
    const grupo = mapa.get(gasto.categoria);
    if (grupo) {
      grupo.total += gasto.monto;
      grupo.cantidad += 1;
    } else {
      mapa.set(gasto.categoria, { total: gasto.monto, cantidad: 1 });
    }
  }

  return Array.from(mapa.entries()).map(([categoria, { total, cantidad }]) => ({
    categoria,
    total,
    cantidad,
  }));
}

describe('Property 15: Correctitud de Agrupación de Gastos por Categoría', () => {
  const categorias = Object.values(CategoriaGasto);

  /**
   * Generador de montos válidos (0.01 - 9999.99 con max 2 decimales).
   */
  const montoArb = fc.integer({ min: 1, max: 999999 }).map((n) => n / 100);

  /**
   * Generador de categoría de gasto aleatoria.
   */
  const categoriaArb = fc.constantFrom(...categorias);

  /**
   * Generador de un gasto con monto y categoría aleatorios.
   */
  const gastoArb: fc.Arbitrary<GastoInput> = fc.record({
    monto: montoArb,
    categoria: categoriaArb,
  });

  /**
   * Generador de arrays de gastos.
   */
  const gastosArb = fc.array(gastoArb, { minLength: 0, maxLength: 50 });

  it('la suma de todos los totales por categoría === suma de todos los montos individuales', () => {
    fc.assert(
      fc.property(gastosArb, (gastos) => {
        const grupos = agruparGastosPorCategoria(gastos);

        const sumaTotalesGrupos = grupos.reduce((sum, g) => sum + g.total, 0);
        const sumaMontos = gastos.reduce((sum, g) => sum + g.monto, 0);

        expect(sumaTotalesGrupos).toBeCloseTo(sumaMontos, 10);
      }),
      { numRuns: 500 }
    );
  });

  it('la suma de todas las cantidades por categoría === número total de gastos', () => {
    fc.assert(
      fc.property(gastosArb, (gastos) => {
        const grupos = agruparGastosPorCategoria(gastos);

        const sumaCantidades = grupos.reduce((sum, g) => sum + g.cantidad, 0);

        expect(sumaCantidades).toBe(gastos.length);
      }),
      { numRuns: 500 }
    );
  });

  it('cada grupo contiene exactamente los gastos que tienen esa categoría', () => {
    fc.assert(
      fc.property(gastosArb, (gastos) => {
        const grupos = agruparGastosPorCategoria(gastos);

        for (const grupo of grupos) {
          const gastosDeCategoria = gastos.filter(
            (g) => g.categoria === grupo.categoria
          );
          expect(grupo.cantidad).toBe(gastosDeCategoria.length);
        }

        // No debe haber categorías presentes en gastos que no estén en grupos
        const categoriasEnGastos = new Set(gastos.map((g) => g.categoria));
        const categoriasEnGrupos = new Set(grupos.map((g) => g.categoria));
        expect(categoriasEnGrupos).toEqual(categoriasEnGastos);
      }),
      { numRuns: 500 }
    );
  });

  it('el total de cada categoría === suma de montos de gastos en esa categoría', () => {
    fc.assert(
      fc.property(gastosArb, (gastos) => {
        const grupos = agruparGastosPorCategoria(gastos);

        for (const grupo of grupos) {
          const sumaEsperada = gastos
            .filter((g) => g.categoria === grupo.categoria)
            .reduce((sum, g) => sum + g.monto, 0);

          expect(grupo.total).toBeCloseTo(sumaEsperada, 10);
        }
      }),
      { numRuns: 500 }
    );
  });

  it('la cantidad de cada categoría === conteo de gastos en esa categoría', () => {
    fc.assert(
      fc.property(gastosArb, (gastos) => {
        const grupos = agruparGastosPorCategoria(gastos);

        for (const grupo of grupos) {
          const conteoEsperado = gastos.filter(
            (g) => g.categoria === grupo.categoria
          ).length;

          expect(grupo.cantidad).toBe(conteoEsperado);
        }
      }),
      { numRuns: 500 }
    );
  });
});
