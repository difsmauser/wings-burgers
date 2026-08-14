'use client';

import { useState, useEffect, useCallback } from 'react';

interface Repartidor {
  id: string;
  nombre: string;
  telefono: string | null;
  vehiculo: string | null;
  activo: boolean;
}

export default function RepartidoresAdminPage() {
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Repartidor | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vehiculo, setVehiculo] = useState('');

  const fetchRepartidores = useCallback(async () => {
    try {
      const res = await fetch('/api/repartidores');
      if (res.ok) { const j = await res.json(); setRepartidores(j.data ?? []); }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRepartidores(); }, [fetchRepartidores]);

  const resetForm = () => { setNombre(''); setTelefono(''); setVehiculo(''); setEditando(null); setError(null); };
  const openCrear = () => { resetForm(); setShowModal(true); };
  const openEditar = (r: Repartidor) => { setEditando(r); setNombre(r.nombre); setTelefono(r.telefono || ''); setVehiculo(r.vehiculo || ''); setShowModal(true); };

  const handleGuardar = async () => {
    if (!nombre.trim()) { setError('Nombre obligatorio'); return; }
    setSaving(true); setError(null);
    try {
      const payload = { nombre, telefono: telefono || null, vehiculo: vehiculo || null, ...(editando ? { id: editando.id } : {}) };
      const res = await fetch('/api/repartidores', { method: editando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Error al guardar');
      setShowModal(false); resetForm(); fetchRepartidores();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleEliminar = async (id: string) => {
    await fetch(`/api/repartidores?id=${id}`, { method: 'DELETE' });
    fetchRepartidores();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><span className="text-3xl">🛵</span> Repartidores</h1>
          <p className="text-sm text-gray-500 mt-1">{repartidores.length} repartidores registrados</p>
        </div>
        <button onClick={openCrear} className="px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all active:scale-[0.97]">+ Nuevo Repartidor</button>
      </div>

      {repartidores.length === 0 ? (
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-12 text-center">
          <span className="text-5xl block mb-3">🛵</span>
          <p className="text-gray-400 text-sm">No hay repartidores registrados</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#16161f] border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Nombre</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Teléfono</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Vehículo</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {repartidores.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-400/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-brand-400">{r.nombre.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-white">{r.nombre}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{r.telefono || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{r.vehiculo || <span className="text-gray-600">—</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEditar(r)} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 border border-white/5 transition-all mr-2">Editar</button>
                    <button onClick={() => handleEliminar(r.id)} className="px-3 py-1.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#16161f] border border-white/10 p-6 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">{editando ? 'Editar Repartidor' : 'Nuevo Repartidor'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nombre *</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del repartidor" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Teléfono</label>
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value.replace(/[^\d]/g, '').slice(0, 10))} placeholder="5512345678" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Vehículo</label>
                <input type="text" value={vehiculo} onChange={e => setVehiculo(e.target.value)} placeholder="Ej: Moto roja, Bici, Italika" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50" />
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg disabled:opacity-50 transition-all active:scale-[0.97]">{saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
