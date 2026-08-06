import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrarArticulo, RegistrarArticuloDTO } from './RegistrarArticulo';
import { IInventarioRepository } from '@/domain/ports';
import { ArticuloInventario as ArticuloInventarioType } from '@/shared/domain-types';
import { ValidacionError } from '@/shared/errors';

describe('RegistrarArticulo', () => {
  let registrarArticulo: RegistrarArticulo;
  let mockInventarioRepo: IInventarioRepository;

  beforeEach(() => {
    mockInventarioRepo = {
      registrar: vi.fn().mockImplementation(async (articulo) => ({
        id: articulo.id,
        nombre: articulo.nombre,
        cantidad: articulo.cantidad,
        unidad: articulo.unidadMedida ?? articulo.unidad,
        nivelMinimo: articulo.nivelMinimo,
        productoIds: [],
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      })),
      actualizar: vi.fn(),
      obtenerPorId: vi.fn(),
      listarBajoMinimo: vi.fn(),
      obtenerArticulosPorProducto: vi.fn(),
      registrarMovimiento: vi.fn(),
    };

    registrarArticulo = new RegistrarArticulo(mockInventarioRepo);
  });

  it('debe registrar un artículo con datos válidos', async () => {
    const input: RegistrarArticuloDTO = {
      id: 'art-001',
      nombre: 'Pechuga de pollo',
      cantidad: 50,
      unidadMedida: 'kg',
      nivelMinimo: 10,
    };

    const resultado = await registrarArticulo.ejecutar(input);

    expect(resultado.id).toBe('art-001');
    expect(resultado.nombre).toBe('Pechuga de pollo');
    expect(resultado.cantidad).toBe(50);
    expect(resultado.nivelMinimo).toBe(10);
    expect(mockInventarioRepo.registrar).toHaveBeenCalledTimes(1);
  });

  it('debe rechazar artículo con nombre vacío', async () => {
    const input: RegistrarArticuloDTO = {
      id: 'art-002',
      nombre: '',
      cantidad: 50,
      unidadMedida: 'kg',
      nivelMinimo: 10,
    };

    await expect(registrarArticulo.ejecutar(input)).rejects.toThrow(ValidacionError);
    expect(mockInventarioRepo.registrar).not.toHaveBeenCalled();
  });

  it('debe rechazar artículo con cantidad negativa', async () => {
    const input: RegistrarArticuloDTO = {
      id: 'art-003',
      nombre: 'Lechuga',
      cantidad: -5,
      unidadMedida: 'unidades',
      nivelMinimo: 5,
    };

    await expect(registrarArticulo.ejecutar(input)).rejects.toThrow(ValidacionError);
    expect(mockInventarioRepo.registrar).not.toHaveBeenCalled();
  });

  it('debe rechazar artículo con nivel mínimo menor a 1', async () => {
    const input: RegistrarArticuloDTO = {
      id: 'art-004',
      nombre: 'Salsa',
      cantidad: 20,
      unidadMedida: 'litros',
      nivelMinimo: 0,
    };

    await expect(registrarArticulo.ejecutar(input)).rejects.toThrow(ValidacionError);
    expect(mockInventarioRepo.registrar).not.toHaveBeenCalled();
  });

  it('debe rechazar artículo con unidad de medida vacía', async () => {
    const input: RegistrarArticuloDTO = {
      id: 'art-005',
      nombre: 'Pan',
      cantidad: 100,
      unidadMedida: '',
      nivelMinimo: 20,
    };

    await expect(registrarArticulo.ejecutar(input)).rejects.toThrow(ValidacionError);
    expect(mockInventarioRepo.registrar).not.toHaveBeenCalled();
  });

  it('debe rechazar artículo con nombre mayor a 100 caracteres', async () => {
    const input: RegistrarArticuloDTO = {
      id: 'art-006',
      nombre: 'A'.repeat(101),
      cantidad: 10,
      unidadMedida: 'kg',
      nivelMinimo: 5,
    };

    await expect(registrarArticulo.ejecutar(input)).rejects.toThrow(ValidacionError);
    expect(mockInventarioRepo.registrar).not.toHaveBeenCalled();
  });
});
