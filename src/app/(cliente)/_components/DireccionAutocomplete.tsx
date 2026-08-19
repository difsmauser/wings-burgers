'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Autocomplete de dirección usando Nominatim (OpenStreetMap).
 * Restringido a Toluca, Estado de México.
 * Gratuito, sin API key, sin límite práctico para uso normal.
 */

interface Sugerencia {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Bounding box de Toluca, Estado de México (approx)
// lon_min, lat_min, lon_max, lat_max
const TOLUCA_VIEWBOX = '-99.75,19.20,-99.55,19.40';

export default function DireccionAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const buscarDirecciones = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSugerencias([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'mx',
        viewbox: TOLUCA_VIEWBOX,
        bounded: '1',
      });

      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'es' },
      });

      if (res.ok) {
        const data: Sugerencia[] = await res.json();
        setSugerencias(data);
        setShowDropdown(data.length > 0);
      }
    } catch {
      // Silent fail — user can still type manually
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      buscarDirecciones(val);
    }, 350);
  };

  // Select a suggestion
  const handleSelect = (sugerencia: Sugerencia) => {
    // For Mexican addresses, display_name is the most complete source.
    // Take the first 4-5 segments which typically contain:
    // street, neighbourhood/suburb, municipality, state, CP
    const displayParts = sugerencia.display_name.split(',').map(p => p.trim());
    // Remove country ("México") and state duplicate if present
    const useful = displayParts.filter(p => p !== 'México' && p !== 'Mexico').slice(0, 4);

    // Try to include user's typed number if not already in the address
    const numMatch = value.match(/\b(\d{1,5})\b/);
    let finalAddress = useful.join(', ');
    if (numMatch && !finalAddress.includes(numMatch[1])) {
      // Insert number after the first part (street name)
      finalAddress = `${useful[0]} #${numMatch[1]}, ${useful.slice(1).join(', ')}`;
    }

    // Add CP if available and not already present
    const addr = sugerencia.address;
    if (addr?.postcode && !finalAddress.includes(addr.postcode)) {
      finalAddress += `, CP ${addr.postcode}`;
    }

    onChange(finalAddress);
    setShowDropdown(false);
    setSugerencias([]);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => { setInputFocused(true); if (sugerencias.length > 0) setShowDropdown(true); }}
          onBlur={() => setInputFocused(false)}
          placeholder={placeholder || 'Calle, número, colonia...'}
          className={className || 'w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/30 transition-all'}
          autoComplete="off"
        />
        {/* Loading indicator */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
          </div>
        )}
        {/* Location icon */}
        {!loading && value.length === 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && sugerencias.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-xl bg-[#1a1a24] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
          {sugerencias.map((s, i) => {
            // Use display_name segments for Mexican addresses (structured address is often incomplete)
            const displayParts = s.display_name.split(',').map(p => p.trim());
            // Main text: first 2-3 meaningful parts (street + area)
            const mainText = displayParts.slice(0, 2).join(', ');
            // Secondary: remaining useful parts (city, state, CP)
            const addr = s.address;
            const secondaryParts = [];
            if (addr?.neighbourhood || addr?.suburb) secondaryParts.push(addr.neighbourhood || addr.suburb);
            else if (displayParts[2]) secondaryParts.push(displayParts[2]);
            if (addr?.postcode) secondaryParts.push(`CP ${addr.postcode}`);
            else if (displayParts.length > 3) secondaryParts.push(displayParts[3]);
            const secondaryText = secondaryParts.join(', ');

            return (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <div className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{mainText}</p>
                    {secondaryText && <p className="text-[10px] text-gray-500 truncate">{secondaryText}</p>}
                  </div>
                </div>
              </button>
            );
          })}
          <div className="px-4 py-2 bg-white/[0.02]">
            <p className="text-[8px] text-gray-600 text-center">Resultados para Toluca, Edo. de México · OpenStreetMap</p>
          </div>
        </div>
      )}
    </div>
  );
}
