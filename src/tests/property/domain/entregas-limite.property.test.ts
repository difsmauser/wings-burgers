import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Entrega } from '@/domain/entities';
import { EstadoEntrega } from '@/domain/value-objects';
import { LimiteEntregasExcedidoError } from '@/shared/errors';

/**
 * Property 11: Límite de Entregas Concurrentes por Repartidor
 *
 * **Validates: Requirements 14.7**
 *
 * Para cualquier repartidor que tenga 3 entregas en estado "en camino",
 * el sistema debe impedir que acepte entregas adicionales. Para cualquier
 * repartidor con menos de 3 entregas activas, la aceptación debe ser permitida.
 */

const LIMITE_ENTREGAS_CONCURRENTES = 3;

/**
 * Determina si un repartidor puede aceptar una nueva entrega.
 * Una entrega es "activa" si su estado es EN_CAMINO.
 * El límite es 3 entregas activas por repartidor.
 */
function puedeAceptarEntrega(entregasActivas: Entrega[]): boolean {
  const enCamino = entregasActivas.filter(
    (e) => e.estado === EstadoEntrega.EN_CAMINO
  );
  return enCamino.length < LIMITE_ENTREGAS_CONCURRENTES;
}

/**
 * Generador de un ID UUID-like.
 */
const idArb = fc.uuid();

/**
 * Generador de estado de entrega (cualquiera de los 4 posibles).
 */
const estadoEntregaArb = fc.constantFrom(
  EstadoEntrega.PENDIENTE,
  EstadoEntrega.EN_CAMINO,
  EstadoEntrega.ENTREGADO,
  EstadoEntrega.FALLIDO
);

/**
 * Generador de una entrega con estado específico para un repartidor dado.
 */
function entregaConEstadoArb(
  repartidorId: string,
  estado: EstadoEntrega
): fc.Arbitrary<Entrega> {
  return idArb.chain((id) =>
    idArb.map((pedidoId) => {
      const entrega = Entrega.crear({
        id,
        pedidoId,
        repartidorId,
        estado,
      });
      return entrega;
    })
  );
}

/**
 * Generador de una entrega con estado aleatorio para un repartidor dado.
 */
function entregaAleatoria(repartidorId: string): fc.Arbitrary<Entrega> {
  return fc.tuple(idArb, idArb, estadoEntregaArb).map(([id, pedidoId, estado]) =>
    Entrega.crear({ id, pedidoId, repartidorId, estado })
  );
}

