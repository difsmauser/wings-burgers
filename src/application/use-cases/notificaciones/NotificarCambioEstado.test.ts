import { describe, it, expect, vi } from 'vitest';
import { NotificarCambioEstado } from './NotificarCambioEstado';
import type { INotificacionService } from '@/domain/ports/services';

function crearMockNotificacionService(): INotificacionService {
  return {
    notificarNuevoPedido: vi.fn().mockResolvedValue(undefined),
    notificarCambioEstado: vi.fn().mockResolvedValue(undefined),
    notificarInventarioBajo: vi.fn().mockResolvedValue(undefined),
    notificarRepartidorDisponible: vi.fn().mockResolvedValue(undefined),
    enviarPush: vi.fn().mockResolvedValue({ exitoso: true, fecha: new Date() }),
  };
}

describe('NotificarCambioEstado', () => {
  it('debe delegar la notificación de cambio de estado al servicio', async () => {
    const notificacionService = crearMockNotificacionService();
    const useCase = new NotificarCambioEstado(notificacionService);

    await useCase.ejecutar('pedido-001', 'en_preparacion');

    expect(notificacionService.notificarCambioEstado).toHaveBeenCalledWith(
      'pedido-001',
      'en_preparacion'
    );
    expect(notificacionService.notificarCambioEstado).toHaveBeenCalledTimes(1);
  });

  it('debe funcionar con cualquier estado válido', async () => {
    const notificacionService = crearMockNotificacionService();
    const useCase = new NotificarCambioEstado(notificacionService);

    await useCase.ejecutar('pedido-002', 'entregado');

    expect(notificacionService.notificarCambioEstado).toHaveBeenCalledWith(
      'pedido-002',
      'entregado'
    );
  });

  it('debe propagar errores del servicio de notificaciones', async () => {
    const notificacionService = crearMockNotificacionService();
    vi.mocked(notificacionService.notificarCambioEstado).mockRejectedValue(
      new Error('Push no entregado')
    );
    const useCase = new NotificarCambioEstado(notificacionService);

    await expect(useCase.ejecutar('pedido-001', 'en_preparacion')).rejects.toThrow(
      'Push no entregado'
    );
  });
});
