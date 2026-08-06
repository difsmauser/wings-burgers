import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Pedido } from '@/domain/entities';
import { Precio, ModalidadServicio } from '@/domain/value-objects';

/**
 * Property 14: Correctitud del Resumen de Cuenta
 *
 * **Validates: Requirements 9.1**
 *
 * Generar pedidos con N items, verificar:
 * - N líneas en resumen (pedido.items.length === N)
 * - subtotal === suma(precioUnitario.valor × cantidad) para todos los items
 * - impuestos === subtotal * 0.16 (redondeado a 2 decimales)
 * - total === subtotal + impuestos (redondeado a 2 decimales)
 */
describe('Property 14: Correctitud del Resumen de Cuenta', () => {
  const TASA_IMPUESTOS = 0.16;

  /**
   * Generador de precios válidos en rango seguro.
   * Usamos 1.00 - 500.00 para que con hasta 10 items × 5 cantidad
   * el subtotal no exceda Precio max (99,999.99).
   * Max posible: 10 × 500 × 5 = 25,000 → seguro.
   */
  const precioArb = fc
    .integer({ min: 100, max: 50000 })
    .map((n) => n / 100);

  /** Generador de cantidades válidas (1-5). */
  const cantidadArb = fc.integer({ min: 1, max: 5 });

  /** Generador de un item con datos necesarios para agregarItem. */
  const itemArb = fc.record({
    id: fc.uuid(),
    nombre: fc.string({ minLength: 1, maxLength: 50 }),
    precio: precioArb,
    cantidad: cantidadArb,
  });

  /** Crea un pedido vacío para pruebas. */
  function crearPedidoVacio(): Pedido {
    return Pedido.crear({
      id: crypto.randomUUID(),
      numero: 'PED-TEST-001',
      clienteId: crypto.randomUUID(),
      modalidad: ModalidadServicio.LOCAL,
    });
  }

  it('un pedido con N items tiene exactamente N entradas en el resumen', () => {
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

          // Property: N items agregados → exactamente N líneas en el resumen
          expect(pedido.items.length).toBe(items.length);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('subtotal === suma(precioUnitario.valor × cantidad) para todos los items', () => {
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

          // Calcular subtotal esperado
          const subtotalEsperado = pedido.items.reduce((acc, item) => {
            return acc + item.precioUnitario.valor * item.cantidad;
          }, 0);
          const subtotalRedondeado = Math.round(subtotalEsperado * 100) / 100;

          expect(pedido.subtotal.valor).toBe(subtotalRedondeado);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('impuestos === subtotal * 0.16 (redondeado a 2 decimales)', () => {
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

          // Property: impuestos = subtotal * 0.16 redondeado a 2 decimales
          const impuestosEsperados = Math.round(pedido.subtotal.valor * TASA_IMPUESTOS * 100) / 100;
          expect(pedido.impuestos.valor).toBe(impuestosEsperados);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('total === subtotal + impuestos (redondeado a 2 decimales)', () => {
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

          // Property: total = subtotal + impuestos redondeado a 2 decimales
          const totalEsperado = Math.round(
            (pedido.subtotal.valor + pedido.impuestos.valor) * 100
          ) / 100;
          expect(pedido.total.valor).toBe(totalEsperado);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('todas las propiedades del resumen se cumplen simultáneamente para cualquier pedido', () => {
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

          // 1. N líneas en resumen
          expect(pedido.items.length).toBe(items.length);

          // 2. subtotal = suma(precio × cantidad)
          const subtotalEsperado = Math.round(
            pedido.items.reduce((acc, item) => acc + item.precioUnitario.valor * item.cantidad, 0) * 100
          ) / 100;
          expect(pedido.subtotal.valor).toBe(subtotalEsperado);

          // 3. impuestos = subtotal * 0.16
          const impuestosEsperados = Math.round(subtotalEsperado * TASA_IMPUESTOS * 100) / 100;
          expect(pedido.impuestos.valor).toBe(impuestosEsperados);

          // 4. total = subtotal + impuestos
          const totalEsperado = Math.round((subtotalEsperado + impuestosEsperados) * 100) / 100;
          expect(pedido.total.valor).toBe(totalEsperado);
        }
      ),
      { numRuns: 500 }
    );
  });
});
