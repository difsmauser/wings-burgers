/**
 * Servicio de Geocoding — Estrategia Multi-nivel
 *
 * Nivel 1: Nominatim con dirección completa (viewbox Toluca)
 * Nivel 2: Nominatim sin viewbox estricto
 * Nivel 3: Nominatim con solo calle + Toluca (sin número/CP)
 * Nivel 4: Nominatim con solo colonia/CP + Toluca
 * Nivel 5: Coordenada aproximada del CP en Toluca (lookup local)
 *
 * Siempre retorna algo útil — aunque sea aproximado.
 */

// ============================================================================
// Types
// ============================================================================

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  coordenadas: Coordenadas;
  /** Nivel de precisión: 'exacto' | 'calle' | 'zona' | 'cp' | 'aproximado' */
  precision: 'exacto' | 'calle' | 'zona' | 'cp' | 'aproximado';
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  importance: number;
  type: string;
}

// ============================================================================
// Cache
// ============================================================================

const geocodeCache = new Map<string, GeocodingResult>();

// ============================================================================
// Constants
// ============================================================================

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'AlaBurguer-Delivery/1.0';

const TOLUCA_VIEWBOX = {
  west: -99.75,
  south: 19.20,
  east: -99.55,
  north: 19.35,
};

// Coordenadas por defecto del restaurante (Toluca centro)
export const COORDENADAS_RESTAURANTE: Coordenadas = {
  lat: 19.2826,
  lng: -99.6557,
};

/**
 * Lookup local de códigos postales comunes en la zona Toluca/Metepec.
 * Cuando Nominatim no puede resolver la calle, al menos ubicamos la zona por CP.
 */
const CP_COORDENADAS: Record<string, Coordenadas> = {
  '50000': { lat: 19.2826, lng: -99.6557 }, // Centro Toluca
  '50010': { lat: 19.2870, lng: -99.6490 },
  '50020': { lat: 19.2780, lng: -99.6600 },
  '50040': { lat: 19.2750, lng: -99.6530 },
  '50050': { lat: 19.2700, lng: -99.6480 },
  '50060': { lat: 19.2850, lng: -99.6700 },
  '50070': { lat: 19.2900, lng: -99.6450 },
  '50080': { lat: 19.2950, lng: -99.6600 },
  '50090': { lat: 19.2650, lng: -99.6550 },
  '50100': { lat: 19.2600, lng: -99.6600 },
  '50110': { lat: 19.2550, lng: -99.6500 },
  '50120': { lat: 19.2500, lng: -99.6700 },
  '50130': { lat: 19.2800, lng: -99.6800 },
  '50140': { lat: 19.2700, lng: -99.6750 },
  '50150': { lat: 19.2950, lng: -99.6750 },
  '50160': { lat: 19.3000, lng: -99.6500 },
  '50170': { lat: 19.3050, lng: -99.6600 },
  '50180': { lat: 19.2650, lng: -99.6400 },
  '50190': { lat: 19.2750, lng: -99.6350 },
  '50200': { lat: 19.2826, lng: -99.6557 }, // Toluca general
  '50209': { lat: 19.2830, lng: -99.6500 }, // CP específico del pedido de prueba
  '50210': { lat: 19.2850, lng: -99.6450 },
  '50220': { lat: 19.2900, lng: -99.6400 },
  '50230': { lat: 19.2950, lng: -99.6350 },
  '50240': { lat: 19.2700, lng: -99.6300 },
  '50250': { lat: 19.2600, lng: -99.6400 },
  '50260': { lat: 19.2550, lng: -99.6550 },
  '50270': { lat: 19.2500, lng: -99.6450 },
  '50280': { lat: 19.2450, lng: -99.6500 },
  '50290': { lat: 19.2830, lng: -99.6650 },
  '50300': { lat: 19.2750, lng: -99.6900 },
  '52140': { lat: 19.2550, lng: -99.6100 }, // Metepec
  '52148': { lat: 19.2500, lng: -99.6050 },
  '52150': { lat: 19.2600, lng: -99.6150 },
  '52160': { lat: 19.2450, lng: -99.6200 },
  '52170': { lat: 19.2400, lng: -99.6100 },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extrae el código postal de una dirección.
 */
function extraerCP(direccion: string): string | null {
  const cpMatch = direccion.match(/\b(5\d{4})\b/);
  return cpMatch ? cpMatch[1] : null;
}

/**
 * Extrae solo el nombre de la calle de una dirección (sin número, sin CP).
 */
function extraerCalle(direccion: string): string {
  let calle = direccion.trim();

  // Remover prefijo "Dirección:"
  calle = calle.replace(/^Direcci[oó]n:\s*/i, '');

  // Remover CP
  calle = calle.replace(/,?\s*CP\s*\d{5}/i, '');
  calle = calle.replace(/,?\s*C\.?P\.?\s*\d{5}/i, '');

  // Remover número de casa (#100, No. 45, etc.)
  calle = calle.replace(/\s*#\d+/g, '');
  calle = calle.replace(/\s*No\.?\s*\d+/gi, '');
  calle = calle.replace(/\s*Num\.?\s*\d+/gi, '');
  calle = calle.replace(/\s*número\s*\d+/gi, '');

  // Remover referencia entre paréntesis
  calle = calle.replace(/\([^)]*\)/g, '');

  // Limpiar espacios múltiples y comas finales
  calle = calle.replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();

  return calle;
}

/**
 * Busca en Nominatim con una query dada.
 */
async function buscarNominatim(
  query: string,
  bounded: boolean
): Promise<NominatimResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '3',
      addressdetails: '0',
      viewbox: `${TOLUCA_VIEWBOX.west},${TOLUCA_VIEWBOX.north},${TOLUCA_VIEWBOX.east},${TOLUCA_VIEWBOX.south}`,
      bounded: bounded ? '1' : '0',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

/**
 * Filtra resultados de Nominatim que estén dentro de la zona Toluca.
 */
function filtrarResultadosZona(results: NominatimResult[]): NominatimResult | null {
  for (const r of results) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    // Verificar que esté dentro de un radio razonable de Toluca
    if (
      lat >= TOLUCA_VIEWBOX.south - 0.1 &&
      lat <= TOLUCA_VIEWBOX.north + 0.1 &&
      lng >= TOLUCA_VIEWBOX.west - 0.1 &&
      lng <= TOLUCA_VIEWBOX.east + 0.1
    ) {
      return r;
    }
  }
  // Si ninguno está en zona, retornar el primero
  return results.length > 0 ? results[0] : null;
}

