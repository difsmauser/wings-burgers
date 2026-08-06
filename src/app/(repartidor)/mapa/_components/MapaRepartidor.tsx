'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================================
// Types
// ============================================================================

interface EntregaActiva {
  id: string;
  clienteNombre: string;
  direccion: string;
  lat?: number;
  lng?: number;
}

interface MapaRepartidorProps {
  /** Current GPS position of the delivery person */
  posicionActual: { lat: number; lng: number } | null;
  /** Active deliveries to show as destination markers */
  entregasActivas: EntregaActiva[];
}

// ============================================================================
// Custom marker icons
// ============================================================================

const repartidorIcon = L.divIcon({
  className: 'repartidor-marker',
  html: `
    <div style="
      width: 44px;
      height: 44px;
      background: #EA580C;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.4);
      border: 3px solid white;
    ">🛵</div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const destinoIcon = L.divIcon({
  className: 'destino-marker',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: #16A34A;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
      border: 3px solid white;
    ">📍</div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 15;

// ============================================================================
// Component
// ============================================================================

/**
 * Leaflet + OpenStreetMap map component for the repartidor's route view.
 *
 * - Shows repartidor's current GPS position as main marker
 * - Shows active delivery destinations as secondary markers
 * - Draws simple route lines from repartidor to each delivery destination
 * - Pans to follow repartidor position updates
 * - Uses dynamic import (no SSR) to avoid Leaflet window errors
 *
 * Requirements: 14.3 (GPS tracking visualization)
 */
export default function MapaRepartidor({
  posicionActual,
  entregasActivas,
}: MapaRepartidorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const repartidorMarkerRef = useRef<L.Marker | null>(null);
  const destinoMarkersRef = useRef<L.Marker[]>([]);
  const routeLinesRef = useRef<L.Polyline[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center: [number, number] = posicionActual
      ? [posicionActual.lat, posicionActual.lng]
      : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      repartidorMarkerRef.current = null;
      destinoMarkersRef.current = [];
      routeLinesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update repartidor marker position
  useEffect(() => {
    if (!mapRef.current || !posicionActual) return;

    const newLatLng: L.LatLngExpression = [posicionActual.lat, posicionActual.lng];

    if (repartidorMarkerRef.current) {
      repartidorMarkerRef.current.setLatLng(newLatLng);
    } else {
      const marker = L.marker(newLatLng, { icon: repartidorIcon })
        .addTo(mapRef.current)
        .bindPopup('Tu ubicacion actual');
      repartidorMarkerRef.current = marker;
    }

    mapRef.current.panTo(newLatLng, { animate: true, duration: 0.5 });
  }, [posicionActual]);

  // Update destination markers and route lines
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing destination markers
    destinoMarkersRef.current.forEach((m) => m.remove());
    destinoMarkersRef.current = [];

    // Clear existing route lines
    routeLinesRef.current.forEach((l) => l.remove());
    routeLinesRef.current = [];

    // Add destination markers for active deliveries with coordinates
    entregasActivas.forEach((entrega) => {
      if (entrega.lat && entrega.lng && mapRef.current) {
        const marker = L.marker([entrega.lat, entrega.lng], {
          icon: destinoIcon,
        })
          .addTo(mapRef.current)
          .bindPopup(
            `<strong>${entrega.clienteNombre}</strong><br/>${entrega.direccion}`
          );
        destinoMarkersRef.current.push(marker);

        // Draw route line from repartidor to destination
        if (posicionActual && mapRef.current) {
          const line = L.polyline(
            [
              [posicionActual.lat, posicionActual.lng],
              [entrega.lat, entrega.lng],
            ],
            {
              color: '#EA580C',
              weight: 3,
              opacity: 0.7,
              dashArray: '8, 8',
            }
          ).addTo(mapRef.current);
          routeLinesRef.current.push(line);
        }
      }
    });

    // Fit bounds to show all markers if we have both repartidor and destinations
    if (posicionActual && destinoMarkersRef.current.length > 0 && mapRef.current) {
      const allPoints: L.LatLngExpression[] = [
        [posicionActual.lat, posicionActual.lng],
        ...entregasActivas
          .filter((e) => e.lat && e.lng)
          .map((e) => [e.lat!, e.lng!] as L.LatLngExpression),
      ];
      if (allPoints.length > 1) {
        const bounds = L.latLngBounds(allPoints);
        mapRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [entregasActivas, posicionActual]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[300px]"
      role="application"
      aria-label="Mapa de ruta del repartidor"
    />
  );
}
