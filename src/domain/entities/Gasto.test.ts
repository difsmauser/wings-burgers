import { describe, it, expect } from 'vitest';
import { Gasto } from './Gasto';
import { CategoriaGasto } from '@/domain/value-objects';
import { ValidacionError } from '@/shared/errors';
import { PrecioFueraDeRangoError } from '@/shared/errors';

describe('Gasto', () => {
  const propsValidas = {
    id: 'gasto-1',
    monto: 150.50,
    concepto: 'Compra de pollo',
    categoria: CategoriaGasto.INSUMOS,
    fecha: new Date('2024-01-15'),
    adminId: 'admin-1',
  };

  describe('crear', () => {
    it('crea un gasto con datos válidos', () => {
      const gasto = Gasto.crear(propsValidas);
      expect(gasto.id).toBe('gasto-1');
      expect(gasto.monto.valor).toBe(150.50);
      expect(gasto.concepto).toBe('Compra de pollo');
      expect(gasto.categoria).toBe(CategoriaGasto.INSUMOS);
      expect(gasto.adminId).toBe('admin-1');
    });

    it('rechaza concepto vacío', () => {
      expect(() => Gasto.crear({ ...propsValidas, concepto: '' }))
        .toThrow(ValidacionError);
    });

    it('rechaza concepto mayor a 200 caracteres', () => {
      expect(() => Gasto.crear({ ...propsValidas, concepto: 'x'.repeat(201) }))
        .toThrow(ValidacionError);
    });

    it('rechaza categoría inválida', () => {
      expect(() => Gasto.crear({ ...propsValidas, categoria: 'INVALIDA' as CategoriaGasto }))
        .toThrow(ValidacionError);
    });

    it('rechaza monto fuera de rango (0)', () => {
      expect(() => Gasto.crear({ ...propsValidas, monto: 0 }))
        .toThrow(PrecioFueraDeRangoError);
    });

    it('rechaza monto mayor a 999999.99', () => {
      expect(() => Gasto.crear({ ...propsValidas, monto: 1_000_000 }))
        .toThrow(PrecioFueraDeRangoError);
    });

    it('rechaza adminId vacío', () => {
      expect(() => Gasto.crear({ ...propsValidas, adminId: '' }))
        .toThrow(ValidacionError);
    });
  });

  describe('validar', () => {
    it('retorna true para un gasto válido', () => {
      const gasto = Gasto.crear(propsValidas);
      expect(gasto.validar()).toBe(true);
    });
  });
});
