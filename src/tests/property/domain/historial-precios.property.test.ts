import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PrecioService } from '@/domain/services';
import { Producto } from '@/domain/entities';
import { Precio, Categoria } from '@/domain/value-objects';

/**
 * Property 4: Completitud del Historial de Precios
 *
 * **Validates: Requirements 2.2**
 *
 * Para cualquier secuencia de N cambios de precio aplicados a un producto,
 * el historial de precios debe contener exactamente N registros,
 * cada uno con el precio anterior y el precio nuevo correctos,
 * ordenados por fecha descendente.
 */
describe('Property 4: Completitud del Historial de Precios', () => {
  /**
   * Generador de precios válidos (0.01-99999.99, max 2 decimales).
   */
  const validPrecioArb = fc
    .double({ min: 0.01, max: 99_999.99, noNaN: true, noDefaultInfinity: true })
    .map((v) => Math.round(v * 100) / 100)
    .filter((v) => v >= 0.01 && v <= 99_999.99);

  /**
   * Generador de una secuencia de precios válidos (entre 1 y 20 cambios).
   */
  const precioSequenceArb = fc.array(validPrecioArb, { minLength: 1, maxLength: 20 });

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
   * Generador de nombres de producto válidos (no vacíos, no solo whitespace, max 100 chars).
   */
  const nombreProductoArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

  it('aplicar N cambios de precio produce exactamente N registros en el historial', () => {
    fc.assert(
      fc.property(
        validPrecioArb,
        precioSequenceArb,
        categoriaArb,
        fc.uuid(),
        nombreProductoArb,
        (precioInicial, nuevosPreciosValues, categoria, id, nombre) => {
          const service = new PrecioService();
          const producto = Producto.crear({
            id,
            nombre,
            categoria,
            precio: Precio.crear(precioInicial),
          });

          // Aplicar N cambios de precio
          for (const nuevoPrecioVal of nuevosPreciosValues) {
            service.actualizarPrecio(producto, Precio.crear(nuevoPrecioVal));
          }

          const historial = service.obtenerHistorial();

          // Debe haber exactamente N registros
          expect(historial).toHaveLength(nuevosPreciosValues.length);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('cada registro tiene precioAnterior y precioNuevo correctos', () => {
    fc.assert(
      fc.property(
        validPrecioArb,
        precioSequenceArb,
        categoriaArb,
        fc.uuid(),
        nombreProductoArb,
        (precioInicial, nuevosPreciosValues, categoria, id, nombre) => {
          const service = new PrecioService();
          const producto = Producto.crear({
            id,
            nombre,
            categoria,
            precio: Precio.crear(precioInicial),
          });

          // Construir la secuencia completa de precios: [inicial, ...nuevos]
          const secuenciaPrecios = [precioInicial, ...nuevosPreciosValues];

          // Guardar los registros en orden de creación
          const registrosCreados: { precioAnterior: number; precioNuevo: number }[] = [];

          // Aplicar N cambios y guardar cada resultado
          for (const nuevoPrecioVal of nuevosPreciosValues) {
            const registro = service.actualizarPrecio(producto, Precio.crear(nuevoPrecioVal));
            registrosCreados.push({
              precioAnterior: registro.precioAnterior,
              precioNuevo: registro.precioNuevo,
            });
          }

          // Verificar que cada registro creado tiene los datos correctos
          for (let i = 0; i < nuevosPreciosValues.length; i++) {
            expect(registrosCreados[i].precioAnterior).toBe(secuenciaPrecios[i]);
            expect(registrosCreados[i].precioNuevo).toBe(secuenciaPrecios[i + 1]);
          }

          // Verificar que obtenerHistorial() contiene los mismos datos
          const historial = service.obtenerHistorial();
          const historialPairs = historial.map((h) => ({
            precioAnterior: h.precioAnterior,
            precioNuevo: h.precioNuevo,
          }));

          // Cada registro creado debe estar en el historial
          for (const registro of registrosCreados) {
            expect(historialPairs).toContainEqual(registro);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  it('registros están ordenados por fechaCambio descendente', () => {
    fc.assert(
      fc.property(
        validPrecioArb,
        fc.array(validPrecioArb, { minLength: 2, maxLength: 15 }),
        categoriaArb,
        fc.uuid(),
        nombreProductoArb,
        (precioInicial, nuevosPreciosValues, categoria, id, nombre) => {
          const service = new PrecioService();
          const producto = Producto.crear({
            id,
            nombre,
            categoria,
            precio: Precio.crear(precioInicial),
          });

          for (const nuevoPrecioVal of nuevosPreciosValues) {
            service.actualizarPrecio(producto, Precio.crear(nuevoPrecioVal));
          }

          const historial = service.obtenerHistorial();

          // Verificar orden descendente por fecha
          for (let i = 0; i < historial.length - 1; i++) {
            expect(historial[i].fechaCambio.getTime()).toBeGreaterThanOrEqual(
              historial[i + 1].fechaCambio.getTime()
            );
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});
