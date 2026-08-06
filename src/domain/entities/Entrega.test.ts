import { describe, it, expect } from 'vitest';
import { Entrega } from './Entrega';
import { EstadoEntrega } from '@/domain/value-objects';
import { TransicionEstadoInvalidaError } from '@/shared/errors';

describe('Entrega', () => {
  const propsValidas = {
    id: 'entrega-1',
    pedidoId: 'pedido-1',
    repartidorId: 'repartidor-1',
  };

  describe('crear', () => {
    it('crea una entrega con estado PENDIENTE por defecto', () => {
      const entrega = Entrega.crear(propsValidas);
      expect(entrega.id).toBe('entrega-1');
      expect(entrega.pedidoId).toBe('pedido-1');
      expect(entrega.repartidorId).toBe('repartidor-1');
      expect(entrega.estado).toBe(EstadoEntrega.PENDIENTE);
      expect(entrega.motivoNoEntrega).toBeNull();
      expect(entrega.aceptadaEn).toBeNull();
      expect(entrega.completadaEn).toBeNull();
    });
  });

  describe('aceptar', () => {
    it('transita de PENDIENTE a EN_CAMINO y registra fecha', () => {
      const entrega = Entrega.crear(propsValidas);
      entrega.aceptar();
      expect(entrega.estado).toBe(EstadoEntrega.EN_CAMINO);
      expect(entrega.aceptadaEn).toBeInstanceOf(Date);
    });

    it('lanza error si ya no está en PENDIENTE', () => {
      const entrega = Entrega.crear(propsValidas);
      entrega.aceptar();
      expect(() => entrega.aceptar()).toThrow(TransicionEstadoInvalidaError);
    });
  });

  describe('completar', () => {
    it('transita de EN_CAMINO a ENTREGADO y registra fecha', () => {
      const entrega = Entrega.crear(propsValidas);
      entrega.aceptar();
      entrega.completar();
      expect(entrega.estado).toBe(EstadoEntrega.ENTREGADO);
      expect(entrega.completadaEn).toBeInstanceOf(Date);
    });

    it('lanza error si no está en EN_CAMINO', () => {
      const entrega = Entrega.crear(propsValidas);
      expect(() => entrega.completar()).toThrow(TransicionEstadoInvalidaError);
    });
  });

  describe('marcarFallida', () => {
    it('transita de EN_CAMINO a FALLIDO con motivo', () => {
      const entrega = Entrega.crear(propsValidas);
      entrega.aceptar();
      entrega.marcarFallida('No se encontró la dirección');
      expect(entrega.estado).toBe(EstadoEntrega.FALLIDO);
      expect(entrega.motivoNoEntrega).toBe('No se encontró la dirección');
      expect(entrega.completadaEn).toBeInstanceOf(Date);
    });

    it('lanza error si no está en EN_CAMINO', () => {
      const entrega = Entrega.crear(propsValidas);
      expect(() => entrega.marcarFallida('razón'))
        .toThrow(TransicionEstadoInvalidaError);
    });

    it('lanza error si ya está ENTREGADO', () => {
      const entrega = Entrega.crear(propsValidas);
      entrega.aceptar();
      entrega.completar();
      expect(() => entrega.marcarFallida('razón'))
        .toThrow(TransicionEstadoInvalidaError);
    });
  });
});
