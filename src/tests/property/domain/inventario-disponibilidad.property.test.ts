import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InventarioService } from '@/domain/services';
import { ArticuloInventario } from '@/domain/entities';

/**
 * Property 5: Consistencia Inventario-Disponibilidad de Producto
 *
 * **Validates: Requirements 4.4, 4.5, 10.3**
 *
 * Para cualquier producto con ingredientes asociados en inventario:
 * - Si TODOS los artículos tienen cantidad > 0 → verificarDisponibilidad retorna true
 * - Si ALGÚN artículo tiene cantidad === 0 → verificarDisponibilidad retorna false
 * - Si el array de artículos está vacío → verificarDisponibilidad retorna false
 */
describe('Property 5: Consistencia Inventario-Disponibilidad de Producto', () => {
  const inventarioService = new InventarioService();

  /**
   * Generador de un ArticuloInventario con cantidad positiva (> 0).
   */
  const articuloConStockArb = fc
    .record({
      id: fc.uuid(),
      nombre: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
      cantidad: fc.integer({ min: 1, max: 999_999 }),
      unidadMedida: fc.constantFrom('kg', 'litros', 'unidades', 'gramos', 'piezas'),
      nivelMinimo: fc.integer({ min: 1, max: 100 }),
    })
    .map((props) =>
      ArticuloInventario.crear(props)
    );

  /**
   * Generador de un ArticuloInventario con cantidad === 0 (agotado).
   */
  const articuloAgotadoArb = fc
    .record({
      id: fc.uuid(),
      nombre: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
      unidadMedida: fc.constantFrom('kg', 'litros', 'unidades', 'gramos', 'piezas'),
      nivelMinimo: fc.integer({ min: 1, max: 100 }),
    })
    .map((props) =>
      ArticuloInventario.crear({ ...props, cantidad: 0 })
    );

  it('todos los artículos con cantidad > 0 → producto disponible (true)', () => {
    fc.assert(
      fc.property(
        fc.array(articuloConStockArb, { minLength: 1, maxLength: 10 }),
        fc.uuid(),
        (articulos, productoId) => {
          const resultado = inventarioService.verificarDisponibilidad(productoId, articulos);
          expect(resultado).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('al menos un artículo con cantidad === 0 → producto no disponible (false)', () => {
    fc.assert(
      fc.property(
        fc.array(articuloConStockArb, { minLength: 0, maxLength: 5 }),
        articuloAgotadoArb,
        fc.array(articuloConStockArb, { minLength: 0, maxLength: 5 }),
        fc.uuid(),
        (antes, agotado, despues, productoId) => {
          const articulos = [...antes, agotado, ...despues];
          const resultado = inventarioService.verificarDisponibilidad(productoId, articulos);
          expect(resultado).toBe(false);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('array de artículos vacío → producto no disponible (false)', () => {
    fc.assert(
      fc.property(fc.uuid(), (productoId) => {
        const resultado = inventarioService.verificarDisponibilidad(productoId, []);
        expect(resultado).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
