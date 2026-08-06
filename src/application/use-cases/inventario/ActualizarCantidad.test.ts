import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActualizarCantidad } from './ActualizarCantidad';
import { IInventarioRepository, INotificacionService } from '@/domain/ports';
import { ArticuloInventario as ArticuloInventarioType } from '@/shared/domain-types';
import { RecursoNoEncontradoError, ValidacionError } from '@/shared/errors';

describe('ActualizarCantidad', () => {
  let actualizarCantidad: ActualizarCantidad;
  let mockInventarioRepo: IInventarioRepository;
  let mockNotificacionService: INotificacionService;

  const articuloExistente: ArticuloInventarioType = {
    id: 'art-001',
    nombre: 'Pechuga de pollo',
    cantidad: 50,
    unidad: 'kg',
    nivelMinimo: 10,
    productoIds: ['prod-001'],
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };

  beforeEach(() => {
    mockInventarioRepo = {
      registrar: vi.fn(),
      actualizar: vi.fn().mockImplementation(async (id, cantidad) => ({
        ...articuloExistente,
        cantidad,
        actualizadoEn: new Date(),
      })),
      obtenerPorId: vi.fn().mockResolvedValue(articuloExistente),
      listarBajoMinimo: vi.fn(),
      obtenerArticulosPorProducto: vi.fn(),
      registrarMovimiento: vi.fn(),
    };

    mockNotificacionService = {
      notificarNuevoPedido: vi.fn(),
      notificarCambioEstado: vi.fn(),
      notificarInventarioBajo: vi.fn(),
      notificarRepartidorDisponible: vi.fn(),
      enviarPush: vi.fn(),
    };

    actualizarCantidad = new ActualizarCantidad(mockInventarioRepo, mockNotificacionService);
  });

  it('debe incrementar la cantidad con movimiento de entrada', async () => {
    const resultado = await actualizarCantidad.ejecutar('art-001', 20, 'entrada', 'admin-001');

    expect(resultado.cantidad).toBe(70); // 50 + 20
    expect(mockInventarioRepo.registrarMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        articuloId: 'art-001',
        cantidadAnterior: 50,
        cantidadNueva: 70,
        tipoMovimiento: 'entrada',
        adminId: 'admin-001',
      })
    );
    expect(mockInventarioRepo.actualizar).toHaveBeenCalledWith('art-001', 70, 'entrada', 'admin-001');
  });

  it('debe decrementar la cantidad con movimiento de salida', async () => {
    const resultado = await actualizarCantidad.ejecutar('art-001', 10, 'salida', 'admin-001');

    expect(resultado.cantidad).toBe(40); // 50 - 10
    expect(mockInventarioRepo.registrarMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        articuloId: 'art-001',
        cantidadAnterior: 50,
        cantidadNueva: 40,
        tipoMovimiento: 'salida',
        adminId: 'admin-001',
      })
    );
  });

  it('debe notificar cuando artículo queda bajo nivel mínimo', async () => {
    // Artículo con cantidad 12, nivel mínimo 10 — si sacamos 5, queda en 7 (bajo mínimo)
    const articuloBajoMinimo: ArticuloInventarioType = {
      ...articuloExistente,
      cantidad: 12,
      nivelMinimo: 10,
    };
    vi.mocked(mockInventarioRepo.obtenerPorId).mockResolvedValue(articuloBajoMinimo);

    await actualizarCantidad.ejecutar('art-001', 5, 'salida', 'admin-001');

    expect(mockNotificacionService.notificarInventarioBajo).toHaveBeenCalledWith(articuloBajoMinimo);
  });

  it('no debe notificar cuando artículo tiene stock suficiente', async () => {
    // Cantidad 50, nivel mínimo 10, si sacamos 5 queda en 45 (bien por encima)
    await actualizarCantidad.ejecutar('art-001', 5, 'salida', 'admin-001');

    expect(mockNotificacionService.notificarInventarioBajo).not.toHaveBeenCalled();
  });

  it('debe lanzar error si artículo no existe', async () => {
    vi.mocked(mockInventarioRepo.obtenerPorId).mockResolvedValue(null);

    await expect(
      actualizarCantidad.ejecutar('art-999', 10, 'entrada', 'admin-001')
    ).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('debe lanzar error si la cantidad es cero', async () => {
    await expect(
      actualizarCantidad.ejecutar('art-001', 0, 'entrada', 'admin-001')
    ).rejects.toThrow(ValidacionError);
  });

  it('debe lanzar error si la cantidad es negativa', async () => {
    await expect(
      actualizarCantidad.ejecutar('art-001', -5, 'salida', 'admin-001')
    ).rejects.toThrow(ValidacionError);
  });

  it('debe registrar el movimiento en el historial', async () => {
    await actualizarCantidad.ejecutar('art-001', 15, 'entrada', 'admin-002');

    expect(mockInventarioRepo.registrarMovimiento).toHaveBeenCalledTimes(1);
    expect(mockInventarioRepo.registrarMovimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        articuloId: 'art-001',
        adminId: 'admin-002',
        tipoMovimiento: 'entrada',
      })
    );
  });
});
