import { SupabaseClient } from '@supabase/supabase-js';
import { IGeolocalizacionService } from '@/domain/ports/services/IGeolocalizacionService';
import { Coordenadas } from '@/shared/types';
import { ServicioExternoError } from '@/shared/errors';

/** Velocidad promedio de entrega en km/h (para cálculo de tiempo estimado) */
const VELOCIDAD_PROMEDIO_KMH = 30;

/** Radio de la Tierra en km (para fórmula de Haversine) */
const RADIO_TIERRA_KM = 6371;

/**
 * Adaptador de geolocalización usando Supabase como backend de persistencia.
 * Implementa IGeolocalizacionService para rastreo de repartidores.
 */
export class BrowserGeoAdapter implements IGeolocalizacionService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Actualiza la ubicación del repartidor en la tabla ubicacion_repartidor.
   * Se invoca cada 10 segundos mientras el repartidor está en camino.
   * @param repartidorId - ID del repartidor
   * @param lat - Latitud actual
   * @param lng - Longitud actual
   */
  async actualizarUbicacion(repartidorId: string, lat: number, lng: number): Promise<void> {
    const { error } = await this.supabase
      .from('ubicacion_repartidor')
      .upsert(
        {
          repartidor_id: repartidorId,
          latitud: lat,
          longitud: lng,
          timestamp: new Date().toISOString(),
        },
        { onConflict: 'repartidor_id' }
      );

    if (error) {
      throw new ServicioExternoError('Supabase Geolocation', error.message);
    }
  }

  /**
   * Obtiene la última ubicación conocida del repartidor.
   * @param repartidorId - ID del repartidor
   * @returns Coordenadas o null si no hay registro
   */
  async obtenerUbicacion(repartidorId: string): Promise<Coordenadas | null> {
    const { data, error } = await this.supabase
      .from('ubicacion_repartidor')
      .select('latitud, longitud')
      .eq('repartidor_id', repartidorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Si no hay registro, retornar null en lugar de lanzar error
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new ServicioExternoError('Supabase Geolocation', error.message);
    }

    if (!data) {
      return null;
    }

    return {
      lat: data.latitud,
      lng: data.longitud,
    };
  }

  /**
   * Calcula el tiempo estimado de llegada entre dos puntos.
   * Usa la fórmula de Haversine para calcular distancia en línea recta
   * y divide entre velocidad promedio de entrega.
   * @param origen - Coordenadas del repartidor
   * @param destino - Coordenadas del cliente
   * @returns Tiempo estimado en minutos (mínimo 1 minuto)
   */
  async calcularTiempoEstimado(origen: Coordenadas, destino: Coordenadas): Promise<number> {
    const distanciaKm = this.calcularDistanciaHaversine(origen, destino);
    const tiempoHoras = distanciaKm / VELOCIDAD_PROMEDIO_KMH;
    const tiempoMinutos = Math.ceil(tiempoHoras * 60);

    // Mínimo 1 minuto
    return Math.max(1, tiempoMinutos);
  }

  /**
   * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine.
   * @returns Distancia en kilómetros
   */
  private calcularDistanciaHaversine(punto1: Coordenadas, punto2: Coordenadas): number {
    const dLat = this.gradosARadianes(punto2.lat - punto1.lat);
    const dLng = this.gradosARadianes(punto2.lng - punto1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.gradosARadianes(punto1.lat)) *
        Math.cos(this.gradosARadianes(punto2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return RADIO_TIERRA_KM * c;
  }

  /**
   * Convierte grados a radianes.
   */
  private gradosARadianes(grados: number): number {
    return grados * (Math.PI / 180);
  }
}
