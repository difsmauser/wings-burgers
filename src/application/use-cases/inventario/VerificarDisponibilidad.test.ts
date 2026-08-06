import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerificarDisponibilidad } from './VerificarDisponibilidad';
import { IInventarioRepository, IProductoRepository } from '@/domain/ports';
import { ArticuloInventario as ArticuloInventarioType, Producto } from '@/shared/domain-types';
import { RecursoNoEncontradoError } from '@/shared/errors';

describe('VerificarDisponibilidad', () => {
  let verificarDisponibilidad: VerificarDisponibilidad;
  let mockInventarioRepo: IInventarioRepository;
  let mockProductoRepo: IProductoRepository;

  const productoExistente: Producto = {
    id: 'prod-001',
    nombre: 'Alitas BBQ',
    descripcion: 'Alitas bañadas en salsa BBQ',
    categoria: 'alitas',
    precio: 120,
    disponible: true,
    activo: true,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };

  const articulosConStock: ArticuloInventarioType[] = [
    {
      id: 'art-001',
      nombre: 'Pechuga de pollo',
      cantidad: 50,
      unidad: 'kg',
      nivelMinimo: 10,
      productoIds: ['prod-001'],
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    },
    {
      id: 'art-002',
      nombre: 'Salsa BBQ',
      cantidad: 20,
      unidad: 'litros',
      nivelMinimo: 5,
      productoIds: ['prod-001'],
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    },
  ];

  beforeEach(() => {
    mockInventarioRepo = {
      registrar: vi.fn(),
      actualizar: vi.fn(),
      obtenerPorId: vi.fn(),
      listarBajoMinimo: vi.fn(),
      obtenerArticulosPorProducto: vi.fn().mockResolvedValue(articulosConStock),
      registrarMovimiento: vi.fn(),
    };

    mockProductoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn().mockResolvedValue(productoExistente),
      desactivar: vi.fn(),
      obtenerPorId: vi.fn().mockResolvedValue(productoExistente),
      listarActivos: vi.fn(),
      listarPorCategoria: vi.fn(),
    };

    verificarDisponibilidad = new VerificarDisponibilidad(mockInventarioRepo, mockProductoRepo);
  });

  it('debe retornar true cuando todos los artículos tienen stock', async () => {
    const resultado = await verificarDisponibilidad.ejecutar('prod-001');

    expect(resultado).toBe(true);
  });

  it('debe retornar false cuando algún artículo tiene cantidad cero', async () => {
    const articulosSinStock: ArticuloInventarioType[] = [
      { ...articulosConStock[0] },
      { ...articulosConStock[1], cantidad: 0 },
    ];
    vi.mocked(mockInventarioRepo.obtenerArticulosPorProducto).mockResolvedValue(articulosSinStock);

    const resultado = await verificarDisponibilidad.ejecutar('prod-001');

    expect(resultado).toBe(false);
  });

  it('debe retornar false cuando no hay artículos asociados al producto', async () => {
    vi.mocked(mockInventarioRepo.obtenerArticulosPorProducto).mockResolvedValue([]);

    const resultado = await verificarDisponibilidad.ejecutar('prod-001');

    expect(resultado).toBe(false);
  });

  it('debe actualizar disponibilidad del producto cuando cambia', async () => {
    // Producto actualmente disponible, pero artículos sin stock
    const articulosSinStock: ArticuloInventarioType[] = [
      { ...articulosConStock[0], cantidad: 0 },
    ];
    vi.mocked(mockInventarioRepo.obtenerArticulosPorProducto).mockResolvedValue(articulosSinStock);

    await verificarDisponibilidad.ejecutar('prod-001');

    expect(mockProductoRepo.actualizar).toHaveBeenCalledWith(
      'prod-001',
      expect.objectContaining({ disponible: false })
    );
  });

  it('debe lanzar error si el producto no existe', async () => {
    vi.mocked(mockProductoRepo.obtenerPorId).mockResolvedValue(null);

    await expect(
      verificarDisponibilidad.ejecutar('prod-999')
    ).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('no debe actualizar disponibilidad si no cambió', async () => {
    // Producto disponible=true y todos los artículos con stock => no cambia
    await verificarDisponibilidad.ejecutar('prod-001');

    expect(mockProductoRepo.actualizar).not.toHaveBeenCalled();
  });

  it('debe marcar producto como disponible cuando se repone stock', async () => {
    // Producto actualmente no disponible, artículos con stock
    const productoNoDisponible: Producto = { ...productoExistente, disponible: false };
    vi.mocked(mockProductoRepo.obtenerPorId).mockResolvedValue(productoNoDisponible);

    await verificarDisponibilidad.ejecutar('prod-001');

    expect(mockProductoRepo.actualizar).toHaveBeenCalledWith(
      'prod-001',
      expect.objectContaining({ disponible: true })
    );
  });
});
