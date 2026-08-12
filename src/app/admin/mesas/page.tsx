'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Mesa {
  id: string;
  nombre: string;
  zona: string;
  capacidad: number;
  pos_x: number;
  pos_y: number;
  estado: string;
  activa: boolean;
}

const ESTADO_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  disponible: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400' },
  ocupada: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
  pendiente_cobro: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400' },
  reservada: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400' },
};

const ZONAS = ['Interior', 'Terraza', 'Barra', 'Exterior'];

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [qrMesa, setQrMesa] = useState<Mesa | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editZona, setEditZona] = useState('');
  const [editCapacidad, setEditCapacidad] = useState('');

  // Drag state
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Form (for create modal)
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('Interior');
  const [capacidad, setCapacidad] = useState('4');

  const fetchMesas = useCallback(async () => {
    try {
      const res = await fetch('/api/mesas');
      if (res.ok) {
        const data = await res.json();
        setMesas(data?.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMesas();
  }, [fetchMesas]);

  const resetForm = () => {
    setNombre('');
    setZona('Interior');
    setCapacidad('4');
    setSelectedMesa(null);
    setError(null);
  };

  const handleCrear = async () => {
    if (!nombre.trim()) {
      setError('Nombre requerido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/mesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          zona,
          capacidad: parseInt(capacidad) || 4,
          pos_x: Math.random() * 80,
          pos_y: Math.random() * 80,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error?.message || 'Error');
      }
      setShowModal(false);
      resetForm();
      fetchMesas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/mesas?id=${id}`, { method: 'DELETE' });
    fetchMesas();
  };

  // Edit modal helpers
  const openEditModal = (mesa: Mesa) => {
    setSelectedMesa(mesa);
    setEditNombre(mesa.nombre);
    setEditZona(mesa.zona);
    setEditCapacidad(String(mesa.capacidad));
  };

  const handleGuardarMesa = async () => {
    if (!selectedMesa) return;
    setSaving(true);
    await fetch('/api/mesas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedMesa.id,
        nombre: editNombre,
        zona: editZona,
        capacidad: parseInt(editCapacidad) || 4,
      }),
    });
    setSaving(false);
    setSelectedMesa(null);
    fetchMesas();
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, mesa: Mesa) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ id: mesa.id, startX: e.clientX, startY: e.clientY });
    setDragPos({ x: mesa.pos_x, y: mesa.pos_y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDragPos({ x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) });
  };

  const handleMouseUp = async () => {
    if (!dragging || !dragPos) { setDragging(null); setDragPos(null); return; }
    await fetch('/api/mesas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dragging.id, pos_x: dragPos.x, pos_y: dragPos.y }),
    });
    setDragging(null);
    setDragPos(null);
    fetchMesas();
  };

  // Stats
  const disponibles = mesas.filter((m) => m.estado === 'disponible').length;
  const ocupadas = mesas.filter((m) => m.estado === 'ocupada').length;
  const pendientes = mesas.filter((m) => m.estado === 'pendiente_cobro').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mesas</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión y mapa del local</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2.5 rounded-lg text-sm font-medium text-black gradient-brand shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all duration-200"
        >
          + Nueva Mesa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-xs text-gray-500">Total Mesas</p>
          <p className="text-2xl font-bold text-white mt-1">{mesas.length}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-xs text-gray-500">Disponibles</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{disponibles}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-xs text-gray-500">Ocupadas</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{ocupadas}</p>
        </div>
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <p className="text-xs text-gray-500">Pendientes Cobro</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{pendientes}</p>
        </div>
      </div>

      {/* Visual Map */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Mapa del Local
          </h2>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400"></span> Disponible
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400"></span> Ocupada
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Pendiente Cobro
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span> Reservada
            </span>
          </div>
        </div>

        {/* Map grid with drag support */}
        <div
          ref={mapRef}
          className={`relative w-full h-[400px] bg-[#0d0d14] rounded-xl border border-white/5 overflow-hidden ${dragging ? 'cursor-grabbing' : ''}`}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '10% 10%',
            }}
          />

          {/* Zone labels */}
          <div className="absolute top-2 left-3 text-[10px] text-gray-600 uppercase tracking-wider">
            Interior
          </div>
          <div className="absolute top-2 right-3 text-[10px] text-gray-600 uppercase tracking-wider">
            Terraza
          </div>
          <div className="absolute bottom-2 left-3 text-[10px] text-gray-600 uppercase tracking-wider">
            Barra
          </div>

          {/* Mesas positioned with drag */}
          {mesas.map((mesa) => {
            const colors = ESTADO_COLORS[mesa.estado] || ESTADO_COLORS.disponible;
            const isDragging = dragging?.id === mesa.id;
            const posX = isDragging && dragPos ? dragPos.x : mesa.pos_x;
            const posY = isDragging && dragPos ? dragPos.y : mesa.pos_y;
            return (
              <div
                key={mesa.id}
                className={`absolute w-16 h-16 rounded-xl ${colors.bg} border ${colors.border} flex flex-col items-center justify-center cursor-grab transition-all duration-200 shadow-lg select-none ${isDragging ? 'cursor-grabbing scale-110 z-20 ring-2 ring-brand-400' : ''}`}
                style={{ left: `${posX}%`, top: `${posY}%`, transform: 'translate(-50%, -50%)', transition: isDragging ? 'none' : undefined }}
                onMouseDown={(e) => handleMouseDown(e, mesa)}
                onClick={(e) => { if (!dragging) { e.stopPropagation(); openEditModal(mesa); } }}
                title={`${mesa.nombre} - Arrastra para mover`}
              >
                <span className={`text-xs font-bold ${colors.text}`}>
                  {mesa.nombre.replace('Mesa ', 'M').replace('Terraza ', 'T').replace('Barra ', 'B')}
                </span>
                <span className="text-[8px] text-gray-500">{mesa.capacidad}p</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table list */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Mesa
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Zona
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Capacidad
              </th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {mesas.map((mesa) => {
              const colors = ESTADO_COLORS[mesa.estado] || ESTADO_COLORS.disponible;
              return (
                <tr key={mesa.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-white">{mesa.nombre}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">{mesa.zona}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">{mesa.capacidad} personas</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors.bg} ${colors.text} ${colors.border} capitalize`}
                    >
                      {mesa.estado.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setQrMesa(mesa)} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">QR</button>
                      <button
                        onClick={() => handleDelete(mesa.id)}
                        className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-md bg-[#16161f] border border-white/10 rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-white mb-5">Nueva Mesa</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Mesa 6"
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Zona</label>
                  <select
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all"
                  >
                    {ZONAS.map((z) => (
                      <option key={z} value={z} className="bg-[#16161f]">
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Capacidad
                  </label>
                  <input
                    type="number"
                    value={capacidad}
                    onChange={(e) => setCapacidad(e.target.value)}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all"
                  />
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-black gradient-brand shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all"
              >
                {saving ? 'Creando...' : 'Crear Mesa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mesa Modal */}
      {selectedMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMesa(null)} />
          <div className="relative w-full max-w-sm bg-[#16161f] border border-white/10 rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-white mb-4">Editar Mesa</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre</label>
                <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Zona</label>
                  <select value={editZona} onChange={(e) => setEditZona(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all">
                    {ZONAS.map(z => <option key={z} value={z} className="bg-[#16161f]">{z}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Personas</label>
                  <input type="number" value={editCapacidad} onChange={(e) => setEditCapacidad(e.target.value)} min="1" max="20" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-all" />
                </div>
              </div>
              <p className="text-[10px] text-gray-600">Posición actual: X:{selectedMesa.pos_x.toFixed(0)}% Y:{selectedMesa.pos_y.toFixed(0)}%</p>
              <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-gray-500 mb-1">Link QR de esta mesa:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[10px] text-brand-400 bg-[#0d0d14] px-2 py-1 rounded truncate">
                    {`${window.location.origin}/menu?qr=${selectedMesa.nombre.replace(/\s+/g, '-').toUpperCase()}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/menu?qr=${selectedMesa.nombre.replace(/\s+/g, '-').toUpperCase()}`);
                    }}
                    className="px-2 py-1 rounded text-[10px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
              <button onClick={() => setSelectedMesa(null)} className="flex-1 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">Cancelar</button>
              <button onClick={handleGuardarMesa} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-black gradient-brand shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrMesa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setQrMesa(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-scale-in text-center">
            {/* Print-friendly white background */}
            <div id="qr-print-area">
              <div className="mb-4">
                <img src="/logo.png" alt="A-la Burguer" className="h-12 w-12 mx-auto rounded-full mb-2" />
                <h3 className="text-lg font-bold text-gray-900">{qrMesa.nombre}</h3>
                <p className="text-xs text-gray-500">{qrMesa.zona} &bull; {qrMesa.capacidad} personas</p>
              </div>
              
              {/* QR Code Image from free API */}
              <div className="flex justify-center my-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/menu?qr=${qrMesa.nombre.replace(/\s+/g, '-').toUpperCase()}`)}`}
                  alt={`QR ${qrMesa.nombre}`}
                  width={200}
                  height={200}
                  className="border-4 border-gray-900 rounded-lg"
                />
              </div>

              <p className="text-xs text-gray-600 font-medium">Escanea para ver el menú</p>
              <p className="text-[10px] text-gray-400 mt-1">A-la Burguer &bull; San Pablo Autopan</p>
            </div>

            {/* Actions (not printed) */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2 print:hidden">
              <button
                onClick={() => setQrMesa(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const printContent = document.getElementById('qr-print-area');
                  if (printContent) {
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(`
                        <html>
                          <head>
                            <title>QR ${qrMesa.nombre}</title>
                            <style>
                              body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                              img.logo { width: 60px; height: 60px; border-radius: 50%; margin-bottom: 10px; }
                              h3 { margin: 5px 0; font-size: 24px; }
                              p { margin: 3px 0; color: #666; font-size: 12px; }
                              img.qr { border: 4px solid #000; border-radius: 8px; margin: 20px 0; }
                              .scan-text { font-size: 14px; font-weight: bold; color: #333; }
                              .footer { font-size: 10px; color: #999; margin-top: 8px; }
                            </style>
                          </head>
                          <body>
                            <img src="/logo.png" class="logo" alt="Logo" />
                            <h3>${qrMesa.nombre}</h3>
                            <p>${qrMesa.zona} • ${qrMesa.capacidad} personas</p>
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/menu?qr=${qrMesa.nombre.replace(/\s+/g, '-').toUpperCase()}`)}" class="qr" width="250" height="250" />
                            <p class="scan-text">Escanea para ver el menú</p>
                            <p class="footer">A-la Burguer • San Pablo Autopan</p>
                          </body>
                        </html>
                      `);
                      win.document.close();
                      setTimeout(() => win.print(), 500);
                    }
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-all"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
