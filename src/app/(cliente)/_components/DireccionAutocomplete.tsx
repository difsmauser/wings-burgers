'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Autocomplete de dirección premium usando Nominatim + Photon.
 * Restringido a Toluca / Zona Metropolitana del Valle de Toluca.
 * Muestra calle + número + colonia + CP.
 * Estilo enterprise similar a apps de delivery (Uber Eats, Rappi).
 */

interface Sugerencia {
  id: string;
  calle: string;
  numero: string;
  colonia: string;
  cp: string;
  ciudad: string;
  completa: string;
  lat: number;
  lon: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Bounding box Toluca metropolitana
const TOLUCA_BBOX = '-99.78,19.18,-99.50,19.42';

export default function DireccionAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const [showNumeroInput, setShowNumeroInput] = useState(false);
  const [numero, setNumero] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar direcciones con debounce
  const buscarDirecciones = useCallback(async (query: string) => {
    if (query.length < 4) {
      setSugerencias([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      // Usar Nominatim con búsqueda estructurada para México
      const params = new URLSearchParams({
        q: `${query}, Toluca, México`,
        format: 'json',
        addressdetails: '1',
        limit: '6',
        countrycodes: 'mx',
        viewbox: TOLUCA_BBOX,
        bounded: '1',
      });

      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': 'es', 'User-Agent': 'AlaBurguer/1.0' },
      });

      if (res.ok) {
        const data = await res.json();

        // Mapear y deduplicar por calle+colonia
        const seen = new Set<string>();
        const mapped: Sugerencia[] = [];

        for (let idx = 0; idx < data.length; idx++) {
          const item = data[idx];
          const addr = item.address as Record<string, string> | undefined;
          const calle = addr?.road || addr?.pedestrian || addr?.residential || '';
          const numeroAddr = addr?.house_number || '';
          const colonia = addr?.neighbourhood || addr?.suburb || addr?.village || '';
          const cp = addr?.postcode || '';
          const ciudad = addr?.city || addr?.town || addr?.municipality || 'Toluca';

          // Deduplicar por calle + colonia (ignorar duplicados con diferente CP)
          const dedupeKey = `${calle.toLowerCase()}-${colonia.toLowerCase()}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);

          // Extraer número del texto del usuario si la API no lo tiene
          const numUsuario = query.match(/\b(\d{1,5})\b/);
          const numFinal = numeroAddr || (numUsuario ? numUsuario[1] : '');

          // Construir dirección completa
          let completa = calle;
          if (numFinal) completa += ` #${numFinal}`;
          if (colonia) completa += `, ${colonia}`;
          if (cp) completa += `, CP ${cp}`;
          if (!calle) {
            const parts = (item.display_name as string || '').split(',').map((p: string) => p.trim());
            completa = parts.filter((p: string) => p !== 'México' && p !== 'Mexico').slice(0, 3).join(', ');
          }

          mapped.push({
            id: `${idx}-${item.place_id}`,
            calle,
            numero: numFinal,
            colonia,
            cp,
            ciudad,
            completa,
            lat: parseFloat(item.lat as string),
            lon: parseFloat(item.lon as string),
          });
        }

        setSugerencias(mapped.slice(0, 4));
        setShowDropdown(mapped.length > 0);
      }
    } catch {
      // Fallo silencioso — el usuario puede escribir manualmente
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setSelected(false);
    setShowNumeroInput(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      buscarDirecciones(val);
    }, 400);
  };

  // Seleccionar sugerencia
  const handleSelect = (sugerencia: Sugerencia) => {
    // Si no tiene número, preguntar al usuario
    if (!sugerencia.numero) {
      // Extraer número del texto que el usuario ya escribió
      const numMatch = value.match(/\b(\d{1,5})\b/);
      if (numMatch) {
        // El usuario ya escribió un número — usarlo
        const final = `${sugerencia.calle} #${numMatch[1]}, ${sugerencia.colonia}${sugerencia.cp ? `, CP ${sugerencia.cp}` : ''}`;
        onChange(final);
        setShowDropdown(false);
        setSelected(true);
      } else {
        // No hay número — mostrar input para que lo escriba
        onChange(sugerencia.completa);
        setShowDropdown(false);
        setShowNumeroInput(true);
        setSelected(true);
      }
    } else {
      onChange(sugerencia.completa);
      setShowDropdown(false);
      setSelected(true);
    }
    setSugerencias([]);
  };

  // Confirmar número exterior
  const handleConfirmNumero = () => {
    if (numero.trim()) {
      // Insertar número en la dirección
      const parts = value.split(',');
      const calleConNum = `${parts[0].trim()} #${numero.trim()}`;
      const rest = parts.slice(1).join(',');
      onChange(`${calleConNum}${rest ? `,${rest}` : ''}`);
    }
    setShowNumeroInput(false);
  };

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Input principal */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => { if (sugerencias.length > 0) setShowDropdown(true); }}
          placeholder={placeholder || 'Calle y número, ej: Hidalgo 108'}
          className={`w-full !pl-10 pr-10 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/30 transition-all ${className || ''}`}
          autoComplete="off"
          spellCheck={false}
          style={{ paddingLeft: '2.5rem' }}
        />
        {/* Loading / Check icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading && (
            <div className="w-4 h-4 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
          )}
          {selected && !loading && (
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Input número exterior — cuando la dirección no incluye número */}
      {showNumeroInput && (
        <div className="flex gap-2 animate-fade-in">
          <div className="relative flex-1">
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value.replace(/[^\d\w\-]/g, '').slice(0, 10))}
              placeholder="# Exterior"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-brand-400/20 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmNumero(); }}
            />
          </div>
          <button
            type="button"
            onClick={handleConfirmNumero}
            className="px-4 py-3 rounded-xl bg-brand-500/10 border border-brand-400/20 text-xs font-bold text-brand-400 hover:bg-brand-500/20 transition-all active:scale-95"
          >
            ✓
          </button>
        </div>
      )}

      {/* Dropdown de sugerencias — estilo premium */}
      {showDropdown && sugerencias.length > 0 && (
        <div className="absolute z-50 w-full top-full mt-2 rounded-2xl bg-[#16161f] border border-white/10 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] overflow-hidden animate-scale-in">
          <div className="py-1">
            {sugerencias.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-start gap-3">
                  {/* Pin icon */}
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-400/20 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-brand-500/20 transition-colors">
                    <svg className="w-3.5 h-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  {/* Address text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {s.calle}{s.numero ? ` #${s.numero}` : ''}{s.colonia ? `, ${s.colonia}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                      {[s.ciudad, s.cp ? `CP ${s.cp}` : ''].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {/* Arrow */}
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-brand-400 mt-1 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
          {/* Footer */}
          <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
            <p className="text-[8px] text-gray-600 text-center">📍 Servicio en Toluca y zona metropolitana</p>
          </div>
        </div>
      )}

      {/* Helper text */}
      {!selected && value.length > 0 && value.length < 4 && (
        <p className="text-[9px] text-gray-600 px-1">Escribe al menos 4 caracteres para buscar</p>
      )}
    </div>
  );
}
