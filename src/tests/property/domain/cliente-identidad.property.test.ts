import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Telefono } from '@/domain/value-objects/Telefono';
import { Cliente } from '@/domain/entities/Cliente';

/**
 * Property 9: Identidad de Cliente por Teléfono (Sin Duplicados)
 *
 * **Validates: Requirements 6.1, 6.2**
 *
 * - Para cualquier número de teléfono de 10 dígitos, no importa cuántos pedidos
 *   se realicen con ese número, debe existir exactamente un registro de cliente
 *   asociado a él.
 * - Telefono.crear siempre produce el mismo valor limpio (idempotente).
 * - Diferentes formatos del mismo teléfono resuelven al mismo valor.
 */
describe('Property 9: Identidad de Cliente por Teléfono (Sin Duplicados)', () => {
  /**
   * Generador de 10 dígitos numéricos como string.
   */
  const telefonoDigitsArb = fc
    .array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
    .map((digits) => digits.join(''));

  /**
   * Generador de formatos aleatorios para un teléfono de 10 dígitos.
   * Aplica separadores aleatorios: espacios, guiones, paréntesis.
   */
  const formatPhone = (digits: string): fc.Arbitrary<string> => {
    return fc.constantFrom(
      // Sin formato
      digits,
      // Con guiones: 123-456-7890
      `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`,
      // Con espacios: 123 456 7890
      `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`,
      // Con paréntesis: (123) 456-7890
      `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
      // Con paréntesis y espacios: (123) 456 7890
      `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`,
      // Con puntos: 123.456.7890
      `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`,
      // Con mezcla: 123-456 7890
      `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6)}`
    );
  };

  it('Telefono.crear es idempotente: el mismo input siempre produce el mismo valor', () => {
    fc.assert(
      fc.property(telefonoDigitsArb, (digits) => {
        const tel1 = Telefono.crear(digits);
        const tel2 = Telefono.crear(digits);
        expect(tel1.valor).toBe(tel2.valor);
        expect(tel1.valor).toBe(digits);
      }),
      { numRuns: 500 }
    );
  });

  it('Diferentes formatos del mismo teléfono producen el mismo valor limpio', () => {
    fc.assert(
      fc.property(
        telefonoDigitsArb.chain((digits) =>
          fc.tuple(fc.constant(digits), formatPhone(digits), formatPhone(digits))
        ),
        ([digits, formatted1, formatted2]) => {
          const tel1 = Telefono.crear(formatted1);
          const tel2 = Telefono.crear(formatted2);
          // Ambos resuelven al mismo valor limpio (solo dígitos)
          expect(tel1.valor).toBe(digits);
          expect(tel2.valor).toBe(digits);
          // Son iguales entre sí
          expect(tel1.esIgual(tel2)).toBe(true);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Registro de cliente con mismo teléfono N veces produce exactamente 1 entrada en registro', () => {
    // Generator that produces non-whitespace names valid for Cliente.crear
    const nombreValidoArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

    fc.assert(
      fc.property(
        telefonoDigitsArb,
        fc.integer({ min: 2, max: 20 }),
        fc.array(nombreValidoArb, { minLength: 2, maxLength: 20 }),
        (digits, n, nombres) => {
          // Simulamos un registro de clientes (como lo haría el repositorio)
          const registroClientes = new Map<string, Cliente>();

          // Registrar N veces con el mismo teléfono pero posiblemente distintos nombres
          const totalRegistros = Math.min(n, nombres.length);
          for (let i = 0; i < totalRegistros; i++) {
            const telefonoLimpio = Telefono.crear(digits).valor;

            // Si ya existe un cliente con ese teléfono, no crear duplicado
            if (!registroClientes.has(telefonoLimpio)) {
              const cliente = Cliente.crear({
                id: `cliente-${i}`,
                nombre: nombres[i] || `Cliente ${i}`,
                telefono: digits,
              });
              registroClientes.set(telefonoLimpio, cliente);
            }
          }

          // Debe haber exactamente 1 registro sin importar cuántas veces se intentó
          expect(registroClientes.size).toBe(1);

          // El cliente registrado debe tener el teléfono correcto
          const clienteRegistrado = registroClientes.get(digits)!;
          expect(clienteRegistrado.telefono.valor).toBe(digits);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Registro con diferentes formatos del mismo teléfono produce exactamente 1 entrada', () => {
    fc.assert(
      fc.property(
        telefonoDigitsArb.chain((digits) =>
          fc.tuple(
            fc.constant(digits),
            fc.array(formatPhone(digits), { minLength: 2, maxLength: 10 })
          )
        ),
        ([digits, formattedNumbers]) => {
          const registroClientes = new Map<string, Cliente>();

          // Registrar usando distintos formatos del mismo número
          for (let i = 0; i < formattedNumbers.length; i++) {
            const telefonoLimpio = Telefono.crear(formattedNumbers[i]).valor;

            if (!registroClientes.has(telefonoLimpio)) {
              const cliente = Cliente.crear({
                id: `cliente-${i}`,
                nombre: `Cliente ${i}`,
                telefono: formattedNumbers[i],
              });
              registroClientes.set(telefonoLimpio, cliente);
            }
          }

          // Exactamente 1 registro porque todos los formatos resuelven al mismo número
          expect(registroClientes.size).toBe(1);

          // El valor limpio es el esperado
          const clienteRegistrado = registroClientes.get(digits)!;
          expect(clienteRegistrado.telefono.valor).toBe(digits);
        }
      ),
      { numRuns: 500 }
    );
  });
});
