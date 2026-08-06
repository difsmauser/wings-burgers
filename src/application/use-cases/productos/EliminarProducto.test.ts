import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EliminarProducto } from './EliminarProducto';
import { RecursoNoEncontradoError } from '@/shared/errors';
import type { IProductoRepository } from '@/domain/ports/repositories';
import type { Producto as ProductoData } from '@/shared/domain-types';

describe('EliminarProducto', () => {
  let productoRepo: IProductoRepository;
  let useCase: EliminarProducto;

  beforeEach(() => {
    const productoExistente: ProductoData = {
      id: 'prod-1',
      nombre: 'Alitas BBQ',
      descripcion: 'Alitas bañadas en salsa BBQ',
      categoria: 'alitas',
      precio: 129.99,
      disponible: true,
      activo: true,
      creadoEn: new Date('2024-01-01'),
      actualizadoEn: new Date('2024-01-01'),
    };

    productoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(),
      desactivar: vi.fn(),
      obtenerPorId: vi.fn(async () => productoExistente),
      listarActivos: vi.fn(),
      listarPorCategoria: vi.fn(),
    };
    useCase = new EliminarProducto(productoRepo);
  });

  it('desactiva un producto existente', async () => {
    await useCase.ejecutar('prod-1');

    expect(productoRepo.desactivar).toHaveBeenCalledWith('prod-1');
  });

  it('lanza RecursoNoEncontradoError si el producto no existe', async () => {
    vi.mocked(productoRepo.obtenerPorId).mockResolvedValueOnce(null);

    await expect(useCase.ejecutar('no-existe'))
      .rejects.toThrow(RecursoNoEncontradoError);
  });

  it('no llama a desactivar si el producto no existe', async () => {
    vi.mocked(productoRepo.obtenerPorId).mockResolvedValueOnce(null);

    try {
      await useCase.ejecutar('no-existe');
    } catch {
      // expected
    }

    expect(productoRepo.desactivar).not.toHaveBeenCalled();
  });
});
