import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompletarEntrega } from './CompletarEntrega';
import { EstadoEntrega } from '@/domain/value-objects';
import { RecursoNoEncontradoError, TransicionEstadoInvalidaError } from '@/shared/errors';
import type { IEntregaRepository, EntregaData } from '@/domain/ports/repositories';
import type { IPedidoRepository } from '@/domain/ports/repositories';
import type { IGeolocalizacionService } from '@/domain/ports/services';

describe('CompletarEntrega', () => {
  let entregaRepo: IEntregaRepository;
  let pedidoRepo: IPedidoRepository;
  let geoService: IGeolocalizacionService;
  let useCase: CompletarEntrega;

  const entregaEnCamino: EntregaData = {
    id: 'entrega-1',
    pedidoId: 'pedido-1',
    repartidorId: 'repartidor-1',
    estado: EstadoEntrega.EN_CAMINO,
    motivoNoEntrega: null,
    aceptadaEn: new Date('2024-01-01T10:00:00'),
    completadaEn: null,
    creadoEn: new Date('2024-01-01'),
  };

  beforeEach(() => {
    entregaRepo = {
      obtenerPorId: vi.fn(async () => ({ ...entregaEnCamino })),
      contarActivasPorRepartidor: vi.fn(async () => 1),
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
    useCase = new CompletarEntrega(entregaRepo, pedidoRepo, geoService);
  });

  it('completa una entrega en camino exitosamente', async () => {
    await useCase.ejecutar('entrega-1');

    expect(entregaRepo.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'entrega-1',
        estado: EstadoEntrega.ENTREGADO,
      })
    );
    expect(pedidoRepo.actualizar).toHaveBeenCalledWith('pedido-1', { estado: 'entregado' });
    expect(geoService.actualizarUbicacion).toHaveBeenCalledWith('repartidor-1', 0, 0);
  });

  it('lanza RecursoNoEncontradoError si la entrega no existe', async () => {
    vi.mocked(entregaRepo.obtenerPorId).mockResolvedValue(null);

    await expect(useCase.ejecutar('no-existe')).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('lanza TransicionEstadoInvalidaError si la entrega no está en camino', async () => {
    vi.mocked(entregaRepo.obtenerPorId).mockResolvedValue({
      ...entregaEnCamino,
      estado: EstadoEntrega.PENDIENTE,
    });

    await expect(useCase.ejecutar('entrega-1')).rejects.toThrow(TransicionEstadoInvalidaError);
  });
});
