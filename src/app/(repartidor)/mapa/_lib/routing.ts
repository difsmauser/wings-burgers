/**
 * Servicio de Routing con OSRM (Open Source Routing Machine)
 * Calcula rutas, ETA y distancia entre dos puntos por carretera.
 *
 * API: https://router.project-osrm.org/route/v1/driving/
 * Formato: /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson
 * Sin límite de requests conocido (servicio demo público)
 */

import type { Coordenadas } from './geocoding';

// ============================================================================
// Types
// ============================================================================

export interface RutaInfo {
  /** Coordenadas de la ruta como array de [lat, lng] para Leaflet */
  coordenadas: [number, number][];
  /** Distancia en metros */
  distanciaMetros: number;
  /** Duración estimada en segundos */
  duracionSegundos: number;
  /** Distancia formateada para UI */
  distanciaTexto: string;
  /** ETA formateado para UI */
  etaTexto: string;
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
}

interface OSRMRoute {
  geometry: {
    type: string;
    coordinates: [number, number][]; // [lon, lat]
  };
  distance: number; // metros
  duration: number; // segundos
  legs: {
    distance: number;
    duration: number;
  }[];
}

// ============================================================================
// Constants
// ============================================================================

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

// ============================================================================
// Cache
// ============================================================================

const routeCache = new Map<string, RutaInfo>();

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formatea distancia en metros a texto legible.
 */
function formatearDistancia(metros: number): string {
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }
  return `${(metros / 1000).toFixed(1)} km`;
}

/**
 * Formatea duración en segundos a texto legible.
 */
function formatearETA(segundos: number): string {
  if (segundos < 60) {
    return '< 1 min';
  }
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas}h ${mins}min`;
}

/**
 * Genera una clave de cache basada en los puntos de origen y destino.
 * Redondea a 4 decimales para agrupar posiciones cercanas.
 */
function generarCacheKey(origen: Coordenadas, destino: Coordenadas): string {
  const o = `${origen.lat.toFixed(4)},${origen.lng.toFixed(4)}`;
  const d = `${destino.lat.toFixed(4)},${destino.lng.toFixed(4)}`;
  return `${o}→${d}`;
}

// ============================================================================
// Funciones principales
// ============================================================================

/**
 * Calcula la ruta por carretera entre origen y destino usando OSRM.
 *
 * @param origen - Coordenadas del punto de inicio (posición del repartidor)
 * @param destino - Coordenadas del destino (dirección del cliente)
 * @param useCache - Si usar cache (default: true, desactivar cuando posición cambia mucho)
 * @returns RutaInfo con coordenadas, distancia y ETA, o null si falla
 */
export async function calcularRuta(
  origen: Coordenadas,
  destino: Coordenadas,
  useCache = true
): Promise<RutaInfo | null> {
  // Validar coordenadas
  if (
    !isFinite(origen.lat) ||
    !isFinite(origen.lng) ||
    !isFinite(destino.lat) ||
    !isFinite(destino.lng)
  ) {
    return null;
  }

  // Verificar cache
  const cacheKey = generarCacheKey(origen, destino);
  if (useCache && routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    // OSRM espera formato: lon,lat;lon,lat
    const url = `${OSRM_BASE_URL}/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson&steps=false`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];

    // Convertir coordenadas de GeoJSON [lon, lat] a Leaflet [lat, lng]
    const coordenadas: [number, number][] = route.geometry.coordinates.map(
      ([lon, lat]) => [lat, lon]
    );

    const rutaInfo: RutaInfo = {
      coordenadas,
      distanciaMetros: route.distance,
      duracionSegundos: route.duration,
      distanciaTexto: formatearDistancia(route.distance),
      etaTexto: formatearETA(route.duration),
    };

    // Guardar en cache
    routeCache.set(cacheKey, rutaInfo);

    // Limitar tamaño del cache (evitar memory leaks)
    if (routeCache.size > 50) {
      const firstKey = routeCache.keys().next().value;
      if (firstKey) routeCache.delete(firstKey);
    }

    return rutaInfo;
  } catch {
    return null;
  }
}

/**
 * Calcula la distancia en línea recta entre dos puntos (Haversine).
 * Útil como fallback cuando OSRM no está disponible.
 */
export function distanciaLinealMetros(
  origen: Coordenadas,
  destino: Coordenadas
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((destino.lat - origen.lat) * Math.PI) / 180;
  const dLng = ((destino.lng - origen.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origen.lat * Math.PI) / 180) *
      Math.cos((destino.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determina si el repartidor está "cerca" del destino (umbral de llegada).
 * @param distanciaMetros - Distancia actual al destino
 * @param umbralMetros - Umbral en metros (default: 100m)
 */
export function estaCercaDelDestino(
  distanciaMetros: number,
  umbralMetros = 100
): boolean {
  return distanciaMetros <= umbralMetros;
}

/**
 * Limpia el cache de rutas.
 */
export function limpiarCacheRutas(): void {
  routeCache.clear();
}
