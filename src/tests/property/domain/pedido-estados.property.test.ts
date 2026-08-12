import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Pedido } from '@/domain/entities';
import { EstadoPedido, ModalidadServicio } from '@/domain/value-objects';
import { TransicionEstadoInvalidaError } from '@/shared/errors';
import { Precio } from '@/domain/value-objects';

/**
 * Property 12: Transiciones Válidas de Estado del Pedido
 *
 * **Validates: Requirements 12.1, 14.2, 14.5**
 *
 * - Para cada estado, verificar que solo transiciones permitidas se aceptan
 * - Verificar que transiciones no definidas lanzan TransicionEstadoInvalidaError
 */

/**
 * Mapa de transiciones válidas de la máquina de estados, considerando la modalidad.
 * - RECIBIDO → EN_PREPARACION
 * - EN_PREPARACION → EMPACADO
 * - EMPACADO → SERVIDO (only LOCAL)
 * - EMPACADO → EN_CAMINO (only DOMICILIO)
 * - EN_CAMINO → ENTREGADO
 * - SERVIDO, ENTREGADO son terminales (sin transiciones)
 */
const TRANSICIONES_VALIDAS_LOCAL: Record<EstadoPedido, EstadoPedido[]> = {
  [EstadoPedido.RECIBIDO]: [EstadoPedido.EN_PREPARACION],
  [EstadoPedido.EN_PREPARACION]: [EstadoPedido.EMPACADO],
  [EstadoPedido.EMPACADO]: [EstadoPedido.LISTO_PARA_SERVIR],
  [EstadoPedido.LISTO_PARA_SERVIR]: [EstadoPedido.SERVIDO],
  [EstadoPedido.SERVIDO]: [],
  [EstadoPedido.EN_CAMINO]: [EstadoPedido.ENTREGADO],
  [EstadoPedido.ENTREGADO]: [],
};

const TRANSICIONES_VALIDAS_DOMICILIO: Record<EstadoPedido, EstadoPedido[]> = {
  [EstadoPedido.RECIBIDO]: [EstadoPedido.EN_PREPARACION],
  [EstadoPedido.EN_PREPARACION]: [EstadoPedido.EMPACADO],
  [EstadoPedido.EMPACADO]: [EstadoPedido.EN_CAMINO],
  [EstadoPedido.LISTO_PARA_SERVIR]: [EstadoPedido.SERVIDO],
  [EstadoPedido.SERVIDO]: [],
  [EstadoPedido.EN_CAMINO]: [EstadoPedido.ENTREGADO],
  [EstadoPedido.ENTREGADO]: [],
};

const ALL_ESTADOS = Object.values(EstadoPedido);

/**
 * Secuencia de estados para llegar a un estado dado, según modalidad.
 */
function secuenciaParaAlcanzar(
  estado: EstadoPedido,
  modalidad: ModalidadServicio
): EstadoPedido[] {
  switch (estado) {
    case EstadoPedido.RECIBIDO:
      return [];
    case EstadoPedido.EN_PREPARACION:
      return [EstadoPedido.EN_PREPARACION];
    case EstadoPedido.EMPACADO:
      return [EstadoPedido.EN_PREPARACION, EstadoPedido.EMPACADO];
    case EstadoPedido.LISTO_PARA_SERVIR:
      if (modalidad !== ModalidadServicio.LOCAL) return [];
      return [EstadoPedido.EN_PREPARACION, EstadoPedido.EMPACADO, EstadoPedido.LISTO_PARA_SERVIR];
    case EstadoPedido.SERVIDO:
      if (modalidad !== ModalidadServicio.LOCAL) return [];
      return [EstadoPedido.EN_PREPARACION, EstadoPedido.EMPACADO, EstadoPedido.LISTO_PARA_SERVIR, EstadoPedido.SERVIDO];
    case EstadoPedido.EN_CAMINO:
      if (modalidad !== ModalidadServicio.DOMICILIO) return [];
      return [EstadoPedido.EN_PREPARACION, EstadoPedido.EMPACADO, EstadoPedido.EN_CAMINO];
    case EstadoPedido.ENTREGADO:
      if (modalidad !== ModalidadServicio.DOMICILIO) return [];
      return [
        EstadoPedido.EN_PREPARACION,
        EstadoPedido.EMPACADO,
        EstadoPedido.EN_CAMINO,
        EstadoPedido.ENTREGADO,
      ];
    default:
      return [];
  }
}

/**
 * Creates a Pedido at the given target state by applying correct transition sequence.
 * The pedido has at least one item so confirmar() can be used.
 */
function crearPedidoEnEstado(
  estado: EstadoPedido,
  modalidad: ModalidadServicio
): Pedido {
  const pedido = Pedido.crear({
    id: crypto.randomUUID(),
    numero: `PED-${Date.now()}`,
    clienteId: 'cliente-test-001',
    modalidad,
  });

  // Add at least one item so we can advance from RECIBIDO
  pedido.agregarItem(
    { id: 'prod-001', nombre: 'Alitas BBQ', precio: Precio.crear(99.99) },
    1
  );

  // Apply transition sequence
  const secuencia = secuenciaParaAlcanzar(estado, modalidad);
  for (const nuevoEstado of secuencia) {
    pedido.cambiarEstado(nuevoEstado);
  }

  return pedido;
}

