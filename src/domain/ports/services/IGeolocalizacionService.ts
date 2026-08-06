import { Coordenadas } from '@/shared/types';

/**
 * Puerto de servicio para geolocalización y rastreo.
 * Define las operaciones disponibles para el rastreo de repartidores
 * y cálculo de tiempos estimados de entrega.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IGeolocalizacionService {
  /**
   * Actualiza la ubicación actual del repartidor.
   * Se invoca periódicamente (cada 10 segundos) mientras el repartidor
   * está en camino.
   * @param repartidorId - Identificador del repartidor
   * @param lat - Latitud de la ubicación actual
   * @param lng - Longitud de la ubicación actual
   */
  actualizarUbicacion(repartidorId: string, lat: number, lng: number): Promise<void>;

  /**
   * Obtiene la última ubicación conocida del repartidor.
   * @param repartidorId - Identificador del repartidor
   * @returns Coordenadas de la última ubicación o null si no hay registro
   */
  obtenerUbicacion(repartidorId: string): Promise<Coordenadas | null>;

  /**
   * Calcula el tiempo estimado de llegada entre dos puntos.
   * @param origen - Coordenadas del punto de origen (ubicación del repartidor)
   * @param destino - Coordenadas del punto de destino (dirección del cliente)
   * @returns Tiempo estimado en minutos
   */
  calcularTiempoEstimado(origen: Coordenadas, destino: Coordenadas): Promise<number>;
}
