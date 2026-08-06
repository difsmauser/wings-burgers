import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Precio } from '@/domain/value-objects/Precio';
import {
  PrecioFueraDeRangoError,
  PrecioDecimalesInvalidosError,
} from '@/shared/errors';

/**
 * Property 1: Validación del Value Object Precio (Round-Trip)
 *
 * **Validates: Requirements 2.3, 2.4, 2.5**
 *
 * - Para cualquier valor válido (0.01-99999.99, max 2 decimales),
 *   Precio.crear(valor).valor === valor (round-trip).
 * - Para cualquier valor inválido (fuera de rango o más de 2 decimales),
 *   Precio.crear debe lanzar el error correspondiente.
 */
describe('Property 1: Validación del Value Object Precio (Round-Trip)', () => {
  /**
   * Generador de valores válidos: doubles en [0.01, 99999.99] redondeados a 2 decimales.
   */
  const validPrecioArb = fc
    .double({ min: 0.01, max: 99_999.99, noNaN: true, noDefaultInfinity: true })
    .map((v) => Math.round(v * 100) / 100)
    .filter((v) => v >= 0.01 && v <= 99_999.99);

  it('round-trip: Precio.crear(valor).valor === valor para todo valor válido', () => {
    fc.assert(
      fc.property(validPrecioArb, (valor) => {
        const precio = Precio.crear(valor);
        expect(precio.valor).toBe(valor);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Generador de valores fuera de rango: negativos, cero, o mayores a 99999.99.
   */
  const fueraDeRangoArb = fc.oneof(
    // Valores negativos
    fc.double({ min: -1_000_000, max: -0.01, noNaN: true, noDefaultInfinity: true })
      .map((v) => Math.round(v * 100) / 100),
    // Cero exacto
    fc.constant(0),
    // Valores por encima del máximo
    fc.double({ min: 100_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true })
      .map((v) => Math.round(v * 100) / 100)
      .filter((v) => v > 99_999.99)
  );

  it('valores fuera de rango lanzan PrecioFueraDeRangoError', () => {
    fc.assert(
      fc.property(fueraDeRangoArb, (valor) => {
        expect(() => Precio.crear(valor)).toThrow(PrecioFueraDeRangoError);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Generador de valores con más de 2 decimales (dentro del rango numérico).
   */
  const masDecimalesArb = fc
    .integer({ min: 1, max: 9_999_999 })
    .map((n) => n / 1000) // Produce 3 decimales
    .filter((v) => {
      const str = v.toString();
      const dotIdx = str.indexOf('.');
      return dotIdx !== -1 && str.length - dotIdx - 1 > 2;
    })
    .filter((v) => v >= 0.01 && v <= 99_999.99);

  it('valores con más de 2 decimales lanzan PrecioDecimalesInvalidosError', () => {
    fc.assert(
      fc.property(masDecimalesArb, (valor) => {
        expect(() => Precio.crear(valor)).toThrow(PrecioDecimalesInvalidosError);
      }),
      { numRuns: 500 }
    );
  });

  it('Infinity y NaN lanzan PrecioDecimalesInvalidosError', () => {
    expect(() => Precio.crear(Infinity)).toThrow(PrecioDecimalesInvalidosError);
    expect(() => Precio.crear(-Infinity)).toThrow(PrecioDecimalesInvalidosError);
    expect(() => Precio.crear(NaN)).toThrow(PrecioDecimalesInvalidosError);
  });
});
