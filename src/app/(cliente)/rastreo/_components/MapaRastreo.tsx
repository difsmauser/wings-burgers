'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================================
// Types
// ============================================================================

interface UbicacionRepartidor {
  lat: number;
  lng: number;
  timestamp: number;
}

interface MapaRastreoProps {
  ubicacion: UbicacionRepartidor | null;
}

// ============================================================================
// Custom marker icon for delivery person
// ============================================================================

const deliveryIcon = L.divIcon({
  className: 'delivery-marker',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: #EA580C;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.4);
      border: 3px solid white;
    ">🛵</div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// ============================================================================
// Default center (Mexico City fallback)
// ============================================================================

const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 15;

// ============================================================================
// Component
// ============================================================================

/**
 * Leaflet + OpenStreetMap map component for delivery tracking (Req 12.3, 15.1).
 *
 * - Shows delivery person's marker on map
 * - Updates marker position smoothly when new GPS data arrives
 * - Keeps last known position visible when GPS is lost (Req 15.3)
 * - Uses dynamic import (no SSR) to avoid Leaflet window errors
 */
export default function MapaRastreo({ ubicacion }: MapaRastreoProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: ubicacion
        ? [ubicacion.lat, ubicacion.lng]
        : DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap tiles (free, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Add initial marker if we have location
    if (ubicacion) {
      const marker = L.marker([ubicacion.lat, ubicacion.lng], {
        icon: deliveryIcon,
      }).addTo(map);
      marker.bindPopup('🛵 Tu repartidor');
      markerRef.current = marker;
    }

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when ubicacion changes
  useEffect(() => {
    if (!mapRef.current || !ubicacion) return;

    const newLatLng: L.LatLngExpression = [ubicacion.lat, ubicacion.lng];

    if (markerRef.current) {
      // Smoothly move marker to new position
      markerRef.current.setLatLng(newLatLng);
    } else {
      // Create marker if it doesn't exist
      const marker = L.marker(newLatLng, {
        icon: deliveryIcon,
      }).addTo(mapRef.current);
      marker.bindPopup('🛵 Tu repartidor');
      markerRef.current = marker;
    }

    // Pan map to follow the delivery person
    mapRef.current.panTo(newLatLng, { animate: true, duration: 0.5 });
  }, [ubicacion]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-64 sm:h-80 lg:h-96"
      role="application"
      aria-label="Mapa de rastreo del repartidor"
    />
  );
}
