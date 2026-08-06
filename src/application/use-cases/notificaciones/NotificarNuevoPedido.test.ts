import { describe, it, expect, vi } from 'vitest';
import { NotificarNuevoPedido } from './NotificarNuevoPedido';
import type { INotificacionService } from '@/domain/ports/services';
import type { Pedido } from '@/shared/domain-types';

function crearMockNotificacionService(): INotificacionService {
  return {
    notificarNuevoPedido: vi.fn().mockResolvedValue(undefined),
    notificarCambioEstado: vi.fn().mockResolvedValue(undefined),
    notificarInventarioBajo: vi.fn().mockResolvedValue(undefined),
    notificarRepartidorDisponible: vi.fn().mockResolvedValue(undefined),
    enviarPush: vi.fn().mockResolvedValue({ exitoso: true, fecha: new Date() }),
  };
}

function crearPedidoMock(): Pedido {
  return {
    id: 'pedido-001',
    numero: 'P-001',
    clienteId: 'cliente-001',
    items: [
      { productoId: 'prod-1', nombre: 'Alitas BBQ', cantidad: 2, precioUnitario: 89.99 },
    ],
    estado: 'recibido',
    modalidad: 'local',
    total: 179.98,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

describe('NotificarNuevoPedido', () => {
  it('debe delegar la notificación al servicio de notificaciones', async () => {
    const notificacionService = crearMockNotificacionService();
    const useCase = new NotificarNuevoPedido(notificacionService);
    const pedido = crearPedidoMock();

    await useCase.ejecutar(pedido);

    expect(notificacionService.notificarNuevoPedido).toHaveBeenCalledWith(pedido);
    expect(notificacionService.notificarNuevoPedido).toHaveBeenCalledTimes(1);
  });

  it('debe propagar errores del servicio de notificaciones', async () => {
    const notificacionService = crearMockNotificacionService();
    vi.mocked(notificacionService.notificarNuevoPedido).mockRejectedValue(
      new Error('Error de conexión')
    );
    const useCase = new NotificarNuevoPedido(notificacionService);

    await expect(useCase.ejecutar(crearPedidoMock())).rejects.toThrow('Error de conexión');
  });
});
