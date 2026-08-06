import { describe, it, expect, vi } from 'vitest';
import { NotificarInventarioBajo } from './NotificarInventarioBajo';
import type { INotificacionService } from '@/domain/ports/services';
import type { ArticuloInventario } from '@/shared/domain-types';

function crearMockNotificacionService(): INotificacionService {
  return {
    notificarNuevoPedido: vi.fn().mockResolvedValue(undefined),
    notificarCambioEstado: vi.fn().mockResolvedValue(undefined),
    notificarInventarioBajo: vi.fn().mockResolvedValue(undefined),
    notificarRepartidorDisponible: vi.fn().mockResolvedValue(undefined),
    enviarPush: vi.fn().mockResolvedValue({ exitoso: true, fecha: new Date() }),
  };
}

function crearArticuloMock(): ArticuloInventario {
  return {
    id: 'art-001',
    nombre: 'Salsa BBQ',
    cantidad: 2,
    unidad: 'litros',
    nivelMinimo: 5,
    productoIds: ['prod-1', 'prod-2'],
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

describe('NotificarInventarioBajo', () => {
  it('debe delegar la notificación de inventario bajo al servicio', async () => {
    const notificacionService = crearMockNotificacionService();
    const useCase = new NotificarInventarioBajo(notificacionService);
    const articulo = crearArticuloMock();

    await useCase.ejecutar(articulo);

    expect(notificacionService.notificarInventarioBajo).toHaveBeenCalledWith(articulo);
    expect(notificacionService.notificarInventarioBajo).toHaveBeenCalledTimes(1);
  });

  it('debe propagar errores del servicio de notificaciones', async () => {
    const notificacionService = crearMockNotificacionService();
    vi.mocked(notificacionService.notificarInventarioBajo).mockRejectedValue(
      new Error('Servicio no disponible')
    );
    const useCase = new NotificarInventarioBajo(notificacionService);

    await expect(useCase.ejecutar(crearArticuloMock())).rejects.toThrow(
      'Servicio no disponible'
    );
  });
});
