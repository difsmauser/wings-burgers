import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActualizarUbicacion } from './ActualizarUbicacion';
import type { IGeolocalizacionService } from '@/domain/ports/services';
import type { INotificacionService } from '@/domain/ports/services';

describe('ActualizarUbicacion', () => {
  let geoService: IGeolocalizacionService;
  let notificacionService: INotificacionService;
  let useCase: ActualizarUbicacion;

  beforeEach(() => {
    geoService = {
      actualizarUbicacion: vi.fn(async () => {}),
      obtenerUbicacion: vi.fn(async () => null),
      calcularTiempoEstimado: vi.fn(async () => 15),
    };
    notificacionService = {
      notificarNuevoPedido: vi.fn(async () => {}),
      notificarCambioEstado: vi.fn(async () => {}),
      notificarInventarioBajo: vi.fn(async () => {}),
      notificarRepartidorDisponible: vi.fn(async () => {}),
      enviarPush: vi.fn(async () => ({ exitoso: true, fecha: new Date() })),
    };
    useCase = new ActualizarUbicacion(geoService, notificacionService);
  });

  it('persiste la ubicación y hace broadcast', async () => {
    await useCase.ejecutar('repartidor-1', 19.4326, -99.1332);

    expect(geoService.actualizarUbicacion).toHaveBeenCalledWith('repartidor-1', 19.4326, -99.1332);
    expect(notificacionService.enviarPush).toHaveBeenCalledWith(
      'repartidor-1',
      'ubicacion_actualizada',
      JSON.stringify({ lat: 19.4326, lng: -99.1332 })
    );
  });

  it('propaga coordenadas correctamente', async () => {
    await useCase.ejecutar('repartidor-2', -34.6037, -58.3816);

    expect(geoService.actualizarUbicacion).toHaveBeenCalledWith('repartidor-2', -34.6037, -58.3816);
  });
});
