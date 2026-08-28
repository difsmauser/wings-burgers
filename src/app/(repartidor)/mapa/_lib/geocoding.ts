/**
 * Geocoding para entregas — Radio 15km desde el restaurante
 *
 * Restaurante: Felipe Villanueva 280, San Pablo Autopan, CP 50290
 * Coordenadas: 19.3570, -99.6625
 *
 * Estrategia:
 * 1. Lookup local de calles conocidas (instantáneo, confiable)
 * 2. Nominatim con viewbox de 15km (para calles que no están en el lookup)
 * 3. Fallback por CP / localidad (siempre retorna algo)
 *
 * Radio máximo de entrega: ~15-20km
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
  precision: 'calle' | 'zona' | 'aproximado';
  localidad: string;
}

// ============================================================================
// Coordenadas del restaurante (Felipe Villanueva 280, San Pablo Autopan)
// ============================================================================

export const COORDENADAS_RESTAURANTE: Coordenadas = { lat: 19.3570, lng: -99.6625 };

/**
 * Viewbox de 15km alrededor del restaurante para Nominatim.
 * ~0.135° ≈ 15km en esta latitud
 */
const RADIO_KM = 15;
const DELTA_GRADOS = RADIO_KM / 111; // 1° ≈ 111km

const VIEWBOX = {
  west: COORDENADAS_RESTAURANTE.lng - DELTA_GRADOS,
  east: COORDENADAS_RESTAURANTE.lng + DELTA_GRADOS,
  south: COORDENADAS_RESTAURANTE.lat - DELTA_GRADOS,
  north: COORDENADAS_RESTAURANTE.lat + DELTA_GRADOS,
};

// ============================================================================
// DB local de calles conocidas en la zona de entrega
// ============================================================================

interface CalleInfo {
  nombres: string[];
  coords: Coordenadas;
  zona: string;
}

const CALLES: CalleInfo[] = [
  // ━━━ SAN PABLO AUTOPAN ━━━
  { nombres: ['felipe villanueva'], coords: { lat: 19.3570, lng: -99.6625 }, zona: 'San Pablo Autopan' },
  { nombres: ['plutarco gonzalez', 'plutarco gonzález', 'plutarco gonzalez pliego', 'plutarco gonzález pliego'], coords: { lat: 19.3575, lng: -99.6610 }, zona: 'San Pablo Autopan' },
  { nombres: ['independencia'], coords: { lat: 19.3585, lng: -99.6635 }, zona: 'San Pablo Autopan' },
  { nombres: ['jose luis alamo', 'josé luis álamo', 'jose luis álamo'], coords: { lat: 19.3568, lng: -99.6605 }, zona: 'San Pablo Autopan' },
  { nombres: ['lerdo', 'lerdo de tejada'], coords: { lat: 19.3578, lng: -99.6640 }, zona: 'San Pablo Autopan' },
  { nombres: ['manuel buendia', 'manuel buendía', 'manuel buendía téllez'], coords: { lat: 19.3595, lng: -99.6620 }, zona: 'San Pablo Autopan' },
  { nombres: ['morelos'], coords: { lat: 19.3590, lng: -99.6615 }, zona: 'San Pablo Autopan' },
  { nombres: ['hidalgo', 'miguel hidalgo'], coords: { lat: 19.3580, lng: -99.6630 }, zona: 'San Pablo Autopan' },
  { nombres: ['benito juarez', 'benito juárez', 'juarez', 'juárez'], coords: { lat: 19.3565, lng: -99.6620 }, zona: 'San Pablo Autopan' },
  { nombres: ['5 de mayo', 'cinco de mayo'], coords: { lat: 19.3588, lng: -99.6645 }, zona: 'San Pablo Autopan' },
  { nombres: ['16 de septiembre'], coords: { lat: 19.3572, lng: -99.6650 }, zona: 'San Pablo Autopan' },
  { nombres: ['allende', 'ignacio allende'], coords: { lat: 19.3592, lng: -99.6608 }, zona: 'San Pablo Autopan' },
  { nombres: ['aldama', 'juan aldama'], coords: { lat: 19.3583, lng: -99.6600 }, zona: 'San Pablo Autopan' },
  { nombres: ['guerrero', 'vicente guerrero'], coords: { lat: 19.3560, lng: -99.6635 }, zona: 'San Pablo Autopan' },
  { nombres: ['reforma'], coords: { lat: 19.3598, lng: -99.6628 }, zona: 'San Pablo Autopan' },
  { nombres: ['constitucion', 'constitución'], coords: { lat: 19.3555, lng: -99.6618 }, zona: 'San Pablo Autopan' },
  { nombres: ['emiliano zapata', 'zapata'], coords: { lat: 19.3602, lng: -99.6612 }, zona: 'San Pablo Autopan' },
  { nombres: ['tierra y libertad'], coords: { lat: 19.3570, lng: -99.6618 }, zona: 'San Pablo Autopan' },
  { nombres: ['pueblo nuevo'], coords: { lat: 19.3610, lng: -99.6640 }, zona: 'San Pablo Autopan' },
  { nombres: ['aviacion', 'aviación'], coords: { lat: 19.3620, lng: -99.6650 }, zona: 'Aviación Autopan' },
  { nombres: ['ignacio lopez rayon', 'ignacio lópez rayón', 'lopez rayon', 'lópez rayón'], coords: { lat: 19.3562, lng: -99.6615 }, zona: 'San Pablo Autopan' },
  { nombres: ['eduardo gonzalez', 'eduardo gonzález', 'eduardo gonzalez y pichardo'], coords: { lat: 19.3558, lng: -99.6630 }, zona: 'San Pablo Autopan' },
  { nombres: ['de jesus', 'de jesús'], coords: { lat: 19.3545, lng: -99.6620 }, zona: 'De Jesús 1a Secc' },

  // ━━━ SAN CRISTÓBAL HUICHOCHITLÁN ━━━
  { nombres: ['lazaro cardenas', 'lázaro cárdenas', 'cardenas', 'cárdenas'], coords: { lat: 19.3425, lng: -99.6575 }, zona: 'San Cristóbal Huichochitlán' },
  { nombres: ['venustiano carranza', 'carranza'], coords: { lat: 19.3430, lng: -99.6590 }, zona: 'San Cristóbal Huichochitlán' },
  { nombres: ['francisco i madero', 'madero', 'francisco i. madero'], coords: { lat: 19.3415, lng: -99.6570 }, zona: 'San Cristóbal Huichochitlán' },
  { nombres: ['nicolas bravo', 'nicolás bravo', 'bravo'], coords: { lat: 19.3435, lng: -99.6565 }, zona: 'San Cristóbal Huichochitlán' },
  { nombres: ['20 de noviembre', 'veinte de noviembre'], coords: { lat: 19.3410, lng: -99.6585 }, zona: 'San Cristóbal Huichochitlán' },
];

