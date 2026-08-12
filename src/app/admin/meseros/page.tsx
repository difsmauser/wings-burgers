'use client';

import { useState, useEffect, useCallback } from 'react';

interface Mesero {
  id: string;
  nombre: string;
  telefono: string | null;
  pin: string | null;
  activo: boolean;
  created_at?: string;
}

export default function MeserosAdminPage() {
  const [meseros, setMeseros] = useState<Mesero[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Mesero | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pin, setPin] = useState('');

  const fetchMeseros = useCallback(async () => {
    try {
      const res = await fetch('/api/meseros');
      if (res.ok) {
        const json = await res.json();
        setMeseros(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeseros();
  }, [fetchMeseros]);

  const resetForm = () => {
    setNombre('');
    setTelefono('');
    setPin('');
    setEditando(null);
    setError(null);
  };

  const openCrear = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditar = (mesero: Mesero) => {
    setEditando(mesero);
    setNombre(mesero.nombre);
    setTelefono(mesero.telefono || '');
    setPin(mesero.pin || '');
    setShowModal(true);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (editando) {
        // Actualizar
        const res = await fetch('/api/meseros', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editando.id,
            nombre: nombre.trim(),
            telefono: telefono.trim() || null,
            pin: pin.trim() || null,
          }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error?.message || 'Error al actualizar');
        }
      } else {
        // Crear
        const res = await fetch('/api/meseros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nombre.trim(),
            telefono: telefono.trim() || null,
            pin: pin.trim() || null,
          }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error?.message || 'Error al crear');
        }
      }

      setShowModal(false);
      resetForm();
      fetchMeseros();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      const res = await fetch(`/api/meseros?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error?.message || 'Error al eliminar');
      }
      setConfirmDelete(null);
      fetchMeseros();
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🧑‍🍳</span>
            Meseros
          </h1>
          <p className="text-sm text-gray-500 mt-1">{meseros.length} meseros registrados</p>
        </div>
        <button
          onClick={openCrear}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all active:scale-[0.97]"
        >
          + Nuevo Mesero
        </button>
      </div>

      {/* Table */}
      {meseros.length === 0 ? (
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-12 text-center">
          <span className="text-5xl block mb-3">🧑‍🍳</span>
          <p className="text-gray-400 text-sm">No hay meseros registrados</p>
          <p className="text-gray-600 text-xs mt-1">Agrega el primer mesero para comenzar</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#16161f] border border-white/5 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">PIN</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {meseros.map((mesero) => (
                <tr key={mesero.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/10 border border-brand-400/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-brand-400">
                          {mesero.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-white">{mesero.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {mesero.telefono || <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                    {mesero.pin ? '••••' : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditar(mesero)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
                      >
                        Editar
                      </button>
                      {confirmDelete === mesero.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEliminar(mesero.id)}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(mesero.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#16161f] border border-white/10 p-6 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">
                {editando ? 'Editar Mesero' : 'Nuevo Mesero'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Carlos, María..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                  placeholder="5512345678"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">PIN de acceso (opcional)</label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                  placeholder="4 dígitos"
                  maxLength={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all font-mono tracking-widest"
                />
                <p className="text-[10px] text-gray-600 mt-1">El PIN permite identificar al mesero en su módulo</p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all active:scale-[0.97]"
              >
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Mesero'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
