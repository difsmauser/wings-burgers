'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Mesa {
  id: string;
  nombre: string;
  zona: string;
  estado: string;
  pos_x: number;
  pos_y: number;
  capacidad: number;
  pedido_activo_id: string | null;
}

interface PedidoCaja {
  id: string;
  numero: string;
  estado: string;
  modalidad: string;
  canal: string;
  clienteNombre: string;
  total: number;
  estadoPago: string;
  metodoPago?: string;
  mesaZona?: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number }>;
}

function parseCanal(obs?: string): string {
  if (!obs) return 'QR';
  const m = obs.match(/\[(QR|QR_REDES|MESERO)\]/);
  return m ? m[1] : 'QR';
}

export default function CajaPage() {
  const router = useRouter();
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [pedidos, setPedidos] = useState<PedidoCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch mesas
      const mesasRes = await fetch('/api/mesas');
      if (mesasRes.ok) { const d = await mesasRes.json(); setMesas(d.data ?? []); }

      // Fetch pedidos
      const estados = ['listo', 'entregado', 'servido', 'empacado', 'en_camino'];
      const allPedidos: PedidoCaja[] = [];
      for (const estado of estados) {
        const res = await fetch(`/api/pedidos?estado=${estado}`);
        if (res.ok) {
          const data = await res.json();
          (data.data || []).forEach((p: Record<string, unknown>) => {
            allPedidos.push({
              id: p.id as string,
              numero: p.numero as string,
              estado: p.estado as string || estado,
              modalidad: p.modalidad as string || 'local',
              canal: parseCanal(p.observaciones as string),
              clienteNombre: (p.clienteNombre as string) || '',
              total: p.total as number || 0,
              estadoPago: (p.estadoPago as string) || 'pendiente',
              metodoPago: p.metodoPago as string || undefined,
              mesaZona: p.mesaZona as string || '',
              items: (p.items as Array<{ nombre: string; cantidad: number; precioUnitario: number }>) || [],
            });
          });
        }
      }
      setPedidos(allPedidos);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 10000);
    return () => clearInterval(i);
  }, [fetchData]);

  const marcarPagado = async (pedidoId: string, metodo: 'efectivo' | 'transferencia') => {
    setProcesandoId(pedidoId);
    await fetch(`/api/pedidos/${pedidoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estadoPago: 'pagado', metodoPago: metodo }),
    });
    setProcesandoId(null);
    fetchData();
  };

  const liberarMesa = async (mesaId: string) => {
    await fetch('/api/mesas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mesaId, estado: 'disponible', pedido_activo_id: null }),
    });
    setSelectedMesa(null);
    fetchData();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Categorize pedidos
  const pendientesPago = pedidos.filter(p => p.estadoPago !== 'pagado');
  const pedidosMesa = pendientesPago.filter(p => p.modalidad === 'local' || p.modalidad === 'retiro');
  const pedidosDomicilio = pendientesPago.filter(p => p.modalidad === 'domicilio');
  const pagadosHoy = pedidos.filter(p => p.estadoPago === 'pagado');

  const totalEfectivo = pagadosHoy.filter(p => p.metodoPago === 'efectivo').reduce((s, p) => s + p.total, 0);
  const totalTransferencia = pagadosHoy.filter(p => p.metodoPago === 'transferencia').reduce((s, p) => s + p.total, 0);
  const totalDia = totalEfectivo + totalTransferencia;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-[#111118] border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="A-la Burguer" className="h-8 w-8 rounded-full" />
          <div>
            <h1 className="text-sm font-bold text-white">A-la Burguer</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Módulo de Caja</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-400 transition-colors">Cerrar Sesión</button>
      </header>

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Daily Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[#16161f] border border-white/5 p-3">
            <p className="text-[10px] text-gray-500">Pendientes</p>
            <p className="text-xl font-bold text-red-400">{pendientesPago.length}</p>
          </div>
          <div className="rounded-xl bg-[#16161f] border border-white/5 p-3">
            <p className="text-[10px] text-gray-500">Efectivo</p>
            <p className="text-xl font-bold text-green-400">${totalEfectivo.toFixed(0)}</p>
          </div>
          <div className="rounded-xl bg-[#16161f] border border-white/5 p-3">
            <p className="text-[10px] text-gray-500">Transferencia</p>
            <p className="text-xl font-bold text-blue-400">${totalTransferencia.toFixed(0)}</p>
          </div>
          <div className="rounded-xl bg-[#16161f] border border-brand-500/20 p-3">
            <p className="text-[10px] text-gray-500">Total del Día</p>
            <p className="text-xl font-bold text-brand-400">${totalDia.toFixed(0)}</p>
          </div>
        </div>

        {/* Floor Map */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Mapa de Mesas</h2>
            <div className="flex gap-3 text-[9px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span>Libre</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>Ocupada</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Cobro</span>
            </div>
          </div>
          <div className="relative w-full h-[250px] bg-[#0d0d14] rounded-xl border border-white/5 overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '10% 10%' }} />
            {mesas.map(mesa => {
              const isOcupada = mesa.estado === 'ocupada';
              const isPendiente = mesa.estado === 'pendiente_cobro';
              const isSelected = selectedMesa?.id === mesa.id;
              return (
                <div
                  key={mesa.id}
                  onClick={() => (isPendiente || isOcupada) && setSelectedMesa(mesa)}
                  className={`absolute w-14 h-14 rounded-xl flex flex-col items-center justify-center text-[9px] font-bold border transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-brand-400 scale-110 z-10' :
                    isPendiente ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 cursor-pointer hover:scale-105' :
                    isOcupada ? 'bg-red-500/20 border-red-500/40 text-red-400 cursor-pointer hover:scale-105' :
                    'bg-green-500/20 border-green-500/40 text-green-400'
                  }`}
                  style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <span>{mesa.nombre.replace('Mesa ', 'M').replace('Terraza ', 'T').replace('Barra ', 'B')}</span>
                  <span className="text-[7px] text-gray-500">{mesa.capacidad}p</span>
                  {isPendiente && <span className="text-[7px]">💰</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Mesa Detail */}
        {selectedMesa && (
          <div className="rounded-xl bg-[#16161f] border border-brand-500/20 p-4 animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{selectedMesa.nombre} — {selectedMesa.zona}</h3>
              <button onClick={() => setSelectedMesa(null)} className="text-xs text-gray-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-gray-400 mb-3 capitalize">Estado: <span className={selectedMesa.estado === 'ocupada' ? 'text-red-400' : 'text-amber-400'}>{selectedMesa.estado.replace('_', ' ')}</span></p>
            {selectedMesa.estado === 'pendiente_cobro' && (
              <button onClick={() => liberarMesa(selectedMesa.id)} className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-black gradient-brand shadow-lg shadow-brand-500/20 transition-all">
                ✓ Liberar Mesa (pago confirmado)
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pedidos en Mesa — grouped by mesaZona */}
          <div>
            <h2 className="text-sm font-bold text-white mb-3">🍽️ Pedidos en Mesa ({pedidosMesa.length})</h2>
            {pedidosMesa.length === 0 ? (
              <div className="rounded-xl bg-[#16161f] border border-white/5 p-6 text-center"><p className="text-gray-500 text-xs">Sin pedidos pendientes</p></div>
            ) : (
              <div className="space-y-3">
                {/* Group by mesaZona for accumulated billing */}
                {(() => {
                  const groups: Record<string, PedidoCaja[]> = {};
                  pedidosMesa.forEach(p => {
                    const key = p.mesaZona || `individual-${p.id}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(p);
                  });

                  return Object.entries(groups).map(([mesa, pedidosGrupo]) => {
                    const totalGrupo = pedidosGrupo.reduce((s, p) => s + p.total, 0);
                    const isMesa = mesa && !mesa.startsWith('individual-');

                    return (
                      <div key={mesa} className="rounded-xl bg-[#16161f] border border-white/5 p-3">
                        {/* Mesa header with total */}
                        {isMesa && pedidosGrupo.length > 1 && (
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
                            <span className="text-xs font-bold text-brand-400">📍 {mesa.split(' - ')[0]}</span>
                            <span className="text-sm font-bold text-white">Total: ${totalGrupo.toFixed(0)}</span>
                          </div>
                        )}

                        {/* Individual orders within the group */}
                        <div className="space-y-2">
                          {pedidosGrupo.map(p => (
                            <div key={p.id} className={pedidosGrupo.length > 1 ? 'pl-2 border-l-2 border-brand-400/20' : ''}>
                              <div className="flex justify-between items-center mb-1.5">
                                <div>
                                  <span className="text-xs font-bold text-white">#{p.numero}</span>
                                  <span className="text-[10px] text-gray-500 ml-2 capitalize">{p.modalidad === 'retiro' ? '🛍️ Llevar' : '🍽️ Mesa'}</span>
                                  {p.mesaZona && pedidosGrupo.length <= 1 && <span className="text-[10px] text-brand-400 ml-1">{p.mesaZona}</span>}
                                </div>
                                <span className="text-sm font-bold text-brand-400">${p.total.toFixed(0)}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Payment buttons — pay all orders in group at once */}
                        {isMesa && pedidosGrupo.length > 1 ? (
                          <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                            <button
                              onClick={async () => {
                                setProcesandoId(pedidosGrupo[0].id);
                                for (const p of pedidosGrupo) {
                                  await marcarPagado(p.id, 'efectivo');
                                }
                                setProcesandoId(null);
                                // Liberar mesa
                                const mesaObj = mesas.find(m => mesa.startsWith(m.nombre));
                                if (mesaObj) await liberarMesa(mesaObj.id);
                                fetchData();
                              }}
                              disabled={procesandoId !== null}
                              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-all"
                            >
                              💵 Todo Efectivo (${totalGrupo.toFixed(0)})
                            </button>
                            <button
                              onClick={async () => {
                                setProcesandoId(pedidosGrupo[0].id);
                                for (const p of pedidosGrupo) {
                                  await marcarPagado(p.id, 'transferencia');
                                }
                                setProcesandoId(null);
                                const mesaObj = mesas.find(m => mesa.startsWith(m.nombre));
                                if (mesaObj) await liberarMesa(mesaObj.id);
                                fetchData();
                              }}
                              disabled={procesandoId !== null}
                              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all"
                            >
                              📱 Todo Transfer (${totalGrupo.toFixed(0)})
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => marcarPagado(pedidosGrupo[0].id, 'efectivo')} disabled={procesandoId === pedidosGrupo[0].id} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-all">💵 Efectivo</button>
                            <button onClick={() => marcarPagado(pedidosGrupo[0].id, 'transferencia')} disabled={procesandoId === pedidosGrupo[0].id} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all">📱 Transfer</button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Pedidos Domicilio */}
          <div>
            <h2 className="text-sm font-bold text-white mb-3">🛵 Pedidos Domicilio ({pedidosDomicilio.length})</h2>
            {pedidosDomicilio.length === 0 ? (
              <div className="rounded-xl bg-[#16161f] border border-white/5 p-6 text-center"><p className="text-gray-500 text-xs">Sin pedidos de domicilio</p></div>
            ) : (
              <div className="space-y-2">
                {pedidosDomicilio.map(p => (
                  <div key={p.id} className="rounded-xl bg-[#16161f] border border-white/5 p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="text-xs font-bold text-white">#{p.numero}</span>
                        <span className="text-[10px] text-gray-500 ml-2">🛵 {p.clienteNombre}</span>
                      </div>
                      <span className="text-sm font-bold text-brand-400">${p.total.toFixed(0)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => marcarPagado(p.id, 'efectivo')} disabled={procesandoId === p.id} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-all">💵 Efectivo</button>
                      <button onClick={() => marcarPagado(p.id, 'transferencia')} disabled={procesandoId === p.id} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all">📱 Transfer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Paid today */}
        {pagadosHoy.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-white mb-3">✅ Cobrados Hoy ({pagadosHoy.length})</h2>
            <div className="rounded-xl bg-[#16161f] border border-white/5 divide-y divide-white/5 max-h-60 overflow-y-auto scrollbar-thin">
              {pagadosHoy.map(p => (
                <div key={p.id} className="px-4 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-white font-medium">#{p.numero}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] border ${p.metodoPago === 'efectivo' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {p.metodoPago === 'efectivo' ? '💵' : '📱'}
                    </span>
                  </div>
                  <span className="text-brand-400 font-medium">${p.total.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
