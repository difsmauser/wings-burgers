import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Pedido } from '@/domain/entities';
import { Precio, ModalidadServicio } from '@/domain/value-objects';

/**
 * Property 8: Consistencia del Total del Pedido
 *
 * **Validates: Requirements 7.2, 7.3**
 *
 * Para cualquier pedido y cualquier secuencia de operaciones (agregar producto,
 * eliminar producto, modificar cantidad), el total del pedido debe ser siempre
 * igual a la suma de (precio_unitario × cantidad) de cada item (sin IVA).
 */
describe('Property 8: Consistencia del Total del Pedido', () => {
  const TASA_IMPUESTOS = 0;

  /**
   * Helper: calcula el total esperado a partir de los items actuales del pedido.
   * Replica la lógica de redondeo de Pedido.recalcularTotal().
   */
  function calcularTotalEsperado(pedido: Pedido): {
    subtotal: number;
    impuestos: number;
    total: number;
  } {
    if (pedido.items.length === 0) {
      return { subtotal: 0.01, impuestos: 0.01, total: 0.01 };
    }

    const subtotalValor = pedido.items.reduce((acc, item) => {
      return acc + item.precioUnitario.valor * item.cantidad;
    }, 0);

    const subtotal = Math.round(subtotalValor * 100) / 100;
    const impuestosRaw = Math.round(subtotal * TASA_IMPUESTOS * 100) / 100;
    const impuestos = impuestosRaw > 0 ? impuestosRaw : 0.01;
    const total = Math.round((subtotal + impuestosRaw) * 100) / 100;

    return { subtotal, impuestos, total };
  }

  /**
   * Generador de precios válidos para items (1.00 - 199.99, max 2 decimales).
   * Usamos mínimo 1.00 para evitar que impuestos redondeen a 0 (necesitamos
   * subtotal * 0.16 >= 0.005 para que Precio.crear no falle).
   * Max teórico con 10 items × 199.99 × 5 = 9,999.50 (seguro dentro de Precio max).
   */
  const precioItemArb = fc
    .integer({ min: 100, max: 19999 })
    .map((n) => n / 100);

  /** Generador de cantidades válidas para items (1-5). */
  const cantidadArb = fc.integer({ min: 1, max: 5 });

  /** Generador de un item con id, nombre, precio y cantidad. */
  const itemArb = fc.record({
    id: fc.uuid(),
    nombre: fc.string({ minLength: 1, maxLength: 20 }),
    precio: precioItemArb,
    cantidad: cantidadArb,
  });

  /** Crea un pedido vacío para pruebas. */
  function crearPedidoVacio(): Pedido {
    return Pedido.crear({
      id: crypto.randomUUID(),
      numero: 'PED-001',
      clienteId: crypto.randomUUID(),
      modalidad: ModalidadServicio.LOCAL,
    });
  }

  /**
   * Tipos de operaciones que se pueden aplicar al pedido.
   */
  type Operacion =
    | { tipo: 'agregar'; id: string; nombre: string; precio: number; cantidad: number }
    | { tipo: 'eliminar'; indice: number }
    | { tipo: 'modificar'; indice: number; cantidad: number };

  /**
   * Generador de secuencias de operaciones.
   * Genera entre 1 y 15 operaciones aleatorias con precios seguros.
   */
  const precioOpArb = fc.integer({ min: 100, max: 9999 }).map((n) => n / 100);
  const operacionesArb = fc.array(
    fc.oneof(
      { weight: 3, arbitrary: fc.record({
        tipo: fc.constant('agregar' as const),
        id: fc.uuid(),
        nombre: fc.string({ minLength: 1, maxLength: 20 }),
        precio: precioOpArb,
        cantidad: cantidadArb,
      }) },
      { weight: 1, arbitrary: fc.record({
        tipo: fc.constant('eliminar' as const),
        indice: fc.nat({ max: 49 }),
      }) },
      { weight: 1, arbitrary: fc.record({
        tipo: fc.constant('modificar' as const),
        indice: fc.nat({ max: 49 }),
        cantidad: cantidadArb,
      }) }
    ),
    { minLength: 1, maxLength: 15 }
  );

  it('total siempre es consistente después de agregar múltiples items', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 10 }),
        (items) => {
          const pedido = crearPedidoVacio();

          for (const item of items) {
            pedido.agregarItem(
              { id: item.id, nombre: item.nombre, precio: Precio.crear(item.precio) },
              item.cantidad
            );

            // Verificar invariante después de cada operación
            const esperado = calcularTotalEsperado(pedido);
            expect(pedido.subtotal.valor).toBe(esperado.subtotal);
            expect(pedido.impuestos.valor).toBe(esperado.impuestos);
            expect(pedido.total.valor).toBe(esperado.total);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('total siempre es consistente después de secuencias aleatorias de operaciones', () => {
    fc.assert(
      fc.property(operacionesArb, (operaciones) => {
        const pedido = crearPedidoVacio();

        for (const op of operaciones) {
          switch (op.tipo) {
            case 'agregar': {
              if (pedido.items.length < 50) {
                pedido.agregarItem(
                  { id: op.id, nombre: op.nombre, precio: Precio.crear(op.precio) },
                  op.cantidad
                );
              }
              break;
            }
            case 'eliminar': {
              if (pedido.items.length > 0) {
                const idx = op.indice % pedido.items.length;
                pedido.eliminarItem(pedido.items[idx].id);
              }
              break;
            }
            case 'modificar': {
              if (pedido.items.length > 0) {
                const idx = op.indice % pedido.items.length;
                pedido.modificarCantidad(pedido.items[idx].id, op.cantidad);
              }
              break;
            }
          }

          // Verificar invariante después de CADA operación
          const esperado = calcularTotalEsperado(pedido);
          expect(pedido.subtotal.valor).toBe(esperado.subtotal);
          expect(pedido.impuestos.valor).toBe(esperado.impuestos);
          expect(pedido.total.valor).toBe(esperado.total);
        }
      }),
      { numRuns: 500 }
    );
  });

  it('total = subtotal + impuestos siempre se mantiene (sin IVA, total = subtotal)', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 10 }),
        (items) => {
          const pedido = crearPedidoVacio();

          for (const item of items) {
            pedido.agregarItem(
              { id: item.id, nombre: item.nombre, precio: Precio.crear(item.precio) },
              item.cantidad
            );
          }

          // Verify the structural invariant: total = subtotal (no tax)
          expect(pedido.total.valor).toBe(pedido.subtotal.valor);

          // Verify impuestos is the minimum value (0.01) since rate is 0
          expect(pedido.impuestos.valor).toBe(0.01);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('pedido vacío (sin items) tiene total mínimo de 0.01', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 5 }),
        (items) => {
          const pedido = crearPedidoVacio();

          // Agregar items
          for (const item of items) {
            pedido.agregarItem(
              { id: item.id, nombre: item.nombre, precio: Precio.crear(item.precio) },
              item.cantidad
            );
          }

          // Eliminar todos los items
          while (pedido.items.length > 0) {
            pedido.eliminarItem(pedido.items[0].id);
          }

          // Pedido vacío debe tener valores mínimos
          expect(pedido.subtotal.valor).toBe(0.01);
          expect(pedido.impuestos.valor).toBe(0.01);
          expect(pedido.total.valor).toBe(0.01);
        }
      ),
      { numRuns: 200 }
    );
  });
});
