import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CorteService, PedidoData, GastoData } from '@/domain/services';

/**
 * Property 7: Correctitud del Cálculo de Cortes Financieros
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 *
 * Para cualquier conjunto de pedidos completados y gastos registrados en un período
 * determinado, el corte financiero debe reportar:
 * - total de ventas = suma de todos los totales de pedidos completados
 * - total de gastos = suma de todos los gastos
 * - ganancia neta = ventas - gastos
 * - ticket promedio = ventas / número de pedidos (o 0 si no hay pedidos)
 * - número de pedidos = conteo de pedidos en el período
 */
describe('Property 7: Correctitud del Cálculo de Cortes Financieros', () => {
  const service = new CorteService();

  // Fecha fija de referencia para generar datos dentro del mismo día
  const FECHA_REFERENCIA = new Date(2024, 5, 15, 12, 0, 0, 0); // 15 Junio 2024

  /**
   * Generador de una fecha dentro del mismo día que FECHA_REFERENCIA.
   * Genera horas aleatorias entre 00:00 y 23:59.
   */
  const fechaEnDiaArb = fc
    .record({
      hora: fc.integer({ min: 0, max: 23 }),
      minuto: fc.integer({ min: 0, max: 59 }),
      segundo: fc.integer({ min: 0, max: 59 }),
    })
    .map(({ hora, minuto, segundo }) =>
      new Date(2024, 5, 15, hora, minuto, segundo, 0)
    );

  /**
   * Generador de montos válidos (0.01 - 9999.99 con max 2 decimales).
   * Usamos enteros divididos por 100 para evitar problemas de punto flotante.
   */
  const montoArb = fc.integer({ min: 1, max: 999999 }).map((n) => n / 100);

  /**
   * Generador de items de un pedido.
   */
  const itemArb = fc.record({
    productoId: fc.uuid(),
    nombre: fc.string({ minLength: 1, maxLength: 30 }),
    cantidad: fc.integer({ min: 1, max: 10 }),
  });

  /**
   * Generador de PedidoData con fecha dentro del día de referencia.
   */
  const pedidoDataArb = fc
    .record({
      total: montoArb,
      items: fc.array(itemArb, { minLength: 1, maxLength: 5 }),
      creadoEn: fechaEnDiaArb,
    });

  /**
   * Generador de GastoData con fecha dentro del día de referencia.
   */
  const gastoDataArb = fc
    .record({
      monto: montoArb,
      fecha: fechaEnDiaArb,
    });

  it('totalVentas === suma de todos los pedido.total en el período', () => {
    fc.assert(
      fc.property(
        fc.array(pedidoDataArb, { minLength: 0, maxLength: 20 }),
        fc.array(gastoDataArb, { minLength: 0, maxLength: 10 }),
        (pedidos, gastos) => {
          const corte = service.generarCorte('diario', pedidos, gastos, FECHA_REFERENCIA);

          const sumaEsperada = pedidos.reduce((sum, p) => sum + p.total, 0);

          expect(corte.totalVentas).toBeCloseTo(sumaEsperada, 10);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('totalGastos === suma de todos los gasto.monto en el período', () => {
    fc.assert(
      fc.property(
        fc.array(pedidoDataArb, { minLength: 0, maxLength: 10 }),
        fc.array(gastoDataArb, { minLength: 0, maxLength: 20 }),
        (pedidos, gastos) => {
          const corte = service.generarCorte('diario', pedidos, gastos, FECHA_REFERENCIA);

          const sumaEsperada = gastos.reduce((sum, g) => sum + g.monto, 0);

          expect(corte.totalGastos).toBeCloseTo(sumaEsperada, 10);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('gananciaNeta === totalVentas - totalGastos', () => {
    fc.assert(
      fc.property(
        fc.array(pedidoDataArb, { minLength: 0, maxLength: 15 }),
        fc.array(gastoDataArb, { minLength: 0, maxLength: 15 }),
        (pedidos, gastos) => {
          const corte = service.generarCorte('diario', pedidos, gastos, FECHA_REFERENCIA);

          const gananciaEsperada = corte.totalVentas - corte.totalGastos;

          expect(corte.gananciaNeta).toBeCloseTo(gananciaEsperada, 10);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('ticketPromedio === totalVentas / numeroPedidos (o 0 si no hay pedidos)', () => {
    fc.assert(
      fc.property(
        fc.array(pedidoDataArb, { minLength: 0, maxLength: 20 }),
        fc.array(gastoDataArb, { minLength: 0, maxLength: 10 }),
        (pedidos, gastos) => {
          const corte = service.generarCorte('diario', pedidos, gastos, FECHA_REFERENCIA);

          if (pedidos.length === 0) {
            expect(corte.ticketPromedio).toBe(0);
          } else {
            const ticketEsperado = corte.totalVentas / pedidos.length;
            expect(corte.ticketPromedio).toBeCloseTo(ticketEsperado, 10);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('numeroPedidos === conteo de pedidos en el período', () => {
    fc.assert(
      fc.property(
        fc.array(pedidoDataArb, { minLength: 0, maxLength: 20 }),
        fc.array(gastoDataArb, { minLength: 0, maxLength: 5 }),
        (pedidos, gastos) => {
          const corte = service.generarCorte('diario', pedidos, gastos, FECHA_REFERENCIA);

          expect(corte.numeroPedidos).toBe(pedidos.length);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('solo se contabilizan pedidos y gastos dentro del período (filtrado correcto)', () => {
    // Generar pedidos/gastos tanto dentro como fuera del período
    const fechaFueraArb = fc.constantFrom(
      new Date(2024, 5, 14, 23, 59, 59, 0),  // día anterior
      new Date(2024, 5, 16, 0, 0, 1, 0),     // día siguiente
      new Date(2024, 4, 15, 12, 0, 0, 0),    // mes anterior
    );

    const pedidoFueraArb = fc
      .record({
        total: montoArb,
        items: fc.array(itemArb, { minLength: 1, maxLength: 3 }),
        creadoEn: fechaFueraArb,
      });

    const gastoFueraArb = fc
      .record({
        monto: montoArb,
        fecha: fechaFueraArb,
      });

    fc.assert(
      fc.property(
        fc.array(pedidoDataArb, { minLength: 1, maxLength: 10 }),
        fc.array(pedidoFueraArb, { minLength: 1, maxLength: 5 }),
        fc.array(gastoDataArb, { minLength: 1, maxLength: 10 }),
        fc.array(gastoFueraArb, { minLength: 1, maxLength: 5 }),
        (pedidosDentro, pedidosFuera, gastosDentro, gastosFuera) => {
          const todosPedidos = [...pedidosDentro, ...pedidosFuera];
          const todosGastos = [...gastosDentro, ...gastosFuera];

          const corte = service.generarCorte('diario', todosPedidos, todosGastos, FECHA_REFERENCIA);

          // Solo deben contabilizarse los que están dentro del período
          const ventasEsperadas = pedidosDentro.reduce((sum, p) => sum + p.total, 0);
          const gastosEsperados = gastosDentro.reduce((sum, g) => sum + g.monto, 0);

          expect(corte.totalVentas).toBeCloseTo(ventasEsperadas, 10);
          expect(corte.totalGastos).toBeCloseTo(gastosEsperados, 10);
          expect(corte.numeroPedidos).toBe(pedidosDentro.length);
          expect(corte.gananciaNeta).toBeCloseTo(ventasEsperadas - gastosEsperados, 10);
        }
      ),
      { numRuns: 300 }
    );
  });
});
