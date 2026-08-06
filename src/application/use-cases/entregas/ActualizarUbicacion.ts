import type { IGeolocalizacionService } from '@/domain/ports/services';
import type { INotificacionService } from '@/domain/ports/services';

/**
 * Caso de uso: Actualizar la ubicación del repartidor en tiempo real.
 * Recibe coordenadas GPS, las persiste en el servicio de geolocalización
 * y hace broadcast a los clientes vía realtime.
 */
export class ActualizarUbicacion {
  constructor(
    private readonly geoService: IGeolocalizacionService,
    private readonly notificacionService: INotificacionService
  ) {}

  async ejecutar(repartidorId: string, lat: number, lng: number): Promise<void> {
    // 1. Persistir la nueva ubicación
    await this.geoService.actualizarUbicacion(repartidorId, lat, lng);

    // 2. Broadcast de ubicación al cliente vía realtime
    await this.notificacionService.enviarPush(
      repartidorId,
      'ubicacion_actualizada',
      JSON.stringify({ lat, lng })
    );
  }
}