describe('Property 11: Límite de Entregas Concurrentes por Repartidor', () => {
  it('con exactamente 3 entregas EN_CAMINO, no se puede aceptar más', () => {
    fc.assert(
      fc.property(idArb, (repartidorId) => {
        // Generar exactamente 3 entregas EN_CAMINO
        const entregas: Entrega[] = [];
        for (let i = 0; i < 3; i++) {
          entregas.push(
            Entrega.crear({
              id: `entrega-${i}-${repartidorId}`,
              pedidoId: `pedido-${i}-${repartidorId}`,
              repartidorId,
              estado: EstadoEntrega.EN_CAMINO,
            })
          );
        }

        // Verificar que NO puede aceptar más entregas
        expect(puedeAceptarEntrega(entregas)).toBe(false);
      }),
      { numRuns: 500 }
    );
  });

  it('con menos de 3 entregas EN_CAMINO, se puede aceptar más', () => {
    fc.assert(
      fc.property(
        idArb,
        fc.integer({ min: 0, max: 2 }),
        (repartidorId, numEnCamino) => {
          // Generar entre 0 y 2 entregas EN_CAMINO
          const entregas: Entrega[] = [];
          for (let i = 0; i < numEnCamino; i++) {
            entregas.push(
              Entrega.crear({
                id: `entrega-${i}-${repartidorId}`,
                pedidoId: `pedido-${i}-${repartidorId}`,
                repartidorId,
                estado: EstadoEntrega.EN_CAMINO,
              })
            );
          }

          // Verificar que SÍ puede aceptar más entregas
          expect(puedeAceptarEntrega(entregas)).toBe(true);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('entregas en otros estados (PENDIENTE, ENTREGADO, FALLIDO) no cuentan para el límite', () => {
    fc.assert(
      fc.property(
        idArb,
        fc.array(
          fc.constantFrom(
            EstadoEntrega.PENDIENTE,
            EstadoEntrega.ENTREGADO,
            EstadoEntrega.FALLIDO
          ),
          { minLength: 0, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 2 }),
        (repartidorId, estadosNoActivos, numEnCamino) => {
          const entregas: Entrega[] = [];

          // Agregar entregas en estados que NO son EN_CAMINO
          estadosNoActivos.forEach((estado, idx) => {
            entregas.push(
              Entrega.crear({
                id: `entrega-noactiva-${idx}-${repartidorId}`,
                pedidoId: `pedido-noactiva-${idx}-${repartidorId}`,
                repartidorId,
                estado,
              })
            );
          });

          // Agregar entre 0 y 2 entregas EN_CAMINO
          for (let i = 0; i < numEnCamino; i++) {
            entregas.push(
              Entrega.crear({
                id: `entrega-activa-${i}-${repartidorId}`,
                pedidoId: `pedido-activa-${i}-${repartidorId}`,
                repartidorId,
                estado: EstadoEntrega.EN_CAMINO,
              })
            );
          }

          // Con menos de 3 EN_CAMINO, siempre puede aceptar, sin importar
          // cuántas entregas hay en otros estados
          expect(puedeAceptarEntrega(entregas)).toBe(true);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('con mezcla de estados, solo EN_CAMINO cuenta para alcanzar el límite', () => {
    fc.assert(
      fc.property(
        idArb,
        fc.array(
          fc.constantFrom(
            EstadoEntrega.PENDIENTE,
            EstadoEntrega.ENTREGADO,
            EstadoEntrega.FALLIDO
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (repartidorId, estadosNoActivos) => {
          const entregas: Entrega[] = [];

          // Agregar muchas entregas en estados NO activos
          estadosNoActivos.forEach((estado, idx) => {
            entregas.push(
              Entrega.crear({
                id: `entrega-other-${idx}-${repartidorId}`,
                pedidoId: `pedido-other-${idx}-${repartidorId}`,
                repartidorId,
                estado,
              })
            );
          });

          // Agregar exactamente 3 entregas EN_CAMINO
          for (let i = 0; i < 3; i++) {
            entregas.push(
              Entrega.crear({
                id: `entrega-encamino-${i}-${repartidorId}`,
                pedidoId: `pedido-encamino-${i}-${repartidorId}`,
                repartidorId,
                estado: EstadoEntrega.EN_CAMINO,
              })
            );
          }

          // Con 3 EN_CAMINO, no puede aceptar más, sin importar otros estados
          expect(puedeAceptarEntrega(entregas)).toBe(false);
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('el conteo de entregas activas es exactamente el número de entregas EN_CAMINO', () => {
    fc.assert(
      fc.property(
        idArb,
        fc.array(estadoEntregaArb, { minLength: 0, maxLength: 15 }),
        (repartidorId, estados) => {
          const entregas = estados.map((estado, idx) =>
            Entrega.crear({
              id: `entrega-${idx}-${repartidorId}`,
              pedidoId: `pedido-${idx}-${repartidorId}`,
              repartidorId,
              estado,
            })
          );

          const numEnCamino = estados.filter(
            (e) => e === EstadoEntrega.EN_CAMINO
          ).length;

          const resultado = puedeAceptarEntrega(entregas);

          // Propiedad fundamental: puede aceptar ↔ menos de 3 en camino
          if (numEnCamino >= LIMITE_ENTREGAS_CONCURRENTES) {
            expect(resultado).toBe(false);
          } else {
            expect(resultado).toBe(true);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });
});
