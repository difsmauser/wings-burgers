import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrearProducto } from './CrearProducto';
import { Categoria } from '@/domain/value-objects';
import { ValidacionError } from '@/shared/errors';
import type { IProductoRepository } from '@/domain/ports/repositories';
import type { IStorageService } from '@/domain/ports/services';
import type { CrearProductoDTO } from '@/application/dtos/ProductoDTO';

describe('CrearProducto', () => {
  let productoRepo: IProductoRepository;
  let storageService: IStorageService;
  let useCase: CrearProducto;

  beforeEach(() => {
    productoRepo = {
      crear: vi.fn(async (p) => p),
      actualizar: vi.fn(),
      desactivar: vi.fn(),
      obtenerPorId: vi.fn(),
      listarActivos: vi.fn(),
      listarPorCategoria: vi.fn(),
    };
    storageService = {
      subirImagen: vi.fn(async () => 'https://storage.example.com/img.jpg'),
      eliminarImagen: vi.fn(),
      obtenerUrlPublica: vi.fn(() => 'https://storage.example.com/img.jpg'),
    };
    useCase = new CrearProducto(productoRepo, storageService);
  });

  it('crea un producto con datos válidos', async () => {
    const input: CrearProductoDTO = {
      nombre: 'Alitas BBQ',
      descripcion: 'Alitas bañadas en salsa BBQ',
      categoria: Categoria.ALITAS,
      precio: 129.99,
    };

    const resultado = await useCase.ejecutar(input);

    expect(resultado.nombre).toBe('Alitas BBQ');
    expect(resultado.descripcion).toBe('Alitas bañadas en salsa BBQ');
    expect(resultado.categoria).toBe(Categoria.ALITAS);
    expect(resultado.precio.valor).toBe(129.99);
    expect(resultado.activo).toBe(true);
    expect(productoRepo.crear).toHaveBeenCalledOnce();
  });

  it('lanza ValidacionError si el nombre está vacío', async () => {
    const input: CrearProductoDTO = {
      nombre: '',
      categoria: Categoria.ALITAS,
      precio: 50,
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow(ValidacionError);
  });

  it('lanza ValidacionError si el nombre excede 100 caracteres', async () => {
    const input: CrearProductoDTO = {
      nombre: 'a'.repeat(101),
      categoria: Categoria.ALITAS,
      precio: 50,
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow(ValidacionError);
  });

  it('lanza ValidacionError si la descripción excede 500 caracteres', async () => {
    const input: CrearProductoDTO = {
      nombre: 'Producto válido',
      descripcion: 'x'.repeat(501),
      categoria: Categoria.ALITAS,
      precio: 50,
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow(ValidacionError);
  });

  it('lanza ValidacionError si falta la categoría', async () => {
    const input = {
      nombre: 'Producto válido',
      precio: 50,
    } as CrearProductoDTO;

    await expect(useCase.ejecutar(input)).rejects.toThrow(ValidacionError);
  });

  it('lanza error si el precio es inválido', async () => {
    const input: CrearProductoDTO = {
      nombre: 'Producto válido',
      categoria: Categoria.ALITAS,
      precio: 0,
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow();
  });

  it('sube imagen cuando se proporciona un archivo válido', async () => {
    const input: CrearProductoDTO = {
      nombre: 'Hamburguesa Doble',
      categoria: Categoria.HAMBURGUESAS,
      precio: 159.50,
      imagen: {
        nombre: 'burger.jpg',
        tipo: 'image/jpeg',
        tamano: 2 * 1024 * 1024,
        archivo: new File([], 'burger.jpg'),
      },
    };

    const resultado = await useCase.ejecutar(input);

    expect(storageService.subirImagen).toHaveBeenCalledOnce();
    expect(resultado.imagenUrl).toBe('https://storage.example.com/img.jpg');
  });

  it('rechaza imagen con formato inválido', async () => {
    const input: CrearProductoDTO = {
      nombre: 'Producto',
      categoria: Categoria.ALITAS,
      precio: 50,
      imagen: {
        nombre: 'doc.pdf',
        tipo: 'application/pdf',
        tamano: 1024,
        archivo: new File([], 'doc.pdf'),
      },
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow();
    expect(storageService.subirImagen).not.toHaveBeenCalled();
  });

  it('rechaza imagen que excede 5MB', async () => {
    const input: CrearProductoDTO = {
      nombre: 'Producto',
      categoria: Categoria.ALITAS,
      precio: 50,
      imagen: {
        nombre: 'big.png',
        tipo: 'image/png',
        tamano: 6 * 1024 * 1024,
        archivo: new File([], 'big.png'),
      },
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow();
    expect(storageService.subirImagen).not.toHaveBeenCalled();
  });

  it('crea producto sin imagen cuando no se proporciona', async () => {
    const input: CrearProductoDTO = {
      nombre: 'Bebida',
      categoria: Categoria.BEBIDAS,
      precio: 35,
    };

    const resultado = await useCase.ejecutar(input);

    expect(resultado.imagenUrl).toBeNull();
    expect(storageService.subirImagen).not.toHaveBeenCalled();
  });
});