/**
 * Returns valid transitions for a given state and modalidad.
 */
function transicionesValidas(
  estado: EstadoPedido,
  modalidad: ModalidadServicio
): EstadoPedido[] {
  if (modalidad === ModalidadServicio.LOCAL) {
    return TRANSICIONES_VALIDAS_LOCAL[estado];
  }
  return TRANSICIONES_VALIDAS_DOMICILIO[estado];
}

/**
 * Returns invalid transitions for a given state and modalidad.
 */
function transicionesInvalidas(
  estado: EstadoPedido,
  modalidad: ModalidadServicio
): EstadoPedido[] {
  const validas = transicionesValidas(estado, modalidad);
  return ALL_ESTADOS.filter((e) => !validas.includes(e));
}

/**
 * States reachable for a given modalidad (used to generate valid test cases).
 */
function estadosAlcanzables(modalidad: ModalidadServicio): EstadoPedido[] {
  if (modalidad === ModalidadServicio.LOCAL) {
    return [
      EstadoPedido.RECIBIDO,
      EstadoPedido.EN_PREPARACION,
      EstadoPedido.EMPACADO,
      EstadoPedido.SERVIDO,
    ];
  }
  return [
    EstadoPedido.RECIBIDO,
    EstadoPedido.EN_PREPARACION,
    EstadoPedido.EMPACADO,
    EstadoPedido.EN_CAMINO,
    EstadoPedido.ENTREGADO,
  ];
}

describe('Property 12: Transiciones Válidas de Estado del Pedido', () => {
  // Arbitrary for modalidad
  const modalidadArb = fc.constantFrom(
    ModalidadServicio.LOCAL,
    ModalidadServicio.DOMICILIO
  );

  it('valid transitions from any state succeed (cambiarEstado does not throw)', () => {
    fc.assert(
      fc.property(modalidadArb, (modalidad) => {
        const alcanzables = estadosAlcanzables(modalidad);

        for (const estadoOrigen of alcanzables) {
          const validas = transicionesValidas(estadoOrigen, modalidad);

          for (const estadoDestino of validas) {
            const pedido = crearPedidoEnEstado(estadoOrigen, modalidad);
            expect(pedido.estado).toBe(estadoOrigen);

            // Should not throw
            pedido.cambiarEstado(estadoDestino);
            expect(pedido.estado).toBe(estadoDestino);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('invalid transitions from any state throw TransicionEstadoInvalidaError', () => {
    fc.assert(
      fc.property(modalidadArb, (modalidad) => {
        const alcanzables = estadosAlcanzables(modalidad);

        for (const estadoOrigen of alcanzables) {
          const invalidas = transicionesInvalidas(estadoOrigen, modalidad);

          for (const estadoDestino of invalidas) {
            const pedido = crearPedidoEnEstado(estadoOrigen, modalidad);
            expect(pedido.estado).toBe(estadoOrigen);

            expect(() => pedido.cambiarEstado(estadoDestino)).toThrow(
              TransicionEstadoInvalidaError
            );
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('terminal states (SERVIDO, ENTREGADO) reject all transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ESTADOS),
        (estadoDestino) => {
          // SERVIDO is terminal (LOCAL)
          const pedidoLocal = crearPedidoEnEstado(
            EstadoPedido.SERVIDO,
            ModalidadServicio.LOCAL
          );
          expect(() => pedidoLocal.cambiarEstado(estadoDestino)).toThrow(
            TransicionEstadoInvalidaError
          );

          // ENTREGADO is terminal (DOMICILIO)
          const pedidoDomicilio = crearPedidoEnEstado(
            EstadoPedido.ENTREGADO,
            ModalidadServicio.DOMICILIO
          );
          expect(() => pedidoDomicilio.cambiarEstado(estadoDestino)).toThrow(
            TransicionEstadoInvalidaError
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('random invalid target state from any reachable state throws TransicionEstadoInvalidaError', () => {
    fc.assert(
      fc.property(
        modalidadArb,
        fc.integer({ min: 0, max: 100 }),
        (modalidad, seed) => {
          const alcanzables = estadosAlcanzables(modalidad);
          // Pick a random state from reachable states using seed
          const estadoOrigen = alcanzables[seed % alcanzables.length];
          const invalidas = transicionesInvalidas(estadoOrigen, modalidad);

          if (invalidas.length === 0) return; // skip if no invalid transitions

          const estadoDestino = invalidas[seed % invalidas.length];
          const pedido = crearPedidoEnEstado(estadoOrigen, modalidad);

          expect(() => pedido.cambiarEstado(estadoDestino)).toThrow(
            TransicionEstadoInvalidaError
          );
        }
      ),
      { numRuns: 500 }
    );
  });
});
