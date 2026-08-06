import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Producto } from '@/domain/entities';
import { Precio, Categoria } from '@/domain/value-objects';
import { ValidacionError } from '@/shared/errors';

/**
 * Property 2: Validación de Producto
 *
 * **Validates: Requirements 1.1, 1.6**
 *
 * - Para cualquier combinación válida (nombre 1-100 chars, categoría válida, precio válido),
 *   Producto.crear debe tener éxito.
 * - Para cualquier combinación con campos faltantes (nombre vacío, sin categoría, sin precio),
 *   Producto.crear debe lanzar ValidacionError indicando los campos faltantes.
 * - Para nombre > 100 caracteres, Producto.crear debe lanzar ValidacionError.
 */
describe('Property 2: Validación de Producto', () => {
  /**
   * Generadores base
   */
  const precioArb = fc
    .double({ min: 0.01, max: 99_999.99, noNaN: true, noDefaultInfinity: true })
    .map((v) => Math.round(v * 100) / 100)
    .filter((v) => v >= 0.01 && v <= 99_999.99)
    .map((v) => Precio.crear(v));

  const categoriaArb = fc.constantFrom(...Object.values(Categoria));

  const nombreValidoArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

  const idArb = fc.uuid();

  it('combinación válida (nombre 1-100 chars, categoría válida, precio válido) → Producto.crear tiene éxito', () => {
    fc.assert(
      fc.property(idArb, nombreValidoArb, categoriaArb, precioArb, (id, nombre, categoria, precio) => {
        const producto = Producto.crear({ id, nombre, categoria, precio });
        expect(producto).toBeInstanceOf(Producto);
        expect(producto.nombre).toBe(nombre);
        expect(producto.categoria).toBe(categoria);
        expect(producto.precio).toBe(precio);
        expect(producto.activo).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  it('nombre vacío → Producto.crear lanza ValidacionError mencionando "nombre"', () => {
    fc.assert(
      fc.property(idArb, categoriaArb, precioArb, (id, categoria, precio) => {
        expect(() => Producto.crear({ id, nombre: '', categoria, precio })).toThrow(ValidacionError);
        try {
          Producto.crear({ id, nombre: '', categoria, precio });
        } catch (e) {
          expect(e).toBeInstanceOf(ValidacionError);
          expect((e as ValidacionError).message).toContain('nombre');
        }
      }),
      { numRuns: 200 }
    );
  });

  it('nombre solo espacios en blanco → Producto.crear lanza ValidacionError mencionando "nombre"', () => {
    const espaciosArb = fc
      .integer({ min: 1, max: 50 })
      .map((n) => ' '.repeat(n));

    fc.assert(
      fc.property(idArb, espaciosArb, categoriaArb, precioArb, (id, nombre, categoria, precio) => {
        expect(() => Producto.crear({ id, nombre, categoria, precio })).toThrow(ValidacionError);
        try {
          Producto.crear({ id, nombre, categoria, precio });
        } catch (e) {
          expect(e).toBeInstanceOf(ValidacionError);
          expect((e as ValidacionError).message).toContain('nombre');
        }
      }),
      { numRuns: 200 }
    );
  });

  it('sin categoría → Producto.crear lanza ValidacionError mencionando "categoria"', () => {
    fc.assert(
      fc.property(idArb, nombreValidoArb, precioArb, (id, nombre, precio) => {
        expect(() =>
          Producto.crear({ id, nombre, categoria: undefined as unknown as Categoria, precio })
        ).toThrow(ValidacionError);
        try {
          Producto.crear({ id, nombre, categoria: undefined as unknown as Categoria, precio });
        } catch (e) {
          expect(e).toBeInstanceOf(ValidacionError);
          expect((e as ValidacionError).message).toContain('categoria');
        }
      }),
      { numRuns: 200 }
    );
  });

  it('sin precio → Producto.crear lanza ValidacionError mencionando "precio"', () => {
    fc.assert(
      fc.property(idArb, nombreValidoArb, categoriaArb, (id, nombre, categoria) => {
        expect(() =>
          Producto.crear({ id, nombre, categoria, precio: undefined as unknown as Precio })
        ).toThrow(ValidacionError);
        try {
          Producto.crear({ id, nombre, categoria, precio: undefined as unknown as Precio });
        } catch (e) {
          expect(e).toBeInstanceOf(ValidacionError);
          expect((e as ValidacionError).message).toContain('precio');
        }
      }),
      { numRuns: 200 }
    );
  });

  it('nombre > 100 caracteres → Producto.crear lanza ValidacionError mencionando "nombre"', () => {
    const nombreLargoArb = fc
      .string({ minLength: 101, maxLength: 300 })
      .filter((s) => s.trim().length > 100);

    fc.assert(
      fc.property(idArb, nombreLargoArb, categoriaArb, precioArb, (id, nombre, categoria, precio) => {
        expect(() => Producto.crear({ id, nombre, categoria, precio })).toThrow(ValidacionError);
        try {
          Producto.crear({ id, nombre, categoria, precio });
        } catch (e) {
          expect(e).toBeInstanceOf(ValidacionError);
          expect((e as ValidacionError).message).toContain('nombre');
        }
      }),
      { numRuns: 200 }
    );
  });
});
