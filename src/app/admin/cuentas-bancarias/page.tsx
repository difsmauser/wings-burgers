'use client';

import { useState, useEffect, useCallback } from 'react';

interface CuentaBancaria {
  id: string;
  banco: string;
  titular: string;
  clabe: string;
  numero_tarjeta: string | null;
  referencia: string | null;
  activa: boolean;
}

export default function CuentasBancariasPage() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<CuentaBancaria | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [banco, setBanco] = useState('');
  const [titular, setTitular] = useState('');
  const [clabe, setClabe] = useState('');
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [referencia, setReferencia] = useState('');

  const fetchCuentas = useCallback(async () => {
    try {
      const res = await fetch('/api/cuentas-bancarias');
      if (res.ok) { const json = await res.json(); setCuentas(json.data ?? []); }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCuentas(); }, [fetchCuentas]);

  const resetForm = () => {
    setBanco(''); setTitular(''); setClabe(''); setNumeroTarjeta(''); setReferencia('');
    setEditando(null); setError(null);
  };

  const openCrear = () => { resetForm(); setShowModal(true); };
  const openEditar = (c: CuentaBancaria) => {
    setEditando(c); setBanco(c.banco); setTitular(c.titular); setClabe(c.clabe);
    setNumeroTarjeta(c.numero_tarjeta || ''); setReferencia(c.referencia || '');
    setShowModal(true);
  };

  const handleGuardar = async () => {
    if (!banco.trim()) { setError('El banco es obligatorio'); return; }
    if (!titular.trim()) { setError('El titular es obligatorio'); return; }
    if (!clabe.trim() || clabe.replace(/\D/g, '').length !== 18) { setError('La CLABE debe tener exactamente 18 dígitos'); return; }
    if (!numeroTarjeta.trim() || numeroTarjeta.replace(/\D/g, '').length !== 16) { setError('El número de tarjeta debe tener exactamente 16 dígitos'); return; }
    setSaving(true); setError(null);
    try {
      const payload = { banco, titular, clabe: clabe.replace(/\D/g, ''), numeroTarjeta: numeroTarjeta.replace(/\D/g, ''), referencia: referencia || null, ...(editando ? { id: editando.id } : {}) };
      const res = await fetch('/api/cuentas-bancarias', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setShowModal(false); resetForm(); fetchCuentas();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleEliminar = async (id: string) => {
    await fetch(`/api/cuentas-bancarias?id=${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    fetchCuentas();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🏦</span> Cuentas Bancarias
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cuentas para recibir pagos por transferencia</p>
        </div>
        <button onClick={openCrear} className="px-4 py-2.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 hover:shadow-xl transition-all active:scale-[0.97]">
          + Nueva Cuenta
        </button>
      </div>

      {cuentas.length === 0 ? (
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-12 text-center">
          <span className="text-5xl block mb-3">🏦</span>
          <p className="text-gray-400 text-sm">No hay cuentas bancarias configuradas</p>
          <p className="text-gray-600 text-xs mt-1">Agrega una cuenta para que los clientes puedan pagar por transferencia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cuentas.map(c => (
            <div key={c.id} className="rounded-xl bg-[#16161f] border border-white/5 p-4 hover:border-brand-400/20 transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{c.banco}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 font-medium">Activa</span>
                  </div>
                  <p className="text-xs text-gray-400">Titular: <span className="text-white">{c.titular}</span></p>
                  <p className="text-xs text-gray-400">CLABE: <span className="text-brand-400 font-mono">{c.clabe}</span></p>
                  {c.numero_tarjeta && <p className="text-xs text-gray-400">Tarjeta: <span className="text-white font-mono">{c.numero_tarjeta}</span></p>}
                  {c.referencia && <p className="text-xs text-gray-400">Referencia: <span className="text-white">{c.referencia}</span></p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditar(c)} className="px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/5 hover:text-white hover:bg-white/10 border border-white/5 transition-all">Editar</button>
                  <button onClick={() => setConfirmDeleteId(c.id)} className="px-3 py-1.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all">Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#16161f] border border-white/10 p-6 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">{editando ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Banco *</label>
                <input type="text" value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ej: BBVA, Banorte, HSBC" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Titular *</label>
                <input type="text" value={titular} onChange={e => setTitular(e.target.value)} placeholder="Nombre completo del titular" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">CLABE Interbancaria *</label>
                <input type="text" value={clabe} onChange={e => setClabe(e.target.value.replace(/[^\d]/g, '').slice(0, 18))} placeholder="18 dígitos" maxLength={18} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 font-mono" />
                {clabe && clabe.length !== 18 && <p className="text-[10px] text-red-400 mt-1">Debe tener 18 dígitos ({clabe.length}/18)</p>}
                {clabe && clabe.length === 18 && <p className="text-[10px] text-green-400 mt-1">✓ CLABE válida</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Número de Tarjeta *</label>
                <input type="text" value={numeroTarjeta} onChange={e => setNumeroTarjeta(e.target.value.replace(/[^\d]/g, '').slice(0, 16))} placeholder="16 dígitos" maxLength={16} className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50 font-mono" />
                {numeroTarjeta && numeroTarjeta.length !== 16 && <p className="text-[10px] text-red-400 mt-1">Debe tener 16 dígitos ({numeroTarjeta.length}/16)</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Referencia / Concepto (opcional)</label>
                <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: Pago A-la Burguer" className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400/50" />
              </div>
              {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-brand-400 to-brand-600 shadow-lg disabled:opacity-50 transition-all active:scale-[0.97]">
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#16161f] border border-red-500/20 p-6 animate-scale-in shadow-2xl">
            <div className="text-center mb-5">
              <span className="text-4xl block mb-3">⚠️</span>
              <h3 className="text-base font-bold text-white">¿Eliminar cuenta?</h3>
              <p className="text-xs text-gray-400 mt-2">Esta acción desactivará la cuenta bancaria. Los clientes no la verán como opción de pago.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={() => handleEliminar(confirmDeleteId)} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-400 transition-all active:scale-[0.97]">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
