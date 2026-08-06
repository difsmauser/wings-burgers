import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validarImagen,
  validarComprobante,
  validarImagenEstricto,
  validarComprobanteEstricto,
  FORMATOS_IMAGEN_VALIDOS,
  FORMATOS_COMPROBANTE_VALIDOS,
  TAMANO_MAXIMO_BYTES,
} from '@/shared/validators/archivoValidator';
import { ArchivoInvalidoError } from '@/shared/errors';

/**
 * Property 13: Validación de Archivos (Imágenes y Comprobantes)
 * Generar archivos con formatos/tamaños válidos e inválidos, verificar aceptación/rechazo
 *
 * **Validates: Requirements 1.4, 1.7, 13.3, 13.9**
 */
describe('Property 13: Validación de Archivos (Imágenes y Comprobantes)', () => {
  // --- Arbitrarios para archivos ---

  const archivoImagenValido = fc.record({
    nombre: fc.string({ minLength: 1, maxLength: 100 }),
    tipo: fc.constantFrom(...FORMATOS_IMAGEN_VALIDOS),
    tamano: fc.integer({ min: 1, max: TAMANO_MAXIMO_BYTES }),
  });

  const archivoComprobanteValido = fc.record({
    nombre: fc.string({ minLength: 1, maxLength: 100 }),
    tipo: fc.constantFrom(...FORMATOS_COMPROBANTE_VALIDOS),
    tamano: fc.integer({ min: 1, max: TAMANO_MAXIMO_BYTES }),
  });

  const formatosInvalidosImagen = fc.string({ minLength: 1, maxLength: 50 }).filter(
    (tipo) => !FORMATOS_IMAGEN_VALIDOS.includes(tipo as typeof FORMATOS_IMAGEN_VALIDOS[number])
  );

  const formatosInvalidosComprobante = fc.string({ minLength: 1, maxLength: 50 }).filter(
    (tipo) => !FORMATOS_COMPROBANTE_VALIDOS.includes(tipo as typeof FORMATOS_COMPROBANTE_VALIDOS[number])
  );

  const tamanoExcesivo = fc.integer({ min: TAMANO_MAXIMO_BYTES + 1, max: TAMANO_MAXIMO_BYTES * 10 });

  // --- Propiedades para imágenes ---

  describe('Validación de imágenes de producto', () => {
    it('acepta cualquier archivo con formato válido de imagen y tamaño <= 5MB', () => {
      fc.assert(
        fc.property(archivoImagenValido, (archivo) => {
          const resultado = validarImagen(archivo);
          expect(resultado.valido).toBe(true);
          expect(resultado.error).toBeUndefined();
        })
      );
    });

    it('rechaza cualquier archivo con formato inválido para imagen', () => {
      fc.assert(
        fc.property(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            tipo: formatosInvalidosImagen,
            tamano: fc.integer({ min: 1, max: TAMANO_MAXIMO_BYTES }),
          }),
          (archivo) => {
            const resultado = validarImagen(archivo);
            expect(resultado.valido).toBe(false);
            expect(resultado.error).toBeDefined();
            expect(resultado.error).toContain('Formato no válido');
          }
        )
      );
    });

    it('rechaza cualquier archivo de imagen que exceda 5MB', () => {
      fc.assert(
        fc.property(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            tipo: fc.constantFrom(...FORMATOS_IMAGEN_VALIDOS),
            tamano: tamanoExcesivo,
          }),
          (archivo) => {
            const resultado = validarImagen(archivo);
            expect(resultado.valido).toBe(false);
            expect(resultado.error).toBeDefined();
            expect(resultado.error).toContain('excede el tamaño máximo');
          }
        )
      );
    });

    it('validarImagenEstricto lanza ArchivoInvalidoError para archivos inválidos', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              nombre: fc.string({ minLength: 1, maxLength: 100 }),
              tipo: formatosInvalidosImagen,
              tamano: fc.integer({ min: 1, max: TAMANO_MAXIMO_BYTES }),
            }),
            fc.record({
              nombre: fc.string({ minLength: 1, maxLength: 100 }),
              tipo: fc.constantFrom(...FORMATOS_IMAGEN_VALIDOS),
              tamano: tamanoExcesivo,
            })
          ),
          (archivo) => {
            expect(() => validarImagenEstricto(archivo)).toThrow(ArchivoInvalidoError);
          }
        )
      );
    });
  });

  // --- Propiedades para comprobantes ---

  describe('Validación de comprobantes de pago', () => {
    it('acepta cualquier archivo con formato válido de comprobante y tamaño <= 5MB', () => {
      fc.assert(
        fc.property(archivoComprobanteValido, (archivo) => {
          const resultado = validarComprobante(archivo);
          expect(resultado.valido).toBe(true);
          expect(resultado.error).toBeUndefined();
        })
      );
    });

    it('rechaza cualquier archivo con formato inválido para comprobante', () => {
      fc.assert(
        fc.property(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            tipo: formatosInvalidosComprobante,
            tamano: fc.integer({ min: 1, max: TAMANO_MAXIMO_BYTES }),
          }),
          (archivo) => {
            const resultado = validarComprobante(archivo);
            expect(resultado.valido).toBe(false);
            expect(resultado.error).toBeDefined();
            expect(resultado.error).toContain('Formato no válido');
          }
        )
      );
    });

    it('rechaza cualquier archivo de comprobante que exceda 5MB', () => {
      fc.assert(
        fc.property(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            tipo: fc.constantFrom(...FORMATOS_COMPROBANTE_VALIDOS),
            tamano: tamanoExcesivo,
          }),
          (archivo) => {
            const resultado = validarComprobante(archivo);
            expect(resultado.valido).toBe(false);
            expect(resultado.error).toBeDefined();
            expect(resultado.error).toContain('excede el tamaño máximo');
          }
        )
      );
    });

    it('validarComprobanteEstricto lanza ArchivoInvalidoError para archivos inválidos', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              nombre: fc.string({ minLength: 1, maxLength: 100 }),
              tipo: formatosInvalidosComprobante,
              tamano: fc.integer({ min: 1, max: TAMANO_MAXIMO_BYTES }),
            }),
            fc.record({
              nombre: fc.string({ minLength: 1, maxLength: 100 }),
              tipo: fc.constantFrom(...FORMATOS_COMPROBANTE_VALIDOS),
              tamano: tamanoExcesivo,
            })
          ),
          (archivo) => {
            expect(() => validarComprobanteEstricto(archivo)).toThrow(ArchivoInvalidoError);
          }
        )
      );
    });
  });

  // --- Propiedad combinada: formato válido Y tamaño válido ↔ aceptación ---

  describe('Propiedad combinada: formato + tamaño determinan resultado', () => {
    it('para imágenes: valido == (formato válido AND tamaño <= 5MB)', () => {
      const formatoImagen = fc.oneof(
        fc.constantFrom(...FORMATOS_IMAGEN_VALIDOS),
        formatosInvalidosImagen
      );
      const tamanoArchivo = fc.oneof(
        fc.integer({ min: 1, max: TAMANO_MAXIMO_BYTES }),
        tamanoExcesivo
      );

      fc.assert(
        fc.property(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            tipo: formatoImagen,
            tamano: tamanoArchivo,
          }),
          (archivo) => {
            const resultado = validarImagen(archivo);
            const esFormatoValido = FORMATOS_IMAGEN_VALIDOS.includes(
              archivo.tipo as typeof FORMATOS_IMAGEN_VALIDOS[number]
            );
            const esTamanoValido = archivo.tamano <= TAMANO_MAXIMO_BYTES;

            if (esFormatoValido && esTamanoValido) {
              expect(resultado.valido).toBe(true);
            } else {
              expect(resultado.valido).toBe(false);
              expect(resultado.error).toBeDefined();
            }
          }
        )
      );
    });

    it('para comprobantes: valido == (formato válido AND tamaño <= 5MB)', () => {
      const formatoComprobante = fc.oneof(
        fc.constantFrom(...FORMATOS_COMPROBANTE_VALIDOS),
        formatosInvalidosComprobante
      );
      const tamanoArchivo = fc.oneof(
        fc.integer({ min: 1, max: TAMANO_MAXIMO_BYTES }),
        tamanoExcesivo
      );

      fc.assert(
        fc.property(
          fc.record({
            nombre: fc.string({ minLength: 1, maxLength: 100 }),
            tipo: formatoComprobante,
            tamano: tamanoArchivo,
          }),
          (archivo) => {
            const resultado = validarComprobante(archivo);
            const esFormatoValido = FORMATOS_COMPROBANTE_VALIDOS.includes(
              archivo.tipo as typeof FORMATOS_COMPROBANTE_VALIDOS[number]
            );
            const esTamanoValido = archivo.tamano <= TAMANO_MAXIMO_BYTES;

            if (esFormatoValido && esTamanoValido) {
              expect(resultado.valido).toBe(true);
            } else {
              expect(resultado.valido).toBe(false);
              expect(resultado.error).toBeDefined();
            }
          }
        )
      );
    });
  });

  // --- Propiedad: formatos específicos son exactamente los definidos ---

  describe('Formatos válidos son exactamente los especificados', () => {
    it('formatos válidos de imagen son: image/jpeg, image/png, image/webp', () => {
      expect(FORMATOS_IMAGEN_VALIDOS).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    });

    it('formatos válidos de comprobante son: image/jpeg, image/png, application/pdf', () => {
      expect(FORMATOS_COMPROBANTE_VALIDOS).toEqual(['image/jpeg', 'image/png', 'application/pdf']);
    });

    it('tamaño máximo es exactamente 5 * 1024 * 1024 bytes', () => {
      expect(TAMANO_MAXIMO_BYTES).toBe(5 * 1024 * 1024);
    });
  });
});
