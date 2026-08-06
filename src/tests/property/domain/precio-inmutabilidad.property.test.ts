import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Pedido } from '@/domain/entities';
import { Producto } from '@/domain/entities';
import { Precio, Categoria, ModalidadServicio } from '@/domain/value-objects';

/**
 * Property 3: Inmutabilidad de Precio en Pedidos Confirmados
 *
 * **Validates: Requirements 2.1**
 *
 * Para cualquier pedido ya confirmado y cualquier cambio posterior de precio
 * de un producto incluido en ese pedido, el total del pedido confirmado debe
 * permanecer sin cambios.
 *
 * El Pedido almacena una copia del precioUnitario (como Value Object Precio)
 * en cada PedidoDetalle al momento de agregar el item. Cambios posteriores
 * en el Producto no afectan al pedido.
 */
describe('Property 3: Inmutabilidad de Precio en Pedidos Confirmados', () => {
  /**
   * Generador de precios válidos para items de pedido.
   * Se limita a un rango que, multiplicado por cantidad (max 10) y con
   * impuestos (1.16x), no exceda el límite de Precio (99999.99).
   * Max safe: 99999.99 / 1.16 / 10 ≈ 8620.68
   * Mínimo suficiente para que impuestos > 0: ceil(0.01/0.16) = 0.07
   */
  const validPrecioArb = fc
    .double({ min: 1, max: 8000, noNaN: true, noDefaultInfinity: true })
    .map((v) => Math.round(v * 100) / 100)
    .filter((v) => v >= 1 && v <= 8000);

  /**
   * Generador de cantidades válidas para items (1-5).
   */
  const cantidadArb = fc.integer({ min: 1, max: 5 });

  /**
   * Generador de categorías válidas.
   */
  const categoriaArb = fc.constantFrom(
    Categoria.ALITAS,
    Categoria.HAMBURGUESAS,
    Categoria.BEBIDAS,
    Categoria.OTROS
  );

  /**
   * Generador de modalidades de servicio.
   */
  const modalidadArb = fc.constantFrom(
    ModalidadServicio.LOCAL,
    ModalidadServicio.DOMICILIO
  );

  it('el total de un pedido confirmado no cambia cuando se actualiza el precio del producto', () => {
    fc.assert(
      fc.property(
        validPrecioArb,
        validPrecioArb,
        cantidadArb,
        categoriaArb,
        modalidadArb,
        (precioInicial, precioNuevo, cantidad, categoria, modalidad) => {
          // Precondition: prices must be different to actually test immutability
          fc.pre(precioInicial !== precioNuevo);

          // 1. Crear producto con precio inicial
          const producto = Producto.crear({
            id: 'prod-1',
            nombre: 'Alitas BBQ',
            categoria,
            precio: Precio.crear(precioInicial),
          });

          // 2. Crear pedido y agregar item con el precio del producto
          const pedido = Pedido.crear({
            id: 'pedido-1',
            numero: 'P001',
            clienteId: 'cliente-1',
            modalidad,
          });

          pedido.agregarItem(
            { id: producto.id, nombre: producto.nombre, precio: producto.precio },
            cantidad
          );

          // 3. Confirmar el pedido (transición a EN_PREPARACION)
          pedido.confirmar();

          // 4. Registrar el total después de la confirmación
          const totalDespuesConfirmacion = pedido.total.valor;

          // 5. Cambiar el precio del producto (simula actualización posterior)
          producto.actualizarPrecio(Precio.crear(precioNuevo));

          // 6. Verificar que el total del pedido NO ha cambiado
          expect(pedido.total.valor).toBe(totalDespuesConfirmacion);

          // 7. Verificar que los items retienen el precioUnitario original
          expect(pedido.items[0].precioUnitario.valor).toBe(precioInicial);

          // 8. Verificar que el producto sí tiene el nuevo precio
          expect(producto.precio.valor).toBe(precioNuevo);
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Generador de precios más pequeños para test multi-item.
   * Con 5 items max, cantidad max 5: 5 * 5 * precio * 1.16 ≤ 99999.99
   * precio ≤ 99999.99 / (5*5*1.16) ≈ 3448 → usamos max 3000
   */
  const smallPrecioArb = fc
    .double({ min: 1, max: 3000, noNaN: true, noDefaultInfinity: true })
    .map((v) => Math.round(v * 100) / 100)
    .filter((v) => v >= 1 && v <= 3000);

  it('el total de un pedido confirmado con múltiples items no cambia al actualizar precios de productos', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(smallPrecioArb, smallPrecioArb, cantidadArb),
          { minLength: 1, maxLength: 5 }
        ),
        modalidadArb,
        (itemsData, modalidad) => {
          // 1. Crear productos con precios iniciales
          const productos = itemsData.map(([precioInicial, , ], idx) =>
            Producto.crear({
              id: `prod-${idx}`,
              nombre: `Producto ${idx}`,
              categoria: Categoria.ALITAS,
              precio: Precio.crear(precioInicial),
            })
          );

          // 2. Crear pedido y agregar todos los items
          const pedido = Pedido.crear({
            id: 'pedido-multi',
            numero: 'P002',
            clienteId: 'cliente-1',
            modalidad,
          });

          productos.forEach((producto, idx) => {
            const [, , cantidad] = itemsData[idx];
            pedido.agregarItem(
              { id: producto.id, nombre: producto.nombre, precio: producto.precio },
              cantidad
            );
          });

          // 3. Confirmar el pedido
          pedido.confirmar();

          // 4. Registrar total y precios unitarios después de confirmación
          const totalDespuesConfirmacion = pedido.total.valor;
          const preciosUnitariosOriginales = pedido.items.map(
            (item) => item.precioUnitario.valor
          );

          // 5. Cambiar precios de TODOS los productos
          productos.forEach((producto, idx) => {
            const [, precioNuevo] = itemsData[idx];
            producto.actualizarPrecio(Precio.crear(precioNuevo));
          });

          // 6. Verificar que el total del pedido NO ha cambiado
          expect(pedido.total.valor).toBe(totalDespuesConfirmacion);

          // 7. Verificar que cada item retiene su precioUnitario original
          pedido.items.forEach((item, idx) => {
            expect(item.precioUnitario.valor).toBe(preciosUnitariosOriginales[idx]);
          });
        }
      ),
      { numRuns: 500 }
    );
  });
});