// ============================================================================
// Función principal
// ============================================================================

/**
 * Geocodifica una dirección con estrategia multi-nivel.
 * SIEMPRE retorna un resultado — al peor caso, las coordenadas aproximadas del CP o del restaurante.
 *
 * @param direccion - Dirección de texto
 * @returns GeocodingResult con coordenadas y nivel de precisión
 */
export async function geocodificarDireccion(
  direccion: string
): Promise<Coordenadas | null> {
  const result = await geocodificarDireccionConPrecision(direccion);
  return result ? result.coordenadas : null;
}

/**
 * Versión extendida que retorna también el nivel de precisión.
 */
export async function geocodificarDireccionConPrecision(
  direccion: string
): Promise<GeocodingResult | null> {
  if (!direccion || direccion === 'Sin dirección') return null;

  // Revisar cache
  const cacheKey = direccion.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Preparar variantes de la dirección
  const limpia = direccion
    .replace(/^Direcci[oó]n:\s*/i, '')
    .replace(/[#]/g, ' ')
    .trim();

  const conToluca = /toluca|metepec|zinacantepec|lerma|estado de m/i.test(limpia)
    ? limpia
    : `${limpia}, Toluca, Estado de México, México`;

  const calle = extraerCalle(limpia);
  const cp = extraerCP(direccion);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NIVEL 1: Dirección completa con viewbox estricto
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let results = await buscarNominatim(conToluca, true);
  let mejor = filtrarResultadosZona(results);

  if (mejor) {
    const result: GeocodingResult = {
      coordenadas: { lat: parseFloat(mejor.lat), lng: parseFloat(mejor.lon) },
      precision: 'exacto',
    };
    geocodeCache.set(cacheKey, result);
    return result;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NIVEL 2: Sin viewbox estricto
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  results = await buscarNominatim(conToluca, false);
  mejor = filtrarResultadosZona(results);

  if (mejor) {
    const result: GeocodingResult = {
      coordenadas: { lat: parseFloat(mejor.lat), lng: parseFloat(mejor.lon) },
      precision: 'calle',
    };
    geocodeCache.set(cacheKey, result);
    return result;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NIVEL 3: Solo nombre de calle + Toluca
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (calle && calle.length > 3) {
    const calleConToluca = `${calle}, Toluca, México`;
    results = await buscarNominatim(calleConToluca, false);
    mejor = filtrarResultadosZona(results);

    if (mejor) {
      const result: GeocodingResult = {
        coordenadas: { lat: parseFloat(mejor.lat), lng: parseFloat(mejor.lon) },
        precision: 'calle',
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NIVEL 4: Buscar por código postal
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (cp) {
    // Primero intentar en Nominatim
    results = await buscarNominatim(`${cp}, Toluca, México`, false);
    mejor = filtrarResultadosZona(results);

    if (mejor) {
      const result: GeocodingResult = {
        coordenadas: { lat: parseFloat(mejor.lat), lng: parseFloat(mejor.lon) },
        precision: 'cp',
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }

    // Lookup local de CPs
    if (CP_COORDENADAS[cp]) {
      const result: GeocodingResult = {
        coordenadas: CP_COORDENADAS[cp],
        precision: 'cp',
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NIVEL 5: Coordenada aproximada del centro de Toluca
  // Al menos el repartidor ve el mapa centrado en la zona correcta
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const result: GeocodingResult = {
    coordenadas: COORDENADAS_RESTAURANTE,
    precision: 'aproximado',
  };
  geocodeCache.set(cacheKey, result);
  return result;
}

/**
 * Limpia el cache de geocoding.
 */
export function limpiarCacheGeocode(): void {
  geocodeCache.clear();
}
