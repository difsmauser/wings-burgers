'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RutaInfo } from '../_lib/routing';

// ============================================================================
// Types
// ============================================================================

export interface EntregaConRuta {
  id: string;
  pedidoId: string;
  numeroPedido: string;
  clienteNombre: string;
  direccion: string;
  telefono: string;
  total?: number;
  metodoPago?: string | null;
  aceptadaEn?: string;
  /** Coordenadas del destino (geocodificadas) */
  destino: { lat: number; lng: number } | null;
  /** Info de ruta calculada por OSRM */
  ruta: RutaInfo | null;
}

interface MapaRepartidorProps {
  /** Posición GPS actual del repartidor */
  posicionActual: { lat: number; lng: number } | null;
  /** Entrega activa con ruta (solo la primera/principal) */
  entregaActiva: EntregaConRuta | null;
}

// ============================================================================
// Coordenadas Toluca (centro por defecto)
// ============================================================================

const TOLUCA_CENTER: [number, number] = [19.2826, -99.6557];
const DEFAULT_ZOOM = 15;
const ROUTE_ZOOM = 14;

// ============================================================================
// Custom CSS para marcadores (inyectado dinámicamente)
// ============================================================================

const CUSTOM_STYLES = `
  @keyframes pulse-blue {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.8); opacity: 0.4; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  
  .repartidor-premium-marker {
    position: relative;
  }
  
  .repartidor-premium-marker::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 48px;
    height: 48px;
    margin: -24px 0 0 -24px;
    background: rgba(59, 130, 246, 0.3);
    border-radius: 50%;
    animation: pulse-blue 2s ease-out infinite;
  }
  
  .repartidor-dot {
    width: 20px;
    height: 20px;
    background: #3B82F6;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5), 0 0 0 2px rgba(59, 130, 246, 0.2);
    position: relative;
    z-index: 10;
  }
  
  .destino-premium-marker {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .destino-pin {
    width: 36px;
    height: 36px;
    background: #EF4444;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .destino-pin-inner {
    width: 10px;
    height: 10px;
    background: white;
    border-radius: 50%;
    transform: rotate(45deg);
  }
  
  .leaflet-container {
    background: #1a1a2e !important;
  }
  
  .leaflet-control-zoom {
    border: none !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
  }
  
  .leaflet-control-zoom a {
    background: #1e1e2e !important;
    color: white !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    width: 36px !important;
    height: 36px !important;
    line-height: 36px !important;
    font-size: 18px !important;
  }
  
  .leaflet-control-zoom a:hover {
    background: #2e2e4e !important;
  }
  
  .leaflet-control-attribution {
    background: rgba(0,0,0,0.6) !important;
    color: rgba(255,255,255,0.5) !important;
    font-size: 9px !important;
    padding: 2px 6px !important;
  }
  
  .leaflet-control-attribution a {
    color: rgba(255,255,255,0.6) !important;
  }
`;

// ============================================================================
// Component
// ============================================================================

/**
 * Mapa premium para repartidor con:
 * - Posición actual como punto azul pulsante
 * - Pin rojo de destino
 * - Ruta trazada por carretera (OSRM) con gradiente
 * - Controles mínimos estilo dark mode
 * - Fullscreen optimizado para mobile
 */