// Localidades conocidas
const LOCALIDADES: Record<string, Coordenadas> = {
  'san pablo autopan': { lat: 19.3582, lng: -99.6623 },
  'san cristobal': { lat: 19.3420, lng: -99.6580 },
  'san cristóbal': { lat: 19.3420, lng: -99.6580 },
  'huichochitlan': { lat: 19.3420, lng: -99.6580 },
  'huichochitlán': { lat: 19.3420, lng: -99.6580 },
  'pueblo nuevo': { lat: 19.3610, lng: -99.6640 },
  'aviacion autopan': { lat: 19.3620, lng: -99.6650 },
  'aviación autopan': { lat: 19.3620, lng: -99.6650 },
  'de jesus': { lat: 19.3545, lng: -99.6620 },
  'de jesús': { lat: 19.3545, lng: -99.6620 },
  'ojo de agua': { lat: 19.3650, lng: -99.6670 },
};

// Códigos postales
const CPS: Record<string, { coords: Coordenadas; zona: string }> = {
  '50070': { coords: { lat: 19.3610, lng: -99.6640 }, zona: 'Pueblo Nuevo' },
  '50200': { coords: { lat: 19.3420, lng: -99.6580 }, zona: 'San Cristóbal Huichochitlán' },
  '50209': { coords: { lat: 19.3575, lng: -99.6610 }, zona: 'San Pablo Autopan' },
  '50210': { coords: { lat: 19.3560, lng: -99.6580 }, zona: 'San Pablo Autopan (sur)' },
  '50215': { coords: { lat: 19.3600, lng: -99.6660 }, zona: 'San Pablo Autopan (norte)' },
  '50219': { coords: { lat: 19.3550, lng: -99.6610 }, zona: 'San Pablo Autopan' },
  '50290': { coords: COORDENADAS_RESTAURANTE, zona: 'De Jesús 1a Secc / San Pablo' },
};

// ============================================================================
// Cache
// ============================================================================

const cache = new Map<string, GeocodingResult>();

// ============================================================================
// Helpers
// ============================================================================

