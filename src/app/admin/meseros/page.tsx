'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Mesero {
  id: string;
  nombre: string;
  telefono: string | null;
  pin: string | null;
  foto_url: string | null;
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
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFotoUrl(null);
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
    setFotoUrl(mesero.foto_url || null);
    setShowModal(true);
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La foto no debe superar 5MB');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Error al subir foto');
      const json = await res.json();
      setFotoUrl(json.data?.url || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir foto');
    } finally {
      setUploading(false);
    }
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (pin && pin.length !== 4) {
      setError('El PIN debe ser de 4 dígitos');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (editando) {
        const res = await fetch('/api/meseros', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editando.id,
            nombre: nombre.trim(),
            telefono: telefono.trim() || null,
            pin: pin.trim() || null,
            foto_url: fotoUrl || null,
          }),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error?.message || 'Error al actualizar');
        }
      } else {
        const res = await fetch('/api/meseros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nombre.trim(),
            telefono: telefono.trim() || null,
            pin: pin.trim() || null,
            foto_url: fotoUrl || null,
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
          <p className="text-xs text-gray-500 animate-pulse">Cargando meseros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            Meseros
          </h1>
          <p className="text-sm text-gray-500 mt-1">{meseros.length} meseros activos</p>
        </div>
        <button
          onClick={openCrear}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all active:scale-[0.97]"
        >
          + Nuevo Mesero
        </button>
      </div>

      {/* Mesero Grid Cards */}
      {meseros.length === 0 ? (
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl opacity-40">🧑‍🍳</span>
          </div>
          <p className="text-gray-400 text-sm font-medium">No hay meseros registrados</p>
          <p className="text-gray-600 text-xs mt-1">Agrega el primer mesero para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {meseros.map((mesero) => (
            <div key={mesero.id} className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-5 hover:border-white/10 transition-all group">
              <div className="flex items-start gap-4">
                {/* Photo */}
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                  {mesero.foto_url ? (
                    <img src={mesero.foto_url} alt={mesero.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-500/20 to-brand-600/10">
                      <span className="text-lg font-bold text-brand-400">{mesero.nombre.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{mesero.nombre}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    {mesero.telefono && (
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        {mesero.telefono}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
                      mesero.pin ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                    }`}>
                      {mesero.pin ? '🔒 PIN activo' : 'Sin PIN'}
                    </span>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                <button
                  onClick={() => openEditar(mesero)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
                >
                  Editar
                </button>
                {confirmDelete === mesero.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEliminar(mesero.id)}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-2 rounded-lg text-xs text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(mesero.id)}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-white">
                {editando ? 'Editar Mesero' : 'Nuevo Mesero'}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Photo Upload */}
              <div className="flex flex-col items-center">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border-2 border-dashed border-white/10 hover:border-brand-400/40 cursor-pointer transition-all relative group"
                >
                  {fotoUrl ? (
                    <img src={fotoUrl} alt="Foto mesero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <svg className="w-6 h-6 text-gray-600 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUploadFoto}
                  className="hidden"
                />
                <p className="text-[10px] text-gray-600 mt-2">
                  {fotoUrl ? 'Click para cambiar foto' : 'Click para subir foto (opcional)'}
                </p>
                {fotoUrl && (
                  <button onClick={() => setFotoUrl(null)} className="text-[10px] text-red-400 hover:text-red-300 mt-1">
                    Quitar foto
                  </button>
                )}
              </div>

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
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">PIN de acceso (4 dígitos) *</label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/30 transition-all font-mono tracking-[0.5em] text-center text-lg"
                />
                <p className="text-[10px] text-gray-600 mt-1">El mesero usará este PIN para iniciar sesión en su módulo</p>
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
                disabled={saving || uploading}
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
