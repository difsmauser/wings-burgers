'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ========== Types ==========

interface PedidoMesero {
  id: string;
  numero: string;
  estado: string;
  modalidad: string;
  canal?: string;
  clienteNombre?: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
  total: number;
  creadoEn: string;
  mesaZona?: string;
  meseroId?: string;
  meseroNombre?: string;
  estadoPago?: string;
  metodoPago?: string;
  observaciones?: string;
}

// ========== Constants ==========

const MESERO_STORAGE_KEY = 'alaburguer-mesero-nombre';

// ========== Helpers ==========

function parseCanal(canal?: string): string {
  return canal || 'MESA_LOCAL';
}

// ========== Login Component (PIN + Photo) ==========

function MeseroLoginScreen({ onLogin }: { onLogin: (nombre: string) => void }) {
  const [meserosRegistrados, setMeserosRegistrados] = useState<Array<{ id: string; nombre: string; pin: string | null }>>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedMesero, setSelectedMesero] = useState<{ id: string; nombre: string; pin: string | null } | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    // Fetch meseros directly from Supabase REST API (public, bypasses server-side auth issues)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      // Fallback to API route
      fetch('/api/meseros')
        .then(res => res.ok ? res.json() : { data: [] })
        .then(json => setMeserosRegistrados(json.data || []))
        .catch(() => {})
        .finally(() => setLoadingList(false));
      return;
    }

    fetch(`${supabaseUrl}/rest/v1/mesero?activo=eq.true&select=id,nombre,pin&order=nombre.asc`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMeserosRegistrados(data);
        } else {
          // Si Supabase directo no devuelve datos (RLS), intentar vía API
          return fetch('/api/meseros')
            .then(res => res.ok ? res.json() : { data: [] })
            .then(json => setMeserosRegistrados(json.data || []));
        }
      })
      .catch(() => {
        // Ultimate fallback
        fetch('/api/meseros')
          .then(res => res.ok ? res.json() : { data: [] })
          .then(json => setMeserosRegistrados(json.data || []))
          .catch(() => {});
      })
      .finally(() => setLoadingList(false));
  }, []);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pinInput.length === 4 && selectedMesero) {
      if (!selectedMesero.pin || selectedMesero.pin === pinInput) {
        // Success
        setPinError(false);
        onLogin(selectedMesero.nombre);
      } else {
        // Wrong PIN
        setPinError(true);
        setShaking(true);
        setTimeout(() => { setShaking(false); setPinInput(''); setPinError(false); }, 600);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinInput, selectedMesero]);

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 4) {
      setPinInput(prev => prev + digit);
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setPinError(false);
  };

  const handleSelectMesero = (mesero: typeof meserosRegistrados[0]) => {
    setSelectedMesero(mesero);
    setPinInput('');
    setPinError(false);
    // If mesero has no PIN, log in directly
    if (!mesero.pin) {
      onLogin(mesero.nombre);
    }
  };

  if (loadingList) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
      </div>
    );
  }

  // PIN Entry Screen
  if (selectedMesero && selectedMesero.pin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-xs">
          {/* Back button */}
          <button
            onClick={() => { setSelectedMesero(null); setPinInput(''); }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Cambiar mesero
          </button>

          {/* Profile */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-2xl mx-auto overflow-hidden border-2 transition-all duration-300 ${
              pinError ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-white/10 shadow-lg shadow-black/20'
            } ${shaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
              <div className="w-full h-full bg-gradient-to-br from-brand-500/30 to-brand-600/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-brand-400">{selectedMesero.nombre.charAt(0).toUpperCase()}</span>
                </div>
            </div>
            <h2 className="text-lg font-bold text-white mt-3">{selectedMesero.nombre}</h2>
            <p className="text-xs text-gray-500 mt-1">Ingresa tu PIN de 4 dígitos</p>
          </div>

          {/* PIN Dots */}
          <div className={`flex items-center justify-center gap-4 mb-8 ${shaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  i < pinInput.length
                    ? pinError ? 'bg-red-400 scale-110' : 'bg-brand-400 scale-110'
                    : 'bg-white/10 border border-white/20'
                }`}
              />
            ))}
          </div>

          {/* Error message */}
          {pinError && (
            <p className="text-center text-xs text-red-400 mb-4 animate-fade-in">PIN incorrecto</p>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
              if (key === '') return <div key="empty" />;
              if (key === 'del') {
                return (
                  <button
                    key="del"
                    onClick={handlePinDelete}
                    className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all mx-auto"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z" /></svg>
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  onClick={() => handlePinDigit(key)}
                  className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-xl font-semibold text-white hover:bg-white/[0.08] active:scale-95 active:bg-brand-500/10 transition-all mx-auto"
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Mesero Selection Grid
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-white">Módulo Mesero</h1>
          <p className="text-sm text-gray-500 mt-1">Selecciona tu perfil para continuar</p>
        </div>

        {meserosRegistrados.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {meserosRegistrados.map(m => (
              <button
                key={m.id}
                onClick={() => handleSelectMesero(m)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-[#12121a] border border-white/[0.06] hover:border-brand-400/30 hover:bg-brand-500/5 transition-all group active:scale-[0.97]"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/10 group-hover:border-brand-400/30 transition-all">
                  <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-brand-400">{m.nombre.charAt(0).toUpperCase()}</span>
                    </div>
                </div>
                <span className="text-xs font-medium text-white text-center truncate w-full">{m.nombre}</span>
                {m.pin && (
                  <span className="text-[9px] text-gray-600 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    PIN
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 rounded-2xl bg-[#12121a] border border-white/[0.06]">
            <p className="text-sm text-gray-400">No hay meseros registrados</p>
            <p className="text-xs text-gray-600 mt-1">Pide al administrador que registre meseros</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== Component ==========

export default function MeseroPage() {
  const router = useRouter();
  const [meseroNombre, setMeseroNombre] = useState<string>('');
  const [registrado, setRegistrado] = useState(false);
  const [pedidosDisponibles, setPedidosDisponibles] = useState<PedidoMesero[]>([]);
  const [misPedidos, setMisPedidos] = useState<PedidoMesero[]>([]);
  const [misPedidosDia, setMisPedidosDia] = useState<PedidoMesero[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  // Hydrate mesero name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(MESERO_STORAGE_KEY);
    if (stored) {
      setMeseroNombre(stored);
      setRegistrado(true);
    }
  }, []);

  const registrarMesero = (nombre: string) => {
    localStorage.setItem(MESERO_STORAGE_KEY, nombre);
    setMeseroNombre(nombre);
    setRegistrado(true);
  };

  // Fetch orders
  const fetchPedidos = useCallback(async () => {
    if (!registrado) return;
    try {
      // Fetch listo_para_servir (available for pickup)
      const resDisponibles = await fetch('/api/pedidos?estado=listo_para_servir');
      let disponibles: PedidoMesero[] = [];
      if (resDisponibles.ok) {
        const json = await resDisponibles.json();
        disponibles = (json.data || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          numero: p.numero as string,
          estado: p.estado as string,
          modalidad: p.modalidad as string || 'local',
          canal: parseCanal(p.canal as string),
          clienteNombre: p.clienteNombre as string || '',
          items: (p.items as Array<{ nombre: string; cantidad: number; precioUnitario: number }>) || [],
          total: p.total as number || 0,
          creadoEn: p.creadoEn as string || '',
          mesaZona: p.mesaZona as string || '',
          meseroId: p.meseroId as string || '',
          meseroNombre: p.meseroNombre as string || '',
          estadoPago: p.estadoPago as string || 'pendiente',
          metodoPago: p.metodoPago as string || undefined,
          observaciones: p.observaciones as string || '',
        }));
      }

      // Fetch servido (my orders pending payment)
      const resServidos = await fetch('/api/pedidos?estado=servido');
      let servidos: PedidoMesero[] = [];
      if (resServidos.ok) {
        const json = await resServidos.json();
        servidos = (json.data || []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          numero: p.numero as string,
          estado: p.estado as string,
          modalidad: p.modalidad as string || 'local',
          canal: parseCanal(p.canal as string),
          clienteNombre: p.clienteNombre as string || '',
          items: (p.items as Array<{ nombre: string; cantidad: number; precioUnitario: number }>) || [],
          total: p.total as number || 0,
          creadoEn: p.creadoEn as string || '',
          mesaZona: p.mesaZona as string || '',
          meseroId: p.meseroId as string || '',
          meseroNombre: p.meseroNombre as string || '',
          estadoPago: p.estadoPago as string || 'pendiente',
          metodoPago: p.metodoPago as string || undefined,
          observaciones: p.observaciones as string || '',
        }));
      }

      // Separate: disponibles sin asignar vs mis pedidos
      const sinAsignar = disponibles.filter(p => !p.meseroNombre);
      const misAsignados = disponibles.filter(p => p.meseroNombre === meseroNombre);
      const misServidos = servidos.filter(p => p.meseroNombre === meseroNombre && p.estadoPago !== 'pagado');

      // Pedidos pagados del día (para historial)
      const misPagadosHoy = servidos.filter(p => p.meseroNombre === meseroNombre && p.estadoPago === 'pagado');

      setPedidosDisponibles(sinAsignar);
      setMisPedidos([...misAsignados, ...misServidos]);
      setMisPedidosDia(misPagadosHoy);

      // Sound on new available orders
      if (sinAsignar.length > pedidosDisponibles.length && pedidosDisponibles.length > 0) {
        playNotificationSound();
      }

      // Sound + alert when a client chooses efectivo (mesero needs to go collect)
      const pedidosCobrar = [...misAsignados, ...misServidos].filter(
        p => p.observaciones?.includes('[EFECTIVO]') || p.metodoPago === 'efectivo'
      );
      const prevCobrar = misPedidos.filter(
        p => p.observaciones?.includes('[EFECTIVO]') || p.metodoPago === 'efectivo'
      );
      if (pedidosCobrar.length > prevCobrar.length && prevCobrar.length >= 0 && misPedidos.length > 0) {
        // New payment request — play alert sound
        playNotificationSound();
        playNotificationSound(); // Double beep for urgency
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrado, meseroNombre]);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 5000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new AudioContext();
      }
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* silent */ }
  };

  // Assign order to this mesero
  const tomarPedido = async (pedido: PedidoMesero) => {
    setProcesandoId(pedido.id);
    try {
      await fetch('/api/mesero/accion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'tomar', pedidoId: pedido.id, meseroNombre }),
      });
      await fetchPedidos();
    } catch { /* silent */ }
    finally { setProcesandoId(null); }
  };

  // Mark as delivered (servido) — mesero took food to table
  const marcarServido = async (pedidoId: string) => {
    setProcesandoId(pedidoId);
    try {
      await fetch('/api/mesero/accion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'entregar', pedidoId, meseroNombre }),
      });
      await fetchPedidos();
    } catch { /* silent */ }
    finally { setProcesandoId(null); }
  };

  // Liberar mesa after payment confirmed
  const liberarMesa = async (pedido: PedidoMesero) => {
    setProcesandoId(pedido.id);
    try {
      if (pedido.mesaZona) {
        const mesaNombre = pedido.mesaZona.split(' - ')[0];
        await fetch('/api/mesero/accion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accion: 'liberar', meseroNombre, mesaNombre }),
        });
      }
      await fetchPedidos();
    } catch { /* silent */ }
    finally { setProcesandoId(null); }
  };

  // Mesero confirma que recogió el dinero del cliente — notifica a caja
  const confirmarDineroRecogido = async (pedidoId: string) => {
    setProcesandoId(pedidoId);
    try {
      const res = await fetch('/api/mesero/dinero-recogido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, meseroNombre }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Error dinero-recogido:', err);
      }
      await fetchPedidos();
    } catch (e) {
      console.error('Error dinero-recogido:', e);
    }
    finally { setProcesandoId(null); }
  };

  // Mesero cobra efectivo directamente (pedido por mesa sin QR)
  const cobrarEfectivoMesero = async (pedidoId: string) => {
    setProcesandoId(pedidoId);
    try {
      // Marcar como efectivo
      await fetch('/api/pagos/efectivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, billete: 0 }),
      });
      // Marcar que mesero recogió
      await fetch('/api/mesero/dinero-recogido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, meseroNombre }),
      });
      await fetchPedidos();
    } catch { /* */ }
    finally { setProcesandoId(null); }
  };

  // Mesero sube foto del voucher de transferencia
  const subirFotoVoucher = async (pedidoId: string, file: File) => {
    setProcesandoId(pedidoId);
    try {
      const formData = new FormData();
      formData.append('pedidoId', pedidoId);
      formData.append('archivo', file);

      const res = await fetch('/api/pagos/comprobante', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        console.error('Error subiendo voucher:', await res.text());
      }
      await fetchPedidos();
    } catch (e) {
      console.error('Error subiendo voucher:', e);
    }
    finally { setProcesandoId(null); }
  };

  const handleLogout = async () => {
    localStorage.removeItem(MESERO_STORAGE_KEY);
    setMeseroNombre('');
    setRegistrado(false);
  };

  // ========== Registration Screen ==========
  if (!registrado) {
    return <MeseroLoginScreen onLogin={registrarMesero} />;
  }

  // ========== Loading ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ========== Main View ==========
  // Count today's deliveries
  const entregasHoy = misPedidos.filter(p => p.estado === 'servido').length + misPedidosDia.length;
  const pendientesEntrega = misPedidos.filter(p => p.estado === 'listo_para_servir').length;
  // Solo contar "ir a cobrar" cuando el cliente YA eligió efectivo Y mesero NO ha entregado
  const pendientesCobro = misPedidos.filter(p =>
    p.estado === 'servido' &&
    p.estadoPago !== 'pagado' &&
    (p.observaciones?.includes('[EFECTIVO]') || p.metodoPago === 'efectivo') &&
    !p.observaciones?.includes('[MESERO_ENTREGO]')
  ).length;

  // Separate by channel
  const getCanal = (p: PedidoMesero): { label: string; icon: string; color: string } => {
    switch (p.canal) {
      case 'MESA_LOCAL': return { label: 'En Sucursal', icon: '🍽️', color: 'text-yellow-400' };
      case 'MESA_LLEVAR': return { label: 'Mesa → Llevar', icon: '🛍️', color: 'text-amber-400' };
      case 'MOSTRADOR': return { label: 'Mostrador', icon: '📱', color: 'text-orange-400' };
      case 'DOMICILIO': return { label: 'Domicilio', icon: '🛵', color: 'text-green-400' };
      default: return { label: 'Mesa', icon: '🍽️', color: 'text-yellow-400' };
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header premium */}
      <header className="bg-[#111118] border-b border-white/5 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400/20 to-brand-600/20 flex items-center justify-center border border-brand-400/20 shadow-lg shadow-brand-500/10">
              <span className="text-lg font-bold text-brand-400">{meseroNombre.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">{meseroNombre}</h1>
              <p className="text-[10px] text-gray-500">Módulo Mesero</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mr-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              En línea
            </div>
            <button onClick={fetchPedidos} className="p-2 rounded-lg text-gray-400 bg-white/5 border border-white/10 hover:text-white transition-all" aria-label="Actualizar">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-red-400 border border-white/5 transition-all">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 animate-fade-in">
        {/* KPIs — Premium Glass Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-gradient-to-br from-brand-500/5 to-transparent border border-brand-500/10 p-3 text-center">
            <p className="text-2xl font-black text-brand-400">{entregasHoy}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Entregados</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 p-3 text-center">
            <p className="text-2xl font-black text-emerald-400">{pendientesEntrega}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Por entregar</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/10 p-3 text-center">
            <p className="text-2xl font-black text-green-400">{pendientesCobro}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Ir a cobrar</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent border border-purple-500/10 p-3 text-center">
            <p className="text-2xl font-black text-purple-400">{pedidosDisponibles.length}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Disponibles</p>
          </div>
        </div>

        {/* ═══════ ALERTA: Ir a cobrar ═══════ */}
        {misPedidos.filter(p => (p.observaciones?.includes('[EFECTIVO]') || p.metodoPago === 'efectivo') && !p.observaciones?.includes('[MESERO_ENTREGO]')).length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-green-500/10 to-green-900/5 border border-green-500/20 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
                <span className="text-2xl">💵</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-green-400">¡Ir a cobrar!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {misPedidos.filter(p => (p.observaciones?.includes('[EFECTIVO]') || p.metodoPago === 'efectivo') && !p.observaciones?.includes('[MESERO_ENTREGO]')).map(p =>
                    p.mesaZona ? p.mesaZona.split(' - ')[0] : 'Cliente'
                  ).join(', ')}
                </p>
              </div>
              <span className="text-3xl animate-bounce" style={{ animationDuration: '1.5s' }}>👉</span>
            </div>
          </div>
        )}

        {/* ═══════ MIS PEDIDOS ═══════ */}
        {misPedidos.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              🎯 Mis Pedidos
              <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-[10px] font-bold">
                {misPedidos.length}
              </span>
            </h2>
            <div className="space-y-3">
              {misPedidos.map(pedido => {
                const canal = getCanal(pedido);
                const necesitaCobrar = pedido.observaciones?.includes('[EFECTIVO]') || pedido.metodoPago === 'efectivo';
                return (
                  <div key={pedido.id} className={`rounded-2xl border p-4 transition-all ${
                    necesitaCobrar
                      ? 'bg-gradient-to-br from-green-500/5 to-[#16161f] border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]'
                      : 'bg-[#16161f] border-white/5 hover:border-brand-400/20'
                  }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">#{pedido.numero.split('-').pop()}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full border border-white/10 font-medium ${canal.color}`}>{canal.icon} {canal.label}</span>
                        {pedido.mesaZona && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            📍 {pedido.mesaZona.split(' - ')[0]}
                          </span>
                        )}
                      </div>
                      <span className="text-base font-black text-brand-400">${pedido.total.toFixed(0)}</span>
                    </div>

                    {/* Items */}
                    <div className="rounded-xl bg-black/20 p-3 mb-3 space-y-1">
                      {pedido.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <p className="text-xs text-gray-300"><span className="text-brand-400 font-bold mr-1">{item.cantidad}x</span>{item.nombre}</p>
                          <span className="text-[10px] text-gray-500">${(item.precioUnitario * item.cantidad).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    {pedido.estado === 'listo_para_servir' && (
                      <button
                        onClick={() => marcarServido(pedido.id)}
                        disabled={procesandoId === pedido.id}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-[0.97]"
                      >
                        {procesandoId === pedido.id ? '⏳ Actualizando...' : '🍽️ Marcar como Entregado'}
                      </button>
                    )}

                    {pedido.estado === 'servido' && pedido.estadoPago === 'pagado' && (
                      <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center">
                        <p className="text-sm text-green-400 font-bold">✅ Pagado y entregado</p>
                      </div>
                    )}

                    {pedido.estado === 'servido' && pedido.estadoPago !== 'pagado' && (
                      <div>
                        {necesitaCobrar ? (
                          <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center space-y-3">
                            {pedido.observaciones?.includes('[MESERO_ENTREGO]') ? (
                              /* Ya se entregó a caja */
                              <div>
                                <p className="text-sm text-green-400 font-bold">✅ Dinero entregado a caja</p>
                                <p className="text-[10px] text-gray-500 mt-1">Esperando que caja confirme el cobro</p>
                              </div>
                            ) : (
                              /* Aún no se entrega */
                              <>
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-xl">💵</span>
                                  <p className="text-sm text-green-400 font-bold">Ir a cobrar efectivo</p>
                                </div>
                                <p className="text-xs text-gray-400">
                                  {pedido.mesaZona ? pedido.mesaZona : 'Cliente esperando'}
                                </p>
                                {pedido.observaciones?.includes('Paga con') && (
                                  <p className="text-xs text-brand-400 font-semibold">
                                    {pedido.observaciones.match(/Paga con \$\d+/)?.[0] || 'Monto exacto'}
                                  </p>
                                )}
                                <button
                                  onClick={() => confirmarDineroRecogido(pedido.id)}
                                  disabled={procesandoId === pedido.id}
                                  className="w-full py-3 rounded-xl text-sm font-bold text-black bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-500/20 disabled:opacity-50 transition-all active:scale-[0.97]"
                                >
                                  {procesandoId === pedido.id ? '⏳ Procesando...' : '✓ Dinero recogido — entregar a caja'}
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center space-y-3">
                            <p className="text-xs text-gray-400">✓ Pedido entregado</p>
                            <p className="text-[10px] text-gray-600">¿Cómo paga el cliente?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => cobrarEfectivoMesero(pedido.id)}
                                disabled={procesandoId === pedido.id}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-all active:scale-[0.97]"
                              >
                                💵 Efectivo
                              </button>
                              <label className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 text-center cursor-pointer transition-all active:scale-[0.97]">
                                📷 Foto Transfer
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) subirFotoVoucher(pedido.id, file);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══════ DISPONIBLES PARA RECOGER ═══════ */}
        <section>
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            📋 Disponibles para recoger
            {pedidosDisponibles.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                {pedidosDisponibles.length}
              </span>
            )}
          </h2>

          {pedidosDisponibles.length === 0 ? (
            <div className="rounded-2xl bg-[#16161f] border border-white/5 p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm font-medium">Todo entregado</p>
              <p className="text-gray-600 text-[10px] mt-1">Se actualiza automáticamente cada 5 segundos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pedidosDisponibles.map(pedido => {
                const canal = getCanal(pedido);
                return (
                  <div key={pedido.id} className="rounded-xl bg-[#16161f] border border-emerald-500/10 p-4 hover:border-emerald-400/30 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">#{pedido.numero.split('-').pop()}</span>
                        <span className={`text-[9px] ${canal.color}`}>{canal.icon} {canal.label}</span>
                        {pedido.mesaZona && <span className="text-[10px] text-yellow-400">📍 {pedido.mesaZona.split(' - ')[0]}</span>}
                      </div>
                      <span className="text-sm font-bold text-brand-400">${pedido.total.toFixed(0)}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 mb-3">
                      {pedido.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')}
                    </div>
                    <button
                      onClick={() => tomarPedido(pedido)}
                      disabled={procesandoId === pedido.id}
                      className="w-full py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all active:scale-[0.97]"
                    >
                      {procesandoId === pedido.id ? '⏳ Tomando...' : '✋ Tomar pedido'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════ COMPLETADOS HOY ═══════ */}
        {misPedidosDia.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              ✅ Completados Hoy
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold">
                {misPedidosDia.length}
              </span>
              <span className="text-[10px] text-gray-500 font-normal ml-auto">
                Total: ${misPedidosDia.reduce((s, p) => s + p.total, 0).toFixed(0)}
              </span>
            </h2>
            <div className="rounded-2xl bg-[#16161f] border border-green-500/10 divide-y divide-white/5 overflow-hidden">
              {misPedidosDia.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-green-400 text-xs">✓</span>
                    <div>
                      <span className="text-xs font-bold text-white">#{p.numero.split('-').pop()}</span>
                      {p.mesaZona && <span className="text-[10px] text-gray-500 ml-2">{p.mesaZona.split(' - ')[0]}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand-400">${p.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══════ ACCIONES RÁPIDAS ═══════ */}
        <div className="pt-4 border-t border-white/5 space-y-2">
          <button
            onClick={() => router.push('/mesero/captura')}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-brand-400 bg-brand-500/5 border border-brand-400/20 hover:bg-brand-500/10 transition-all active:scale-[0.98]"
          >
            📝 Tomar nueva orden de cliente
          </button>
          <button
            onClick={() => router.push('/mesero/domicilio')}
            className="w-full py-3 rounded-xl text-sm font-medium text-green-400 bg-green-500/5 border border-green-400/20 hover:bg-green-500/10 transition-all"
          >
            🛵 Pedido a domicilio (WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
}
