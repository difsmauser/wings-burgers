import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InventarioService } from '@/domain/services';
import { ArticuloInventario } from '@/domain/entities';

/**
 * Property 6: Decremento de Inventario al Confirmar Pedido
 *
 * **Validates: Requirements 4.6**
 *
 * Para cualquier pedido confirmado que contenga N unidades de un producto
 * que requiere X unidades de un artículo según su receta, el inventario
 * de ese artículo debe decrementarse exactamente en N × X unidades tras
 * la confirmación. Si N × X > cantidad actual, el artículo va a 0 (no negativo).
 */
describe('Property 6: Decremento de Inventario al Confirmar Pedido', () => {
  const inventarioService = new InventarioService();

  /**
   * Generador de cantidad de inventario disponible (1-1000).
   */
  const cantidadInventarioArb = fc.integer({ min: 1, max: 1000 });

  /**
   * Generador de cantidad de items en pedido (1-10).
   */
  const cantidadPedidoArb = fc.integer({ min: 1, max: 10 });

  /**
   * Generador de cantidad requerida por receta (1-5 unidades de artículo por unidad de producto).
   */
  const cantidadRequeridaArb = fc.integer({ min: 1, max: 5 });

  /**
   * Generador de nivel mínimo válido (1-100).
   */
  const nivelMinimoArb = fc.integer({ min: 1, max: 100 });

  it('decrementar por pedido reduce exactamente N × X unidades cuando hay suficiente inventario', () => {
    fc.assert(
      fc.property(
        cantidadPedidoArb,
        cantidadRequeridaArb,
        cantidadInventarioArb,
        nivelMinimoArb,
        (cantidadPedido, cantidadRequerida, cantidadInicial, nivelMinimo) => {
          // Precondición: hay suficiente inventario para cubrir el decremento
          const decrementoTotal = cantidadPedido * cantidadRequerida;
          fc.pre(cantidadInicial >= decrementoTotal);

          // Crear artículo de inventario
          const articulo = ArticuloInventario.crear({
            id: 'art-1',
            nombre: 'Ingrediente A',
            cantidad: cantidadInicial,
            unidadMedida: 'unidades',
            nivelMinimo,
          });

          // Configurar items del pedido y mapa de artículos por producto
          const items = [{ productoId: 'prod-1', cantidad: cantidadPedido }];
          const articulosPorProducto = new Map([
            ['prod-1', [{ articulo, cantidadRequerida }]],
          ]);

          // Ejecutar decremento
          const movimientos = inventarioService.decrementarPorPedido(
            items,
            articulosPorProducto
          );

          // Verificar decremento exacto de N × X
          expect(articulo.cantidad).toBe(cantidadInicial - decrementoTotal);

          // Verificar que se generó exactamente un movimiento
          expect(movimientos).toHaveLength(1);

          // Verificar datos del movimiento
          expect(movimientos[0].cantidadAnterior).toBe(cantidadInicial);
          expect(movimientos[0].cantidadNueva).toBe(cantidadInicial - decrementoTotal);
          expect(movimientos[0].tipoMovimiento).toBe('salida');
          expect(movimientos[0].articuloId).toBe('art-1');
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('decrementar por pedido lleva la cantidad a 0 (no negativa) cuando N × X > cantidad actual', () => {
    fc.assert(
      fc.property(
        cantidadPedidoArb,
        cantidadRequeridaArb,
        cantidadInventarioArb,
        nivelMinimoArb,
        (cantidadPedido, cantidadRequerida, cantidadInicial, nivelMinimo) => {
          // Precondición: el decremento excede el inventario disponible
          const decrementoTotal = cantidadPedido * cantidadRequerida;
          fc.pre(decrementoTotal > cantidadInicial);

          // Crear artículo de inventario
          const articulo = ArticuloInventario.crear({
            id: 'art-2',
            nombre: 'Ingrediente B',
            cantidad: cantidadInicial,
            unidadMedida: 'gramos',
            nivelMinimo,
          });

          // Configurar items del pedido y mapa de artículos por producto
          const items = [{ productoId: 'prod-2', cantidad: cantidadPedido }];
          const articulosPorProducto = new Map([
            ['prod-2', [{ articulo, cantidadRequerida }]],
          ]);

          // Ejecutar decremento
          const movimientos = inventarioService.decrementarPorPedido(
            items,
            articulosPorProducto
          );

          // Verificar que la cantidad NO es negativa, debe ser 0
          expect(articulo.cantidad).toBe(0);
          expect(articulo.cantidad).toBeGreaterThanOrEqual(0);

          // Verificar datos del movimiento
          expect(movimientos).toHaveLength(1);
          expect(movimientos[0].cantidadAnterior).toBe(cantidadInicial);
          expect(movimientos[0].cantidadNueva).toBe(0);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('decrementar por pedido con múltiples productos decrementa cada artículo correctamente', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(cantidadPedidoArb, cantidadRequeridaArb, cantidadInventarioArb),
          { minLength: 2, maxLength: 5 }
        ),
        nivelMinimoArb,
        (productoData, nivelMinimo) => {
          // Crear artículos de inventario para cada producto
          const articulos = productoData.map(([, , cantidadInicial], idx) =>
            ArticuloInventario.crear({
              id: `art-${idx}`,
              nombre: `Ingrediente ${idx}`,
              cantidad: cantidadInicial,
              unidadMedida: 'unidades',
              nivelMinimo,
            })
          );

          // Configurar items del pedido y mapa de artículos por producto
          const items = productoData.map(([cantidadPedido], idx) => ({
            productoId: `prod-${idx}`,
            cantidad: cantidadPedido,
          }));

          const articulosPorProducto = new Map(
            productoData.map(([, cantidadRequerida], idx) => [
              `prod-${idx}`,
              [{ articulo: articulos[idx], cantidadRequerida }],
            ])
          );

          // Guardar cantidades iniciales
          const cantidadesIniciales = articulos.map((a) => a.cantidad);

          // Ejecutar decremento
          const movimientos = inventarioService.decrementarPorPedido(
            items,
            articulosPorProducto
          );

          // Verificar que se generó un movimiento por cada artículo
          expect(movimientos).toHaveLength(productoData.length);

          // Verificar decremento correcto para cada artículo
          productoData.forEach(([cantidadPedido, cantidadRequerida, cantidadInicial], idx) => {
            const decrementoEsperado = cantidadPedido * cantidadRequerida;
            const cantidadEsperada = Math.max(0, cantidadInicial - decrementoEsperado);

            expect(articulos[idx].cantidad).toBe(cantidadEsperada);
            expect(movimientos[idx].cantidadAnterior).toBe(cantidadesIniciales[idx]);
            expect(movimientos[idx].cantidadNueva).toBe(cantidadEsperada);
            expect(movimientos[idx].articuloId).toBe(`art-${idx}`);
          });
        }
      ),
      { numRuns: 500 }
    );
  });

  it('decrementar por pedido con producto que tiene múltiples artículos en receta decrementa todos', () => {
    fc.assert(
      fc.property(
        cantidadPedidoArb,
        fc.array(
          fc.tuple(cantidadRequeridaArb, cantidadInventarioArb),
          { minLength: 2, maxLength: 4 }
        ),
        nivelMinimoArb,
        (cantidadPedido, articulosData, nivelMinimo) => {
          // Un producto requiere múltiples artículos de inventario
          const articulos = articulosData.map(([, cantidadInicial], idx) =>
            ArticuloInventario.crear({
              id: `art-multi-${idx}`,
              nombre: `Ingrediente Multi ${idx}`,
              cantidad: cantidadInicial,
              unidadMedida: 'unidades',
              nivelMinimo,
            })
          );

          // Configurar un solo item de pedido con múltiples artículos requeridos
          const items = [{ productoId: 'prod-multi', cantidad: cantidadPedido }];
          const articulosPorProducto = new Map([
            [
              'prod-multi',
              articulosData.map(([cantidadRequerida], idx) => ({
                articulo: articulos[idx],
                cantidadRequerida,
              })),
            ],
          ]);

          // Guardar cantidades iniciales
          const cantidadesIniciales = articulos.map((a) => a.cantidad);

          // Ejecutar decremento
          const movimientos = inventarioService.decrementarPorPedido(
            items,
            articulosPorProducto
          );

          // Verificar que se generó un movimiento por cada artículo de la receta
          expect(movimientos).toHaveLength(articulosData.length);

          // Verificar decremento correcto para cada artículo
          articulosData.forEach(([cantidadRequerida, cantidadInicial], idx) => {
            const decrementoEsperado = cantidadPedido * cantidadRequerida;
            const cantidadEsperada = Math.max(0, cantidadInicial - decrementoEsperado);

            expect(articulos[idx].cantidad).toBe(cantidadEsperada);
            expect(movimientos[idx].cantidadAnterior).toBe(cantidadesIniciales[idx]);
            expect(movimientos[idx].cantidadNueva).toBe(cantidadEsperada);
          });
        }
      ),
      { numRuns: 500 }
    );
  });
});
