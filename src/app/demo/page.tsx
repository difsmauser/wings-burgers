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
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://wings-burgers-mocha.vercel.app';

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
          <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-4">🔐 Credenciales de Acceso</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-500 font-medium">Módulo</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Email</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Contraseña</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Ruta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-2 text-white font-medium">👨‍💼 Admin</td>
                  <td className="py-2"><code className="text-brand-400">admin@alaburguer.com</code></td>
                  <td className="py-2"><code className="text-white">Admin123!</code></td>
                  <td className="py-2"><code className="text-brand-400">/admin</code></td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-medium">👨‍🍳 Cocina</td>
                  <td className="py-2"><code className="text-brand-400">cocina@alaburguer.com</code></td>
                  <td className="py-2"><code className="text-white">Cocina123!</code></td>
                  <td className="py-2"><code className="text-brand-400">/pedidos</code></td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-medium">💰 Caja</td>
                  <td className="py-2"><code className="text-brand-400">caja@alaburguer.com</code></td>
                  <td className="py-2"><code className="text-white">Caja123!</code></td>
                  <td className="py-2"><code className="text-brand-400">/caja</code></td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-medium">🛵 Repartidor</td>
                  <td className="py-2"><code className="text-brand-400">repartidor@alaburguer.com</code></td>
                  <td className="py-2"><code className="text-white">Repartidor123!</code></td>
                  <td className="py-2"><code className="text-brand-400">/entregas</code></td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-medium">🧑‍🍳 Mesero</td>
                  <td className="py-2 text-gray-500">Sin login</td>
                  <td className="py-2 text-gray-500">Se identifica por nombre</td>
                  <td className="py-2"><code className="text-brand-400">/mesero</code></td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-medium">🍔 Cliente</td>
                  <td className="py-2 text-gray-500">Sin login</td>
                  <td className="py-2 text-gray-500">Acceso por QR o link</td>
                  <td className="py-2"><code className="text-brand-400">/menu-domicilio</code></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <CopyButton text="admin@alaburguer.com / Admin123!" />
            <span className="text-[10px] text-gray-500">Copiar admin</span>
          </div>
        </div>

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
                  <span className="text-gray-400">Domicilio (link para redes)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu-domicilio</code>
                    <CopyButton text={`${baseUrl}/menu-domicilio`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Mesa 1 — Interior</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu?qr=MESA-1</code>
                    <CopyButton text={`${baseUrl}/menu?qr=MESA-1`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Mesa 2 — Interior</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu?qr=MESA-2</code>
                    <CopyButton text={`${baseUrl}/menu?qr=MESA-2`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Mesa 3 — Interior</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu?qr=MESA-3</code>
                    <CopyButton text={`${baseUrl}/menu?qr=MESA-3`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Mesa 4 — Terraza</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu?qr=MESA-4</code>
                    <CopyButton text={`${baseUrl}/menu?qr=MESA-4`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Mesa 5 — Terraza</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/menu?qr=MESA-5</code>
                    <CopyButton text={`${baseUrl}/menu?qr=MESA-5`} />
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
                    <code className="text-white text-[11px]">admin@alaburguer.com</code>
                    <CopyButton text="admin@alaburguer.com" />
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
                  <span className="text-gray-400">Meseros (CRUD + asignación)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/admin/meseros</code>
                    <CopyButton text={`${baseUrl}/admin/meseros`} />
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
                <h3 className="text-sm font-bold text-white">👨‍🍳 Módulo Cocina</h3>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Requiere login</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Email:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">cocina@alaburguer.com</code>
                    <CopyButton text="cocina@alaburguer.com" />
                  </div>
                </div>
                <div className="p-2 rounded bg-white/[0.02]">
                  <span className="text-gray-500">Contraseña:</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <code className="text-white text-[11px]">Cocina123!</code>
                    <CopyButton text="Cocina123!" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Pedidos (prepara y marca listo)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/pedidos</code>
                    <CopyButton text={`${baseUrl}/pedidos`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Mesero */}
            <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white">🧑‍🍳 Módulo Mesero</h3>
                <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Sin login (nombre)</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-3">El mesero se registra con su nombre. Recibe pedidos listos de cocina, los entrega y cobra.</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Panel del mesero (asignación + cobro)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/mesero</code>
                    <CopyButton text={`${baseUrl}/mesero`} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-400">Captura de pedido (tomar orden)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-brand-400">{baseUrl}/mesero/captura</code>
                    <CopyButton text={`${baseUrl}/mesero/captura`} />
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
                    <code className="text-white text-[11px]">repartidor@alaburguer.com</code>
                    <CopyButton text="repartidor@alaburguer.com" />
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
              <p className="text-[11px] text-gray-400">Escanea QR → Elige modalidad → Pide → Cocina prepara → Mesero toma pedido listo → Mesero entrega a mesa → Mesero cobra (transfer = libera / efectivo = mesa → caja → cambio → libera)</p>
            </div>
            <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <p className="text-xs font-bold text-blue-400 mb-1">🔵 Flujo 2: Mesero toma orden</p>
              <p className="text-[11px] text-gray-400">Mesero captura (/pedidos/captura) → Cocina prepara → Se auto-asigna al mismo mesero → Mesero entrega → Mesero cobra</p>
            </div>
            <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
              <p className="text-xs font-bold text-green-400 mb-1">🟢 Flujo 3: Domicilio (Redes Sociales)</p>
              <p className="text-[11px] text-gray-400">QR desde redes → Solo domicilio → Cocina → Empaqueta → Repartidor → Cliente rastrea GPS</p>
            </div>
          </div>

          {/* State machine diagram */}
          <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Máquina de estados (Local/Retiro):</p>
            <p className="text-[11px] text-gray-300 font-mono">recibido → en_preparacion → empacado → listo_para_servir → servido</p>
            <p className="text-[10px] text-gray-500 mt-1">Cocina: recibido → empacado | Mesero: listo_para_servir → servido + cobro</p>
          </div>
        </div>

        {/* Migración DB */}
        <div className="rounded-xl bg-[#16161f] border border-white/5 p-6">
          <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-4">🗄️ Migración de Base de Datos</h2>
          <p className="text-xs text-gray-400 mb-3">Ejecutar en Supabase SQL Editor para habilitar el módulo de mesero:</p>
          <div className="bg-[#0d0d14] rounded-lg p-3 border border-white/5 font-mono text-xs text-green-400 space-y-1">
            <p>-- Columnas en pedido para asignación de mesero</p>
            <p>ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_id TEXT DEFAULT NULL;</p>
            <p>ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_nombre TEXT DEFAULT NULL;</p>
            <p className="mt-2">-- Tabla de meseros (CRUD desde admin)</p>
            <p>CREATE TABLE IF NOT EXISTS mesero (</p>
            <p>&nbsp;&nbsp;id UUID PRIMARY KEY DEFAULT gen_random_uuid(),</p>
            <p>&nbsp;&nbsp;nombre TEXT NOT NULL,</p>
            <p>&nbsp;&nbsp;telefono TEXT,</p>
            <p>&nbsp;&nbsp;pin TEXT,</p>
            <p>&nbsp;&nbsp;activo BOOLEAN DEFAULT TRUE,</p>
            <p>&nbsp;&nbsp;created_at TIMESTAMPTZ DEFAULT now()</p>
            <p>);</p>
            <p className="mt-2">-- QR codes para mesas (si no existen)</p>
            <p>INSERT INTO qr_mesa (codigo, mesa_zona, activo) VALUES</p>
            <p>&nbsp;&nbsp;(&apos;MESA-1&apos;, &apos;Mesa 1 - Interior&apos;, true),</p>
            <p>&nbsp;&nbsp;(&apos;MESA-2&apos;, &apos;Mesa 2 - Interior&apos;, true),</p>
            <p>&nbsp;&nbsp;(&apos;MESA-3&apos;, &apos;Mesa 3 - Terraza&apos;, true)</p>
            <p>ON CONFLICT (codigo) DO NOTHING;</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <CopyButton text={`-- Constraint de estado actualizado\nALTER TABLE pedido DROP CONSTRAINT IF EXISTS pedido_estado_check;\nALTER TABLE pedido ADD CONSTRAINT pedido_estado_check CHECK (estado IN ('recibido', 'en_preparacion', 'empacado', 'listo_para_servir', 'servido', 'en_camino', 'entregado', 'cancelado'));\n\n-- Columnas mesero\nALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_id TEXT DEFAULT NULL;\nALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_nombre TEXT DEFAULT NULL;\n\n-- Tabla mesero\nCREATE TABLE IF NOT EXISTS mesero (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  nombre TEXT NOT NULL,\n  telefono TEXT,\n  pin TEXT,\n  activo BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\n-- Tabla cuentas bancarias\nCREATE TABLE IF NOT EXISTS cuenta_bancaria (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  banco TEXT NOT NULL,\n  titular TEXT NOT NULL,\n  clabe TEXT NOT NULL,\n  numero_tarjeta TEXT,\n  referencia TEXT,\n  activa BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\n-- Tabla comprobantes de pago\nCREATE TABLE IF NOT EXISTS comprobante_pago (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  pedido_id TEXT NOT NULL,\n  mesa_zona TEXT,\n  total NUMERIC DEFAULT 0,\n  metodo_pago TEXT DEFAULT 'transferencia',\n  comprobante_url TEXT,\n  estado TEXT DEFAULT 'pendiente',\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\n-- QR codes\nINSERT INTO qr_mesa (codigo, mesa_zona, activo) VALUES\n  ('MESA-1', 'Mesa 1 - Interior', true),\n  ('MESA-2', 'Mesa 2 - Interior', true),\n  ('MESA-3', 'Mesa 3 - Terraza', true)\nON CONFLICT (codigo) DO NOTHING;`} />
            <span className="text-[10px] text-gray-500">Copiar SQL completo</span>
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
              'Múltiples pedidos por mesa',
              'Captura de pedido por mesero',
              'Cocina con status en tiempo real',
              'Módulo mesero independiente',
              'Asignación de pedidos a mesero',
              'Flujo de cobro (efectivo/transfer)',
              'Notificación sonora de pedidos',
              'Mapa visual de mesas (drag)',
              'QR imprimible por mesa',
              'Caja independiente con cobros',
              'Cobro grupal por mesa',
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
