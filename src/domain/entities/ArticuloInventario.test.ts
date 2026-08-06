import { describe, it, expect } from 'vitest';
import { ArticuloInventario } from './ArticuloInventario';
import { ValidacionError } from '@/shared/errors';

describe('ArticuloInventario', () => {
  const propsValidas = {
    id: 'art-1',
    nombre: 'Pollo',
    cantidad: 50,
    unidadMedida: 'kg',
    nivelMinimo: 10,
  };

  describe('crear', () => {
    it('crea un artículo con datos válidos', () => {
      const articulo = ArticuloInventario.crear(propsValidas);
      expect(articulo.id).toBe('art-1');
      expect(articulo.nombre).toBe('Pollo');
      expect(articulo.cantidad).toBe(50);
      expect(articulo.unidadMedida).toBe('kg');
      expect(articulo.nivelMinimo).toBe(10);
    });

    it('rechaza nombre vacío', () => {
      expect(() => ArticuloInventario.crear({ ...propsValidas, nombre: '' }))
        .toThrow(ValidacionError);
    });

    it('rechaza nombre mayor a 100 caracteres', () => {
      expect(() => ArticuloInventario.crear({ ...propsValidas, nombre: 'x'.repeat(101) }))
        .toThrow(ValidacionError);
    });

    it('rechaza cantidad negativa', () => {
      expect(() => ArticuloInventario.crear({ ...propsValidas, cantidad: -1 }))
        .toThrow(ValidacionError);
    });

    it('rechaza cantidad mayor a 999999', () => {
      expect(() => ArticuloInventario.crear({ ...propsValidas, cantidad: 1_000_000 }))
        .toThrow(ValidacionError);
    });

    it('rechaza unidadMedida vacía', () => {
      expect(() => ArticuloInventario.crear({ ...propsValidas, unidadMedida: '' }))
        .toThrow(ValidacionError);
    });

    it('rechaza nivelMinimo menor a 1', () => {
      expect(() => ArticuloInventario.crear({ ...propsValidas, nivelMinimo: 0 }))
        .toThrow(ValidacionError);
    });
  });

  describe('estaBajoMinimo', () => {
    it('retorna true cuando cantidad es igual al nivel mínimo', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 10, nivelMinimo: 10 });
      expect(articulo.estaBajoMinimo()).toBe(true);
    });

    it('retorna true cuando cantidad es menor al nivel mínimo', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 5, nivelMinimo: 10 });
      expect(articulo.estaBajoMinimo()).toBe(true);
    });

    it('retorna false cuando cantidad es mayor al nivel mínimo', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 15, nivelMinimo: 10 });
      expect(articulo.estaBajoMinimo()).toBe(false);
    });
  });

  describe('estaAgotado', () => {
    it('retorna true cuando cantidad es cero', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 0 });
      expect(articulo.estaAgotado()).toBe(true);
    });

    it('retorna false cuando cantidad es mayor a cero', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 1 });
      expect(articulo.estaAgotado()).toBe(false);
    });
  });

  describe('decrementar', () => {
    it('decrementa la cantidad y retorna movimiento de salida', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 50 });
      const movimiento = articulo.decrementar(10, 'admin-1');

      expect(articulo.cantidad).toBe(40);
      expect(movimiento.cantidadAnterior).toBe(50);
      expect(movimiento.cantidadNueva).toBe(40);
      expect(movimiento.tipoMovimiento).toBe('salida');
      expect(movimiento.adminId).toBe('admin-1');
    });

    it('no permite cantidad negativa después de decrementar', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 5 });
      const movimiento = articulo.decrementar(10, 'admin-1');

      expect(articulo.cantidad).toBe(0);
      expect(movimiento.cantidadNueva).toBe(0);
    });

    it('lanza error si la cantidad a decrementar es cero o negativa', () => {
      const articulo = ArticuloInventario.crear(propsValidas);
      expect(() => articulo.decrementar(0)).toThrow(ValidacionError);
      expect(() => articulo.decrementar(-1)).toThrow(ValidacionError);
    });
  });

  describe('incrementar', () => {
    it('incrementa la cantidad y retorna movimiento de entrada', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 50 });
      const movimiento = articulo.incrementar(20, 'admin-1');

      expect(articulo.cantidad).toBe(70);
      expect(movimiento.cantidadAnterior).toBe(50);
      expect(movimiento.cantidadNueva).toBe(70);
      expect(movimiento.tipoMovimiento).toBe('entrada');
      expect(movimiento.adminId).toBe('admin-1');
    });

    it('no excede el límite de 999999', () => {
      const articulo = ArticuloInventario.crear({ ...propsValidas, cantidad: 999_990 });
      const movimiento = articulo.incrementar(20, 'admin-1');

      expect(articulo.cantidad).toBe(999_999);
      expect(movimiento.cantidadNueva).toBe(999_999);
    });

    it('lanza error si la cantidad a incrementar es cero o negativa', () => {
      const articulo = ArticuloInventario.crear(propsValidas);
      expect(() => articulo.incrementar(0)).toThrow(ValidacionError);
      expect(() => articulo.incrementar(-5)).toThrow(ValidacionError);
    });
  });
});
