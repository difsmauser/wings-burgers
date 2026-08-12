'use client';

import { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className={`px-2 py-0.5 rounded text-[10px] transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}>
      {copied ? '✓ Copiado' : 'Copiar'}
    </button>
  );
}

export default function DemoPage() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="text-center">
          <img src="/logo.png" alt="A-la Burguer" className="h-20 w-20 mx-auto rounded-full border-2 border-brand-400/30 shadow-lg shadow-brand-500/20 mb-4" />
          <h1 className="text-3xl font-extrabold text-white">A-la Burguer</h1>
          <p className="text-sm text-gray-400 mt-2">Sistema de Gestión para Restaurantes</p>
          <div className="mt-3 w-20 h-0.5 bg-gradient-to-r from-fire-500 via-brand-400 to-fire-500 mx-auto rounded-full" />
        </div>

        {/* Módulos */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-6">
          <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-4">📱 Módulos del Sistema</h2>
          
          <div className="space-y-4">
            {/* Cliente */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">🍔 Módulo Cliente (Menú Digital)</h3>
                <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Sin login</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Menú (domicilio desde redes)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu</code>
                    <CopyButton text={`${baseUrl}/menu`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Menú (QR Mesa 1)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu?qr=MESA-1</code>
                    <CopyButton text={`${baseUrl}/menu?qr=MESA-1`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Menú (QR Mesa 2)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu?qr=MESA-2</code>
                    <CopyButton text={`${baseUrl}/menu?qr=MESA-2`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Menú (QR Mesa 3)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu?qr=MESA-3</code>
                    <CopyButton text={`${baseUrl}/menu?qr=MESA-3`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Login */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">🔐 Login</h3>
                <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">Acceso</span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Página de inicio de sesión</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/login</code>
                    <CopyButton text={`${baseUrl}/login`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Admin */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">👨‍💼 Módulo Admin</h3>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Requiere login</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Email:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">admin@wingsandburgers.com</code>
                    <CopyButton text="admin@wingsandburgers.com" />
                  </div>
                </div>
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Contraseña:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">Admin123!</code>
                    <CopyButton text="Admin123!" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Dashboard</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/admin</code>
                    <CopyButton text={`${baseUrl}/admin`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Productos (CRUD + imágenes)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/admin/productos</code>
                    <CopyButton text={`${baseUrl}/admin/productos`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Mesas (mapa + QR + drag)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/admin/mesas</code>
                    <CopyButton text={`${baseUrl}/admin/mesas`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Inventario (stock + alertas)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/admin/inventario</code>
                    <CopyButton text={`${baseUrl}/admin/inventario`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Gastos (registro + filtros)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/admin/gastos</code>
                    <CopyButton text={`${baseUrl}/admin/gastos`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Cortes (reportes financieros)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/admin/cortes</code>
                    <CopyButton text={`${baseUrl}/admin/cortes`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Categorías</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/admin/categorias</code>
                    <CopyButton text={`${baseUrl}/admin/categorias`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Caja */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">💰 Módulo Caja (Independiente)</h3>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Requiere login</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Email:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">caja@alaburguer.com</code>
                    <CopyButton text="caja@alaburguer.com" />
                  </div>
                </div>
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Contraseña:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">Caja123!</code>
                    <CopyButton text="Caja123!" />
                  </div>
                </div>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Cobros, mapa de mesas, liberar mesas</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/caja</code>
                    <CopyButton text={`${baseUrl}/caja`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Cocina */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">👨‍🍳 Módulo Cocina / Mesero</h3>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Requiere login</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Email:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">vendedor@wingsandburgers.com</code>
                    <CopyButton text="vendedor@wingsandburgers.com" />
                  </div>
                </div>
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Contraseña:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">Vendedor123!</code>
                    <CopyButton text="Vendedor123!" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Pedidos (status en tiempo real)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/pedidos</code>
                    <CopyButton text={`${baseUrl}/pedidos`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Captura de pedido (mesero)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/pedidos/captura</code>
                    <CopyButton text={`${baseUrl}/pedidos/captura`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Repartidor */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">🛵 Módulo Repartidor</h3>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Requiere login</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Email:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">repartidor@wingsandburgers.com</code>
                    <CopyButton text="repartidor@wingsandburgers.com" />
                  </div>
                </div>
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Contraseña:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">Repartidor123!</code>
                    <CopyButton text="Repartidor123!" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Entregas pendientes + GPS</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/entregas</code>
                    <CopyButton text={`${baseUrl}/entregas`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Mapa de ruta</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/mapa</code>
                    <CopyButton text={`${baseUrl}/mapa`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flujos */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-6">
          <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-4">🔄 3 Flujos de Pedido</h2>
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
              <p className="text-xs font-bold text-yellow-400 mb-1">🟡 Flujo 1: Cliente en Mesa (QR)</p>
              <p className="text-[11px] text-gray-400">Escanea QR → Elige &quot;Comer aquí&quot; o &quot;Para llevar&quot; → Pide → Cocina prepara → Caja cobra → Mesa libre</p>
            </div>
            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <p className="text-xs font-bold text-blue-400 mb-1">🔵 Flujo 2: Mesero toma orden</p>
              <p className="text-[11px] text-gray-400">Mesero captura → Cocina prepara → Caja cobra (sin WhatsApp)</p>
            </div>
            <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
              <p className="text-xs font-bold text-green-400 mb-1">🟢 Flujo 3: Domicilio (Redes Sociales)</p>
              <p className="text-[11px] text-gray-400">QR desde redes → Solo domicilio → Cocina → Empaqueta → Repartidor → Cliente rastrea GPS</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-6">
          <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-4">⚡ Funcionalidades</h2>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {[
              'Menú digital con imágenes',
              'Pedido por QR en mesa',
              'Pedido a domicilio desde redes',
              'Captura de pedido por mesero',
              'Cocina con status en tiempo real',
              'Notificación sonora de pedidos',
              'Mapa visual de mesas (drag)',
              'QR imprimible por mesa',
              'Caja independiente con cobros',
              'Efectivo y transferencia',
              'Inventario con alertas',
              'Gastos por categoría',
              'Cortes financieros',
              'Ventas por canal (QR/Mesero/Domicilio)',
              'Rastreo en tiempo real',
              'WhatsApp tickets',
              'PWA instalable (como app)',
              'Diseño dark premium',
              'Costo operación: $0/mes',
              'Sin comisiones',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tech */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-6">
          <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-4">🛠️ Tecnología</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10px]">
            {[
              { name: 'Next.js 14', desc: 'Framework' },
              { name: 'TypeScript', desc: 'Lenguaje' },
              { name: 'Supabase', desc: 'Base de datos' },
              { name: 'Tailwind', desc: 'Estilos' },
              { name: 'Vercel', desc: 'Hosting ($0)' },
              { name: 'WhatsApp API', desc: 'Mensajería' },
              { name: 'PWA', desc: 'App móvil' },
              { name: 'Realtime', desc: 'Notificaciones' },
            ].map((t, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <p className="text-white font-medium">{t.name}</p>
                <p className="text-gray-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-600 pt-4">
          <p>A-la Burguer — Sistema de Gestión v1.0</p>
          <p className="mt-1">Costo mensual: <span className="text-brand-400 font-bold">$0 USD</span> (Supabase Free + Vercel Hobby)</p>
        </div>
      </div>
    </div>
  );
}
