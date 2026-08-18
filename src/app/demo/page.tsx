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
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">

        {/* Header */}
        <div className="text-center">
          <img src="/logo.png" alt="A-la Burguer" className="h-20 w-20 mx-auto rounded-full border-2 border-brand-400/30 shadow-lg shadow-brand-500/20 mb-4" />
          <h1 className="text-3xl font-extrabold text-white">A-la Burguer</h1>
          <p className="text-base text-gray-400 mt-2">Sistema Integral de Gestión para Restaurantes</p>
          <div className="mt-3 w-20 h-0.5 bg-gradient-to-r from-fire-500 via-brand-400 to-fire-500 mx-auto rounded-full" />
        </div>

        {/* Descripción del Sistema */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-4">Sobre el Sistema</h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Sistema enterprise completo para la operación de un restaurante de alitas y hamburguesas. Cubre todo el ciclo de operación: desde que el cliente ordena (por QR, mesero o domicilio), la preparación en cocina y bar, hasta el cobro y la entrega. Incluye administración de inventario, gastos, corte de caja, y reportes financieros en tiempo real.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/10 text-center">
              <p className="text-2xl font-black text-brand-400">3</p>
              <p className="text-xs text-gray-400 mt-1">Canales de Venta</p>
              <p className="text-[10px] text-gray-600">QR Mesa / Mesero / Domicilio</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
              <p className="text-2xl font-black text-blue-400">12+</p>
              <p className="text-xs text-gray-400 mt-1">Módulos</p>
              <p className="text-[10px] text-gray-600">Admin, Cocina, Bar, Mesero, etc.</p>
            </div>
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-center">
              <p className="text-2xl font-black text-green-400">40</p>
              <p className="text-xs text-gray-400 mt-1">Productos</p>
              <p className="text-[10px] text-gray-600">Menú real con personalización</p>
            </div>
          </div>
        </div>

        {/* Módulos del Sistema */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-6">Módulos del Sistema</h2>
          <div className="space-y-3">
            <ModuloLink icon="📊" nombre="Admin Dashboard" desc="KPIs, gráficas de ventas, actividad en tiempo real" url={`${baseUrl}/admin`} />
            <ModuloLink icon="📈" nombre="Corte de Caja" desc="Reportes financieros, donas por canal/método, Cocina vs Bar" url={`${baseUrl}/admin/cortes`} />
            <ModuloLink icon="🪑" nombre="Mesas (Admin)" desc="Mapa del local, estados, QR codes" url={`${baseUrl}/admin/mesas`} />
            <ModuloLink icon="🧑‍🍳" nombre="Meseros (Admin)" desc="CRUD con foto y PIN de acceso" url={`${baseUrl}/admin/meseros`} />
            <ModuloLink icon="📦" nombre="Inventario" desc="Stock valorizado, alertas, movimientos" url={`${baseUrl}/admin/inventario`} />
            <ModuloLink icon="💰" nombre="Gastos" desc="Dona por categoría, tendencia mensual, registros" url={`${baseUrl}/admin/gastos`} />
            <ModuloLink icon="🍗" nombre="Productos" desc="Menú con imágenes, precios, personalización" url={`${baseUrl}/admin/productos`} />
            <div className="border-t border-white/5 my-4" />
            <ModuloLink icon="🧑‍🍳" nombre="Panel Mesero" desc="Login con PIN + foto, tomar órdenes, cobrar" url={`${baseUrl}/mesero`} />
            <ModuloLink icon="📝" nombre="Captura Pedido" desc="Orden presencial con selector de mesa" url={`${baseUrl}/mesero/captura`} />
            <ModuloLink icon="🛵" nombre="Domicilio (Mesero)" desc="Captura de pedido WhatsApp + ticket auto" url={`${baseUrl}/mesero/domicilio`} />
            <div className="border-t border-white/5 my-4" />
            <ModuloLink icon="📱" nombre="Menú QR (Cliente)" desc="Cliente escanea QR de mesa y ordena solo" url={`${baseUrl}/menu?qr=MESA-1`} />
            <ModuloLink icon="🛵" nombre="Menú Domicilio" desc="Link público para pedidos a domicilio" url={`${baseUrl}/menu-domicilio`} />
            <ModuloLink icon="🍳" nombre="Cocina" desc="Pantalla de pedidos entrantes para cocina" url={`${baseUrl}/caja`} />
          </div>
        </div>

        {/* Credenciales */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-4">Credenciales de Prueba</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Rol</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Usuario</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Contraseña</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 px-3 text-white font-medium">Admin</td>
                  <td className="py-3 px-3 text-gray-300 font-mono">admin@alaburguer.com</td>
                  <td className="py-3 px-3 text-gray-300 font-mono">Admin123!</td>
                  <td className="py-3 px-3"><code className="text-brand-400">/admin</code></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 text-white font-medium">Mesero</td>
                  <td className="py-3 px-3 text-gray-400">Sin login — PIN</td>
                  <td className="py-3 px-3 text-gray-300 font-mono">1234 / 5678 / 0000</td>
                  <td className="py-3 px-3"><code className="text-brand-400">/mesero</code></td>
                </tr>
                <tr>
                  <td className="py-3 px-3 text-white font-medium">Cliente</td>
                  <td className="py-3 px-3 text-gray-400">Sin login</td>
                  <td className="py-3 px-3 text-gray-400">—</td>
                  <td className="py-3 px-3"><code className="text-brand-400">/menu-domicilio</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-4">Stack Tecnológico</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <TechBadge nombre="Next.js 14" desc="App Router, SSR/SSG" />
            <TechBadge nombre="React 18" desc="Server + Client Components" />
            <TechBadge nombre="TypeScript" desc="Tipado estricto end-to-end" />
            <TechBadge nombre="Tailwind CSS v4" desc="Utility-first, dark theme" />
            <TechBadge nombre="Supabase" desc="PostgreSQL + Auth + Storage + Realtime" />
            <TechBadge nombre="Vercel" desc="Deploy, Edge Functions, CDN" />
            <TechBadge nombre="PWA" desc="Offline-ready, instalable" />
            <TechBadge nombre="Hexagonal Arch" desc="Domain-driven, testable" />
            <TechBadge nombre="WhatsApp API" desc="Tickets automáticos" />
          </div>
        </div>

        {/* Características */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-4">Características Enterprise</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              '3 canales de venta (QR, Mesero, Domicilio)',
              'Dashboard con KPIs y gráficas en tiempo real',
              'Corte de caja con dona por canal y método',
              'Desglose Cocina vs Bar independiente',
              'Inventario con alertas de stock',
              'Gastos con tendencia mensual',
              'Meseros con foto y PIN numérico',
              'Menú digital con personalización por producto',
              'Pedidos a domicilio con ticket WhatsApp',
              'Mapa interactivo de mesas con QR',
              'Notificaciones push (PWA)',
              'Seguridad: rate limiting, auth JWT, roles',
              'Responsive (móvil + escritorio)',
              'Arquitectura hexagonal (testable)',
              'Auto-refresh en tiempo real (30s)',
              'Multi-método de pago (efectivo/transferencia)',
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                <span className="text-xs text-gray-300">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Valuación */}
        <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a24] border border-brand-500/20 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-2">Valuación del Sistema</h2>
          <p className="text-xs text-gray-400 mb-6">Precio de venta como producto terminado para un solo cliente (licencia única)</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Desarrollo</p>
              <p className="text-xs text-gray-400 mt-2">+500 horas de desarrollo</p>
              <p className="text-xs text-gray-400">12+ módulos funcionales</p>
              <p className="text-xs text-gray-400">40 productos reales</p>
              <p className="text-xs text-gray-400">Arquitectura enterprise</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Infraestructura</p>
              <p className="text-xs text-gray-400 mt-2">Supabase (DB + Auth + Storage)</p>
              <p className="text-xs text-gray-400">Vercel (Hosting + CDN)</p>
              <p className="text-xs text-gray-400">Dominio personalizable</p>
              <p className="text-xs text-gray-400">SSL + PWA incluido</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Soporte</p>
              <p className="text-xs text-gray-400 mt-2">Código fuente completo</p>
              <p className="text-xs text-gray-400">Documentación técnica</p>
              <p className="text-xs text-gray-400">Personalización de marca</p>
              <p className="text-xs text-gray-400">Setup inicial incluido</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-brand-500/5 border border-brand-500/20 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Precio Licencia Única (1 restaurante)</p>
            <p className="text-4xl font-black text-brand-400">$85,000 — $120,000 MXN</p>
            <p className="text-xs text-gray-400 mt-2">Equivalente: $5,000 — $7,000 USD</p>
            <p className="text-[10px] text-gray-600 mt-3">Incluye: código fuente, setup, 1 mes de soporte, deploy en producción</p>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Modelo SaaS (mensualidad)</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">$3,500 — $5,000 MXN/mes</p>
                <p className="text-[10px] text-gray-500">Incluye hosting, soporte, actualizaciones</p>
              </div>
              <span className="px-3 py-1 rounded-lg text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">Alternativa</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-600">Sistema desarrollado con arquitectura enterprise.</p>
          <p className="text-[10px] text-gray-700 mt-1">Next.js + Supabase + Vercel — {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}

function ModuloLink({ icon, nombre, desc, url }: { icon: string; nombre: string; desc: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all group">
      <span className="text-xl w-8 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">{nombre}</p>
        <p className="text-[11px] text-gray-500 truncate">{desc}</p>
      </div>
      <svg className="w-4 h-4 text-gray-600 group-hover:text-brand-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </a>
  );
}

function TechBadge({ nombre, desc }: { nombre: string; desc: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-brand-400/20 transition-all">
      <p className="text-xs font-semibold text-white">{nombre}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
    </div>
  );
}
