import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditarProducto } from './EditarProducto';
import { Categoria } from '@/domain/value-objects';
import { ValidacionError, RecursoNoEncontradoError } from '@/shared/errors';
import type { IProductoRepository } from '@/domain/ports/repositories';
import type { IStorageService } from '@/domain/ports/services';
import type { Producto as ProductoData } from '@/shared/domain-types';

describe('EditarProducto', () => {
  let productoRepo: IProductoRepository;
  let storageService: IStorageService;
  let useCase: EditarProducto;
  let productoExistente: ProductoData;

  beforeEach(() => {
    productoExistente = {
      id: 'prod-1',
      nombre: 'Alitas BBQ',
      descripcion: 'Alitas bañadas en salsa BBQ',
      categoria: 'alitas',
      precio: 129.99,
      imagen: 'https://storage.example.com/old.jpg',
      disponible: true,
      activo: true,
      creadoEn: new Date('2024-01-01'),
      actualizadoEn: new Date('2024-01-01'),
    };

    productoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(async (_id, datos) => ({ ...productoExistente, ...datos })),
      desactivar: vi.fn(),
      obtenerPorId: vi.fn(async () => productoExistente),
      listarActivos: vi.fn(),
      listarPorCategoria: vi.fn(),
    };
    storageService = {
      subirImagen: vi.fn(async () => 'https://storage.example.com/new.jpg'),
      eliminarImagen: vi.fn(),
      obtenerUrlPublica: vi.fn(() => ''),
    };
    useCase = new EditarProducto(productoRepo, storageService);
  });

  it('actualiza el nombre del producto', async () => {
    const resultado = await useCase.ejecutar('prod-1', { nombre: 'Alitas Buffalo' });

    expect(resultado.nombre).toBe('Alitas Buffalo');
    expect(productoRepo.actualizar).toHaveBeenCalledOnce();
  });

  it('actualiza el precio del producto', async () => {
    const resultado = await useCase.ejecutar('prod-1', { precio: 149.99 });

    expect(resultado.precio.valor).toBe(149.99);
  });

  it('lanza RecursoNoEncontradoError si el producto no existe', async () => {
    vi.mocked(productoRepo.obtenerPorId).mockResolvedValueOnce(null);

    await expect(useCase.ejecutar('no-existe', { nombre: 'Test' }))
      .rejects.toThrow(RecursoNoEncontradoError);
  });

  it('lanza ValidacionError si el nombre está vacío', async () => {
    await expect(useCase.ejecutar('prod-1', { nombre: '' }))
      .rejects.toThrow(ValidacionError);
  });

  it('lanza ValidacionError si el nombre excede 100 caracteres', async () => {
    await expect(useCase.ejecutar('prod-1', { nombre: 'a'.repeat(101) }))
      .rejects.toThrow(ValidacionError);
  });

  it('lanza ValidacionError si la descripción excede 500 caracteres', async () => {
    await expect(useCase.ejecutar('prod-1', { descripcion: 'x'.repeat(501) }))
      .rejects.toThrow(ValidacionError);
  });

  it('sube nueva imagen y elimina la anterior', async () => {
    await useCase.ejecutar('prod-1', {
      imagen: {
        nombre: 'nueva.png',
        tipo: 'image/png',
        tamano: 1024 * 1024,
        archivo: new File([], 'nueva.png'),
      },
    });

    expect(storageService.eliminarImagen).toHaveBeenCalledWith('https://storage.example.com/old.jpg');
    expect(storageService.subirImagen).toHaveBeenCalledOnce();
  });

  it('elimina imagen cuando se solicita', async () => {
    await useCase.ejecutar('prod-1', { eliminarImagen: true });

    expect(storageService.eliminarImagen).toHaveBeenCalledWith('https://storage.example.com/old.jpg');
    expect(storageService.subirImagen).not.toHaveBeenCalled();
  });

  it('no modifica imagen si no se solicita cambio', async () => {
    await useCase.ejecutar('prod-1', { nombre: 'Solo nombre' });

    expect(storageService.eliminarImagen).not.toHaveBeenCalled();
    expect(storageService.subirImagen).not.toHaveBeenCalled();
  });
});
