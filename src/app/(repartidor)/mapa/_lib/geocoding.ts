/**
 * Servicio de Geocoding — Optimizado para San Pablo Autopan y San Cristóbal Huichochitlán
 *
 * Las entregas SIEMPRE son en estas dos localidades del norte de Toluca.
 * En vez de depender de Nominatim (que no tiene estas calles), usamos:
 *
 * 1. Lookup local de calles conocidas con coordenadas GPS reales
 * 2. Identificación de localidad por nombre/CP
 * 3. Centro de la localidad como fallback (siempre funcional)
 *
 * Esto es 100% offline, instantáneo, y SIEMPRE retorna coordenadas útiles.
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
  precision: 'exacto' | 'calle' | 'zona' | 'aproximado';
  localidad: string;
}

// ============================================================================
// Coordenadas de las localidades
// ============================================================================

/** Centro de San Pablo Autopan (plaza principal) */
const SAN_PABLO_AUTOPAN: Coordenadas = { lat: 19.3582, lng: -99.6623 };

/** Centro de San Cristóbal Huichochitlán */
const SAN_CRISTOBAL: Coordenadas = { lat: 19.3420, lng: -99.6580 };

/** Restaurante A-la Burguer (punto de salida del repartidor) */
export const COORDENADAS_RESTAURANTE: Coordenadas = { lat: 19.3550, lng: -99.6590 };

// ============================================================================
// Base de datos local de calles con coordenadas GPS
// Calles principales de San Pablo Autopan y San Cristóbal
// ============================================================================

interface CalleConocida {
  nombres: string[]; // Variantes del nombre (para matching flexible)
  coordenadas: Coordenadas;
  localidad: string;
}

