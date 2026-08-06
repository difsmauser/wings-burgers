import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AceptarEntrega } from './AceptarEntrega';
import { EstadoEntrega } from '@/domain/value-objects';
import { RecursoNoEncontradoError, LimiteEntregasExcedidoError, TransicionEstadoInvalidaError } from '@/shared/errors';
import type { IEntregaRepository, EntregaData } from '@/domain/ports/repositories';
import type { IPedidoRepository } from '@/domain/ports/repositories';
import type { IGeolocalizacionService } from '@/domain/ports/services';

describe('AceptarEntrega', () => {
  let entregaRepo: IEntregaRepository;
  let pedidoRepo: IPedidoRepository;
  let geoService: IGeolocalizacionService;
  let useCase: AceptarEntrega;

  const entregaPendiente: EntregaData = {
    id: 'entrega-1',
    pedidoId: 'pedido-1',
    repartidorId: 'repartidor-1',
    estado: EstadoEntrega.PENDIENTE,
    motivoNoEntrega: null,
    aceptadaEn: null,
    completadaEn: null,
    creadoEn: new Date('2024-01-01'),
  };

  beforeEach(() => {
    entregaRepo = {
      obtenerPorId: vi.fn(async () => ({ ...entregaPendiente })),
      contarActivasPorRepartidor: vi.fn(async () => 0),
      actualizar: vi.fn(async () => {}),
      listarPendientes: vi.fn(async () => []),
    };
    pedidoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(async () => ({} as any)),
      obtenerPorId: vi.fn(),
      obtenerPorNumero: vi.fn(),
      listarPorEstado: vi.fn(),
      listarPorCliente: vi.fn(),
      listarPorPeriodo: vi.fn(),
      contarPorPeriodo: vi.fn(),
    };
    geoService = {
      actualizarUbicacion: vi.fn(async () => {}),
      obtenerUbicacion: vi.fn(async () => null),
      calcularTiempoEstimado: vi.fn(async () => 15),
    };
    useCase = new AceptarEntrega(entregaRepo, pedidoRepo, geoService);
  });

  it('acepta una entrega pendiente con repartidor sin entregas activas', async () => {
    await useCase.ejecutar('entrega-1');

    expect(entregaRepo.obtenerPorId).toHaveBeenCalledWith('entrega-1');
    expect(entregaRepo.contarActivasPorRepartidor).toHaveBeenCalledWith('repartidor-1');
    expect(entregaRepo.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'entrega-1',
        estado: EstadoEntrega.EN_CAMINO,
      })
    );
    expect(pedidoRepo.actualizar).toHaveBeenCalledWith('pedido-1', { estado: 'en_camino' });
    expect(geoService.actualizarUbicacion).toHaveBeenCalledWith('repartidor-1', 0, 0);
  });

  it('lanza RecursoNoEncontradoError si la entrega no existe', async () => {
    vi.mocked(entregaRepo.obtenerPorId).mockResolvedValue(null);

    await expect(useCase.ejecutar('no-existe')).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('lanza LimiteEntregasExcedidoError si el repartidor tiene 3 entregas activas', async () => {
    vi.mocked(entregaRepo.contarActivasPorRepartidor).mockResolvedValue(3);

    await expect(useCase.ejecutar('entrega-1')).rejects.toThrow(LimiteEntregasExcedidoError);
    expect(entregaRepo.actualizar).not.toHaveBeenCalled();
  });

  it('permite aceptar con 2 entregas activas (menor al límite)', async () => {
    vi.mocked(entregaRepo.contarActivasPorRepartidor).mockResolvedValue(2);

    await useCase.ejecutar('entrega-1');

    expect(entregaRepo.actualizar).toHaveBeenCalled();
  });

  it('lanza TransicionEstadoInvalidaError si la entrega no está pendiente', async () => {
    vi.mocked(entregaRepo.obtenerPorId).mockResolvedValue({
      ...entregaPendiente,
      estado: EstadoEntrega.EN_CAMINO,
    });

    await expect(useCase.ejecutar('entrega-1')).rejects.toThrow(TransicionEstadoInvalidaError);
  });
});