function normalizar(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[#.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extraerCP(dir: string): string | null {
  const m = dir.match(/\b(50\d{3})\b/);
  return m ? m[1] : null;
}

/**
 * Busca en la DB local de calles.
 */
function buscarCalleLocal(direccion: string): CalleInfo | null {
  const norm = normalizar(direccion);
  for (const calle of CALLES) {
    for (const nombre of calle.nombres) {
      if (norm.includes(normalizar(nombre))) {
        return calle;
      }
    }
  }
  return null;
}

/**
 * Detecta localidad por nombre en la dirección.
 */
function detectarLocalidad(direccion: string): { coords: Coordenadas; zona: string } | null {
  const norm = normalizar(direccion);
  for (const [key, coords] of Object.entries(LOCALIDADES)) {
    if (norm.includes(normalizar(key))) {
      return { coords, zona: key };
    }
  }
  return null;
}

/**
 * Busca en Nominatim con viewbox de 15km.
 */
async function buscarNominatim(query: string): Promise<Coordenadas | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      viewbox: `${VIEWBOX.west},${VIEWBOX.north},${VIEWBOX.east},${VIEWBOX.south}`,
      bounded: '0',
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': 'AlaBurguer-Delivery/1.0',
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) return null;
    const data = await res.json();

    if (data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      // Verificar que esté dentro del radio de 20km del restaurante
      const distKm = haversineKm(COORDENADAS_RESTAURANTE, { lat, lng });
      if (distKm <= 20) {
        return { lat, lng };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Distancia Haversine en km.
 */
function haversineKm(a: Coordenadas, b: Coordenadas): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ============================================================================
// Función principal
// ============================================================================

/**
 * Geocodifica una dirección en un radio de 15km del restaurante.
 *
 * 1. DB local de calles → instantáneo
 * 2. Nominatim con viewbox 15km → si la calle no está en local
 * 3. CP / localidad → zona aproximada
 * 4. Centro del restaurante → siempre funciona
 *
 * NUNCA retorna null. Siempre hay un punto en el mapa.
 */
export async function geocodificarDireccion(direccion: string): Promise<Coordenadas> {
  const result = await geocodificarCompleto(direccion);
  return result.coordenadas;
}

export async function geocodificarCompleto(direccion: string): Promise<GeocodingResult> {
  if (!direccion || direccion === 'Sin dirección') {
    return { coordenadas: COORDENADAS_RESTAURANTE, precision: 'aproximado', localidad: 'Restaurante' };
  }

  const cacheKey = normalizar(direccion);
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  // ━━━ 1. Lookup local de calles ━━━
  const calle = buscarCalleLocal(direccion);
  if (calle) {
    const r: GeocodingResult = { coordenadas: calle.coords, precision: 'calle', localidad: calle.zona };
    cache.set(cacheKey, r);
    return r;
  }

  // ━━━ 2. Nominatim (15km viewbox) ━━━
  const queryNom = direccion
    .replace(/^Direcci[oó]n:\s*/i, '')
    .replace(/#/g, ' ')
    .trim();

  // Agregar contexto geográfico si no lo tiene
  const tieneCtx = /autopan|cristobal|cristóbal|toluca|metepec|estado de m/i.test(queryNom);
  const queryFull = tieneCtx ? queryNom : `${queryNom}, San Pablo Autopan, Toluca, México`;

  const nominatimResult = await buscarNominatim(queryFull);
  if (nominatimResult) {
    const r: GeocodingResult = { coordenadas: nominatimResult, precision: 'calle', localidad: 'Nominatim' };
    cache.set(cacheKey, r);
    return r;
  }

  // Intento 2 con Nominatim: solo el nombre sin número
  const sinNumero = queryNom
    .replace(/\b\d{1,4}\b/g, '')
    .replace(/CP\s*\d{5}/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (sinNumero.length > 5) {
    const nom2 = await buscarNominatim(`${sinNumero}, Toluca, México`);
    if (nom2) {
      const r: GeocodingResult = { coordenadas: nom2, precision: 'zona', localidad: 'Nominatim (zona)' };
      cache.set(cacheKey, r);
      return r;
    }
  }

  // ━━━ 3. Detectar localidad por nombre ━━━
  const loc = detectarLocalidad(direccion);
  if (loc) {
    const r: GeocodingResult = { coordenadas: loc.coords, precision: 'zona', localidad: loc.zona };
    cache.set(cacheKey, r);
    return r;
  }

  // ━━━ 4. Buscar por CP ━━━
  const cp = extraerCP(direccion);
  if (cp && CPS[cp]) {
    const r: GeocodingResult = { coordenadas: CPS[cp].coords, precision: 'zona', localidad: CPS[cp].zona };
    cache.set(cacheKey, r);
    return r;
  }

  // ━━━ 5. Fallback: centro del restaurante ━━━
  const r: GeocodingResult = { coordenadas: COORDENADAS_RESTAURANTE, precision: 'aproximado', localidad: 'San Pablo Autopan' };
  cache.set(cacheKey, r);
  return r;
}

export function limpiarCacheGeocode(): void {
  cache.clear();
}