export default function MapaRepartidor({
  posicionActual,
  entregaActiva,
}: MapaRepartidorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const repartidorMarkerRef = useRef<L.Marker | null>(null);
  const destinoMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const stylesInjectedRef = useRef(false);
  const hasInitialFitRef = useRef(false);

  // Inyectar estilos custom una sola vez
  useEffect(() => {
    if (stylesInjectedRef.current) return;
    const style = document.createElement('style');
    style.textContent = CUSTOM_STYLES;
    document.head.appendChild(style);
    stylesInjectedRef.current = true;
    return () => {
      document.head.removeChild(style);
      stylesInjectedRef.current = false;
    };
  }, []);

  // Crear iconos custom
  const createRepartidorIcon = useCallback(() => {
    return L.divIcon({
      className: 'repartidor-premium-marker',
      html: '<div class="repartidor-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }, []);

  const createDestinoIcon = useCallback(() => {
    return L.divIcon({
      className: 'destino-premium-marker',
      html: `<div class="destino-pin"><div class="destino-pin-inner"></div></div>`,
      iconSize: [36, 46],
      iconAnchor: [18, 46],
    });
  }, []);

  // ============================================================================
  // Inicializar mapa
  // ============================================================================

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center: [number, number] = posicionActual
      ? [posicionActual.lat, posicionActual.lng]
      : TOLUCA_CENTER;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      zoomControl: false, // Lo ponemos manual en la esquina derecha
      attributionControl: true,
    });

    // Tile layer con estilo oscuro (CartoDB Dark Matter)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(map);

    // Zoom control en esquina inferior derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      repartidorMarkerRef.current = null;
      destinoMarkerRef.current = null;
      routeLineRef.current = null;
      hasInitialFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // Actualizar posición del repartidor (punto azul pulsante)
  // ============================================================================

  useEffect(() => {
    if (!mapRef.current || !posicionActual) return;

    const latlng: L.LatLngExpression = [posicionActual.lat, posicionActual.lng];

    if (repartidorMarkerRef.current) {
      repartidorMarkerRef.current.setLatLng(latlng);
    } else {
      const marker = L.marker(latlng, {
        icon: createRepartidorIcon(),
        zIndexOffset: 1000,
      }).addTo(mapRef.current);
      repartidorMarkerRef.current = marker;
    }

    // Solo hacer panTo si no tenemos una ruta (evitar romper el fitBounds)
    if (!entregaActiva?.ruta && !hasInitialFitRef.current) {
      mapRef.current.panTo(latlng, { animate: true, duration: 0.5 });
    }
  }, [posicionActual, createRepartidorIcon, entregaActiva?.ruta]);

  // ============================================================================
  // Actualizar destino y ruta
  // ============================================================================

  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar marcador de destino anterior
    if (destinoMarkerRef.current) {
      destinoMarkerRef.current.remove();
      destinoMarkerRef.current = null;
    }

    // Limpiar ruta anterior
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Si no hay entrega activa con destino, no hacer nada
    if (!entregaActiva?.destino) {
      hasInitialFitRef.current = false;
      return;
    }

    const { destino, ruta, clienteNombre, direccion } = entregaActiva;

    // Colocar pin de destino
    const destinoMarker = L.marker([destino.lat, destino.lng], {
      icon: createDestinoIcon(),
      zIndexOffset: 900,
    })
      .addTo(mapRef.current)
      .bindPopup(
        `<div style="font-family:system-ui;padding:4px;">
          <strong style="color:#1a1a2e;">${clienteNombre}</strong><br/>
          <span style="color:#666;font-size:12px;">${direccion}</span>
        </div>`,
        { closeButton: false, className: 'destino-popup' }
      );
    destinoMarkerRef.current = destinoMarker;

    // Dibujar ruta por carretera si existe
    if (ruta && ruta.coordenadas.length > 0) {
      const routeLine = L.polyline(ruta.coordenadas, {
        color: '#3B82F6',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapRef.current);
      routeLineRef.current = routeLine;

      // Dibujar línea de borde para efecto 3D
      L.polyline(ruta.coordenadas, {
        color: '#1D4ED8',
        weight: 8,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapRef.current);
    }

    // Fit bounds para mostrar toda la ruta
    if (posicionActual && !hasInitialFitRef.current) {
      const bounds = L.latLngBounds([
        [posicionActual.lat, posicionActual.lng],
        [destino.lat, destino.lng],
      ]);
      mapRef.current.fitBounds(bounds, {
        padding: [80, 80],
        maxZoom: ROUTE_ZOOM,
        animate: true,
      });
      hasInitialFitRef.current = true;
    }
  }, [entregaActiva, posicionActual, createDestinoIcon]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full absolute inset-0"
      role="application"
      aria-label="Mapa de navegación del repartidor"
    />
  );
}
