/**
 * Servicio de Geocoding con Nominatim (OpenStreetMap)
 * Convierte direcciones de texto a coordenadas geográficas.
 *
 * API: https://nominatim.openstreetmap.org/search
 * Límite: 1 request/segundo (política de uso justo)
 */

// ============================================================================
// Types
// ============================================================================

export interface Coordenadas {
  lat: number;
  lng: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
}

// ============================================================================
// Cache en memoria para evitar requests repetidos
// ============================================================================

const geocodeCache = new Map<string, Coordenadas>();

// ============================================================================
// Constants
// ============================================================================

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'AlaBurguer-Delivery/1.0';

// Coordenadas base de Toluca para limitar búsqueda
const TOLUCA_VIEWBOX = {
  west: -99.75,
  south: 19.20,
  east: -99.55,
  north: 19.35,
};

// Coordenadas por defecto del restaurante (Toluca)
export const COORDENADAS_RESTAURANTE: Coordenadas = {
  lat: 19.2826,
  lng: -99.6557,
};

// ============================================================================
// Funciones
// ============================================================================

/**
 * Limpia y normaliza la dirección para mejorar resultados de geocoding.
 * Elimina prefijos comunes, códigos postales redundantes, y normaliza formato.
 */
function normalizarDireccion(direccion: string): string {
  let limpia = direccion.trim();

  // Remover prefijo "Dirección:" si existe
  limpia = limpia.replace(/^Direcci[oó]n:\s*/i, '');

  // Remover caracteres especiales que confunden al geocoder
  limpia = limpia.replace(/[#]/g, ' ');

  // Agregar ", Toluca, Mexico" si no tiene referencia geográfica
  const tieneReferencia =
    /toluca|metepec|zinacantepec|lerma|m[eé]xico|estado de m/i.test(limpia);
  if (!tieneReferencia) {
    limpia += ', Toluca, Estado de México, México';
  }

  return limpia;
}

/**
 * Geocodifica una dirección a coordenadas usando Nominatim.
 * Incluye cache, viewbox (Toluca), y fallback inteligente.
 *
 * @param direccion - Dirección de texto a geocodificar
 * @returns Coordenadas o null si no se puede resolver
 */
export async function geocodificarDireccion(
  direccion: string
): Promise<Coordenadas | null> {
  if (!direccion || direccion === 'Sin dirección') return null;

  // Revisar cache primero
  const cacheKey = direccion.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  const direccionNormalizada = normalizarDireccion(direccion);

  try {
    // Intento 1: Búsqueda con viewbox restringido a Toluca
    const params = new URLSearchParams({
      q: direccionNormalizada,
      format: 'json',
      limit: '1',
      addressdetails: '0',
      viewbox: `${TOLUCA_VIEWBOX.west},${TOLUCA_VIEWBOX.north},${TOLUCA_VIEWBOX.east},${TOLUCA_VIEWBOX.south}`,
      bounded: '1',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;

    let results: NominatimResult[] = await response.json();

    // Intento 2: Si no hay resultados, buscar sin viewbox restringido
    if (results.length === 0) {
      const paramsSinBound = new URLSearchParams({
        q: direccionNormalizada,
        format: 'json',
        limit: '1',
        addressdetails: '0',
        viewbox: `${TOLUCA_VIEWBOX.west},${TOLUCA_VIEWBOX.north},${TOLUCA_VIEWBOX.east},${TOLUCA_VIEWBOX.south}`,
        bounded: '0',
      });

      const response2 = await fetch(
        `${NOMINATIM_BASE_URL}?${paramsSinBound.toString()}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
          },
        }
      );

      if (response2.ok) {
        results = await response2.json();
      }
    }

    if (results.length > 0) {
      const coordenadas: Coordenadas = {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };

      // Guardar en cache
      geocodeCache.set(cacheKey, coordenadas);
      return coordenadas;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Limpia el cache de geocoding (útil para testing o para liberar memoria).
 */
export function limpiarCacheGeocode(): void {
  geocodeCache.clear();
}