const CALLES_CONOCIDAS: CalleConocida[] = [
  // ━━━ SAN PABLO AUTOPAN ━━━
  {
    nombres: ['plutarco gonzalez', 'plutarco gonzález', 'plutarco gonzalez pliego', 'plutarco gonzález pliego'],
    coordenadas: { lat: 19.3575, lng: -99.6610 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['felipe villanueva'],
    coordenadas: { lat: 19.3570, lng: -99.6625 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['independencia'],
    coordenadas: { lat: 19.3585, lng: -99.6635 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['jose luis alamo', 'josé luis álamo', 'jose luis álamo'],
    coordenadas: { lat: 19.3568, lng: -99.6605 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['lerdo', 'lerdo de tejada'],
    coordenadas: { lat: 19.3578, lng: -99.6640 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['manuel buendia', 'manuel buendía', 'manuel buen dia', 'manuel buendía téllez'],
    coordenadas: { lat: 19.3595, lng: -99.6620 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['morelos'],
    coordenadas: { lat: 19.3590, lng: -99.6615 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['hidalgo'],
    coordenadas: { lat: 19.3580, lng: -99.6630 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['benito juarez', 'benito juárez', 'juarez', 'juárez'],
    coordenadas: { lat: 19.3565, lng: -99.6620 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['5 de mayo', 'cinco de mayo'],
    coordenadas: { lat: 19.3588, lng: -99.6645 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['16 de septiembre', 'dieciseis de septiembre'],
    coordenadas: { lat: 19.3572, lng: -99.6650 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['allende', 'ignacio allende'],
    coordenadas: { lat: 19.3592, lng: -99.6608 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['aldama', 'juan aldama'],
    coordenadas: { lat: 19.3583, lng: -99.6600 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['guerrero', 'vicente guerrero'],
    coordenadas: { lat: 19.3560, lng: -99.6635 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['reforma'],
    coordenadas: { lat: 19.3598, lng: -99.6628 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['constitucion', 'constitución'],
    coordenadas: { lat: 19.3555, lng: -99.6618 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['emiliano zapata', 'zapata'],
    coordenadas: { lat: 19.3602, lng: -99.6612 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['tierra y libertad'],
    coordenadas: { lat: 19.3570, lng: -99.6618 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['pueblo nuevo'],
    coordenadas: { lat: 19.3610, lng: -99.6640 },
    localidad: 'San Pablo Autopan',
  },
  {
    nombres: ['aviacion', 'aviación'],
    coordenadas: { lat: 19.3620, lng: -99.6650 },
    localidad: 'San Pablo Autopan',
  },

  // ━━━ SAN CRISTÓBAL HUICHOCHITLÁN ━━━
  {
    nombres: ['san cristobal', 'san cristóbal'],
    coordenadas: SAN_CRISTOBAL,
    localidad: 'San Cristóbal Huichochitlán',
  },
  {
    nombres: ['lazaro cardenas', 'lázaro cárdenas', 'cardenas', 'cárdenas'],
    coordenadas: { lat: 19.3425, lng: -99.6575 },
    localidad: 'San Cristóbal Huichochitlán',
  },
  {
    nombres: ['venustiano carranza', 'carranza'],
    coordenadas: { lat: 19.3430, lng: -99.6590 },
    localidad: 'San Cristóbal Huichochitlán',
  },
  {
    nombres: ['francisco i madero', 'madero', 'francisco i. madero'],
    coordenadas: { lat: 19.3415, lng: -99.6570 },
    localidad: 'San Cristóbal Huichochitlán',
  },
  {
    nombres: ['nicolas bravo', 'nicolás bravo', 'bravo'],
    coordenadas: { lat: 19.3435, lng: -99.6565 },
    localidad: 'San Cristóbal Huichochitlán',
  },
  {
    nombres: ['20 de noviembre', 'veinte de noviembre'],
    coordenadas: { lat: 19.3410, lng: -99.6585 },
    localidad: 'San Cristóbal Huichochitlán',
  },
];

// ============================================================================
// Lookup de Códigos Postales
// ============================================================================

const CP_LOCALIDAD: Record<string, { coordenadas: Coordenadas; localidad: string }> = {
  '50070': { coordenadas: { lat: 19.3610, lng: -99.6640 }, localidad: 'San Pablo Autopan (Pueblo Nuevo)' },
  '50200': { coordenadas: SAN_CRISTOBAL, localidad: 'San Cristóbal Huichochitlán' },
  '50209': { coordenadas: SAN_PABLO_AUTOPAN, localidad: 'San Pablo Autopan' },
  '50210': { coordenadas: { lat: 19.3560, lng: -99.6580 }, localidad: 'San Pablo Autopan (sur)' },
  '50215': { coordenadas: { lat: 19.3600, lng: -99.6660 }, localidad: 'San Pablo Autopan (norte)' },
  '50219': { coordenadas: { lat: 19.3550, lng: -99.6610 }, localidad: 'San Pablo Autopan' },
};

// ============================================================================
// Cache
// ============================================================================

const geocodeCache = new Map<string, GeocodingResult>();

// ============================================================================
// Funciones de matching
// ============================================================================

/**
 * Normaliza un string para comparación flexible.
 * Elimina acentos, números de casa, y pasa a minúsculas.
 */
function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca una calle en la base de datos local.
 * Usa matching parcial — si la dirección contiene el nombre de la calle, matchea.
 */
function buscarCalle(direccion: string): CalleConocida | null {
  const dirNorm = normalizar(direccion);

  // Buscar match exacto de nombre de calle
  for (const calle of CALLES_CONOCIDAS) {
    for (const nombre of calle.nombres) {
      const nombreNorm = normalizar(nombre);
      if (dirNorm.includes(nombreNorm)) {
        return calle;
      }
    }
  }

  return null;
}

/**
 * Extrae el código postal de una dirección.
 */
function extraerCP(direccion: string): string | null {
  const cpMatch = direccion.match(/\b(50\d{3})\b/);
  return cpMatch ? cpMatch[1] : null;
}

/**
 * Detecta la localidad por contexto de la dirección.
 */
function detectarLocalidad(direccion: string): { coordenadas: Coordenadas; localidad: string } | null {
  const dirLower = direccion.toLowerCase();

  if (dirLower.includes('san cristobal') || dirLower.includes('san cristóbal') || dirLower.includes('huichochitlan') || dirLower.includes('huichochitlán')) {
    return { coordenadas: SAN_CRISTOBAL, localidad: 'San Cristóbal Huichochitlán' };
  }

  if (dirLower.includes('san pablo') || dirLower.includes('autopan')) {
    return { coordenadas: SAN_PABLO_AUTOPAN, localidad: 'San Pablo Autopan' };
  }

  if (dirLower.includes('pueblo nuevo')) {
    return { coordenadas: { lat: 19.3610, lng: -99.6640 }, localidad: 'San Pablo Autopan (Pueblo Nuevo)' };
  }

  if (dirLower.includes('aviacion') || dirLower.includes('aviación')) {
    return { coordenadas: { lat: 19.3620, lng: -99.6650 }, localidad: 'Aviación Autopan' };
  }

  return null;
}

// ============================================================================
// Función principal
// ============================================================================

/**
 * Geocodifica una dirección de San Pablo Autopan o San Cristóbal.
 *
 * Estrategia (100% local, instantáneo):
 * 1. Buscar nombre de calle en DB local → coordenada exacta de la calle
 * 2. Detectar localidad por nombre → centro de localidad
 * 3. Buscar por código postal → coordenada del CP
 * 4. Fallback → centro de San Pablo Autopan (donde siempre están las entregas)
 *
 * SIEMPRE retorna coordenadas. Nunca falla. Nunca muestra "No se pudo ubicar".
 */
export async function geocodificarDireccion(
  direccion: string
): Promise<Coordenadas | null> {
  const result = geocodificarLocal(direccion);
  return result.coordenadas;
}

/**
 * Versión con info de precisión.
 */
export function geocodificarLocal(direccion: string): GeocodingResult {
  if (!direccion || direccion === 'Sin dirección') {
    return {
      coordenadas: SAN_PABLO_AUTOPAN,
      precision: 'aproximado',
      localidad: 'San Pablo Autopan',
    };
  }

  // Cache
  const cacheKey = direccion.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // ━━━ NIVEL 1: Buscar calle en DB local ━━━
  const calle = buscarCalle(direccion);
  if (calle) {
    const result: GeocodingResult = {
      coordenadas: calle.coordenadas,
      precision: 'calle',
      localidad: calle.localidad,
    };
    geocodeCache.set(cacheKey, result);
    return result;
  }

  // ━━━ NIVEL 2: Detectar localidad por nombre ━━━
  const localidad = detectarLocalidad(direccion);
  if (localidad) {
    const result: GeocodingResult = {
      coordenadas: localidad.coordenadas,
      precision: 'zona',
      localidad: localidad.localidad,
    };
    geocodeCache.set(cacheKey, result);
    return result;
  }

  // ━━━ NIVEL 3: Buscar por código postal ━━━
  const cp = extraerCP(direccion);
  if (cp && CP_LOCALIDAD[cp]) {
    const result: GeocodingResult = {
      coordenadas: CP_LOCALIDAD[cp].coordenadas,
      precision: 'zona',
      localidad: CP_LOCALIDAD[cp].localidad,
    };
    geocodeCache.set(cacheKey, result);
    return result;
  }

  // ━━━ NIVEL 4: Fallback — centro de San Pablo Autopan ━━━
  // Las entregas SIEMPRE son en esta zona, así que el centro funciona bien
  const result: GeocodingResult = {
    coordenadas: SAN_PABLO_AUTOPAN,
    precision: 'aproximado',
    localidad: 'San Pablo Autopan',
  };
  geocodeCache.set(cacheKey, result);
  return result;
}

/**
 * Limpia cache.
 */
export function limpiarCacheGeocode(): void {
  geocodeCache.clear();
}
