'use client';

import { useState } from 'react';

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 border border-white/5'}`}>
      {copied ? '✓' : 'Copiar'}
    </button>
  );
}

export default function DemoPage() {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://wings-burgers-mocha.vercel.app';

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-5 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">

        {/* Hero */}
        <div className="text-center py-8">
          <img src="/logo.png" alt="A-la Burguer" className="h-16 w-16 mx-auto rounded-2xl border border-brand-400/20 shadow-lg shadow-brand-500/20 mb-5" />
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">A-la Burguer</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">Sistema Integral de Gestión para Restaurantes — Enterprise Edition</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20">v1.0</span>
            <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">Production Ready</span>
            <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">PWA</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* DESCRIPCIÓN DEL SISTEMA */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-4">Descripción del Sistema</h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Sistema enterprise de gestión integral diseñado específicamente para restaurantes de alitas, hamburguesas y bar. Digitaliza la operación completa del negocio: desde que el cliente ordena hasta que paga, pasando por cocina, bar y servicio de meseros.
          </p>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Opera con <span className="text-brand-400 font-medium">3 canales de venta independientes</span>: menú QR en mesa (el cliente escanea y ordena solo), captura por mesero (presencial o vía WhatsApp), y pedidos a domicilio con ticket automático por WhatsApp. Los tres canales conviven sin mezclarse, cada uno con su flujo optimizado.
          </p>
          <p className="text-sm text-gray-300 leading-relaxed mb-6">
            El panel administrativo incluye dashboard con KPIs en tiempo real, corte de caja con desglose por canal y método de pago, inventario con alertas de stock, control de gastos con tendencias, y gestión de personal (meseros con PIN + foto, repartidores). Todo accesible desde cualquier dispositivo — se instala como app nativa (PWA).
          </p>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <HighlightCard emoji="📱" valor="3" label="Canales de Venta" desc="QR / Mesero / Domicilio" />
            <HighlightCard emoji="🧩" valor="12+" label="Módulos" desc="Admin, Cocina, Bar, Mesero..." />
            <HighlightCard emoji="🍗" valor="40" label="Productos" desc="Menú real con personalización" />
            <HighlightCard emoji="⚡" valor="30s" label="Auto-Refresh" desc="Datos en tiempo real" />
          </div>

          {/* Features grid */}
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-3">Funcionalidades Principales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                'Dashboard con gráficas animadas de ventas por hora',
                'Corte de caja: dona por canal, método de pago, Cocina vs Bar',
                'Menú QR: cliente escanea y ordena sin mesero',
                'Captura mesero: selector inteligente de mesas disponibles',
                'Pedidos domicilio con ticket WhatsApp automático',
                'Inventario con alertas de stock bajo/crítico',
                'Gastos con dona por categoría y tendencia mensual',
                'Meseros con foto y login por PIN numérico',
                'Mapa interactivo de mesas con estados',
                'Multi-método de pago (efectivo / transferencia)',
                'PWA instalable — funciona offline',
                'Seguridad: JWT, roles, rate limiting, validación',
                'Arquitectura hexagonal (clean code, testable)',
                'Responsive design (móvil + tablet + escritorio)',
                'Carrito con TTL de 12h (auto-limpieza)',
                'Sesiones aisladas — múltiples clientes simultáneos',
              ].map((feat, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-gray-400">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* MÓDULO: ADMIN PANEL */}
        {/* ═══════════════════════════════════════════════ */}
        <ModuloSection
          color="brand"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          titulo="Panel de Administración"
          descripcion="Dashboard enterprise con KPIs, gráficas en tiempo real, corte de caja, inventario, gastos, productos y meseros."
          credenciales={{ usuario: 'admin@alaburguer.com', password: 'Admin123!', nota: 'Acceso total al sistema' }}
          links={[
            { nombre: 'Dashboard', desc: 'KPIs, ventas por hora, actividad reciente', url: `${base}/admin` },
            { nombre: 'Corte de Caja', desc: 'Donas por canal/método, Cocina vs Bar, tabla de pedidos', url: `${base}/admin/cortes` },
            { nombre: 'Mesas', desc: 'Mapa del local, estados, QR codes', url: `${base}/admin/mesas` },
            { nombre: 'Meseros', desc: 'CRUD con foto y PIN de 4 dígitos', url: `${base}/admin/meseros` },
            { nombre: 'Inventario', desc: 'Stock valorizado, alertas, timeline movimientos', url: `${base}/admin/inventario` },
            { nombre: 'Gastos', desc: 'Dona por categoría, tendencia mensual', url: `${base}/admin/gastos` },
            { nombre: 'Productos', desc: 'Menú completo con imágenes y personalización', url: `${base}/admin/productos` },
            { nombre: 'Repartidores', desc: 'CRUD de repartidores activos', url: `${base}/admin/repartidores` },
          ]}
          baseUrl={base}
        />

        {/* ═══════════════════════════════════════════════ */}
        {/* MÓDULO: MESERO */}
        {/* ═══════════════════════════════════════════════ */}
        <ModuloSection
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          titulo="Módulo Mesero"
          descripcion="Login con foto y PIN numérico. Captura de pedidos presenciales y por WhatsApp. Selector de mesa inteligente."
          credenciales={{ usuario: 'Selecciona perfil + PIN', password: '1234 (Carlos) / 5678 (María) / 0000 (Pedro)', nota: 'Sin email — acceso por PIN' }}
          links={[
            { nombre: 'Panel Mesero', desc: 'Login PIN + foto, ver pedidos listos, cobrar', url: `${base}/mesero` },
            { nombre: 'Captura Presencial', desc: 'Tomar orden en mesa con selector inteligente', url: `${base}/mesero/captura` },
            { nombre: 'Pedido Domicilio', desc: 'Captura de pedido WhatsApp + ticket automático', url: `${base}/mesero/domicilio` },
          ]}
          baseUrl={base}
        />

        {/* ═══════════════════════════════════════════════ */}
        {/* MÓDULO: CLIENTE QR */}
        {/* ═══════════════════════════════════════════════ */}
        <ModuloSection
          color="emerald"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>}
          titulo="Menú QR — Cliente en Mesa"
          descripcion="El cliente escanea el QR de su mesa y ordena directo sin intervención del mesero. Cada mesa tiene su QR único."
          credenciales={{ usuario: 'Sin login', password: 'Acceso público via QR', nota: 'Cada QR identifica la mesa automáticamente' }}
          links={[
            { nombre: 'Mesa 1 (Interior)', desc: 'Simula escanear QR de Mesa 1', url: `${base}/menu?qr=MESA-1` },
            { nombre: 'Mesa 2 (Interior)', desc: 'Simula escanear QR de Mesa 2', url: `${base}/menu?qr=MESA-2` },
            { nombre: 'Mesa 3 (Terraza)', desc: 'Simula escanear QR de Mesa 3', url: `${base}/menu?qr=MESA-3` },
            { nombre: 'Mesa 4 (Terraza)', desc: 'Simula escanear QR de Mesa 4', url: `${base}/menu?qr=MESA-4` },
            { nombre: 'Mesa 5 (Bar)', desc: 'Simula escanear QR de Mesa 5', url: `${base}/menu?qr=MESA-5` },
          ]}
          baseUrl={base}
        />

        {/* ═══════════════════════════════════════════════ */}
        {/* MÓDULO: DOMICILIO */}
        {/* ═══════════════════════════════════════════════ */}
        <ModuloSection
          color="green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>}
          titulo="Menú Domicilio — Link Público"
          descripcion="Link único que se comparte en redes sociales y WhatsApp. Cada cliente en su celular tiene su propio carrito aislado."
          credenciales={{ usuario: 'Sin login', password: 'Link público compartible', nota: 'Soporta múltiples clientes simultáneos' }}
          links={[
            { nombre: 'Menú Domicilio', desc: 'Link público para pedidos a domicilio', url: `${base}/menu-domicilio` },
          ]}
          baseUrl={base}
        />

        {/* ═══════════════════════════════════════════════ */}
        {/* MÓDULO: COCINA / CAJA */}
        {/* ═══════════════════════════════════════════════ */}
        <ModuloSection
          color="orange"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>}
          titulo="Cocina / Caja"
          descripcion="Pantalla de pedidos entrantes para la cocina. Vista en tiempo real de órdenes por preparar."
          credenciales={{ usuario: 'admin@alaburguer.com', password: 'Admin123!', nota: 'Mismo acceso que admin' }}
          links={[
            { nombre: 'Pantalla Cocina', desc: 'Pedidos entrantes en tiempo real', url: `${base}/caja` },
          ]}
          baseUrl={base}
        />

        {/* ═══════════════════════════════════════════════ */}
        {/* TECH STACK */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-5">Stack Tecnológico</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { name: 'Next.js 14', desc: 'App Router, SSR' },
              { name: 'React 18', desc: 'Server + Client' },
              { name: 'TypeScript', desc: 'End-to-end types' },
              { name: 'Tailwind CSS v4', desc: 'Dark theme system' },
              { name: 'Supabase', desc: 'DB + Auth + Storage' },
              { name: 'Vercel', desc: 'Deploy + CDN' },
              { name: 'PWA', desc: 'Instalable, offline' },
              { name: 'Hexagonal Arch', desc: 'Clean code, testable' },
            ].map(t => (
              <div key={t.name} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-xs font-semibold text-white">{t.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* VALUACIÓN */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="rounded-2xl bg-gradient-to-br from-[#12121a] to-[#1a1a24] border border-brand-500/20 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-2">Valuación del Sistema</h2>
          <p className="text-xs text-gray-500 mb-6">Precio como producto terminado (licencia única, 1 restaurante)</p>
          <div className="p-6 rounded-2xl bg-brand-500/5 border border-brand-500/20 text-center mb-5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Licencia Única</p>
            <p className="text-3xl sm:text-4xl font-black text-brand-400">$85,000 — $120,000 MXN</p>
            <p className="text-xs text-gray-400 mt-1">≈ $5,000 — $7,000 USD</p>
            <p className="text-[10px] text-gray-600 mt-2">Incluye: código fuente, setup, deploy, 1 mes soporte</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Modelo SaaS (alternativa)</p>
                <p className="text-sm font-bold text-white mt-1">$3,500 — $5,000 MXN/mes</p>
                <p className="text-[10px] text-gray-500">Hosting + soporte + actualizaciones incluidas</p>
              </div>
              <span className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">Mensual</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-gray-700">Next.js + Supabase + Vercel — {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente de sección de módulo
// ═══════════════════════════════════════════════════════════════════════════════

function HighlightCard({ emoji, valor, label, desc }: { emoji: string; valor: string; label: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
      <span className="text-lg">{emoji}</span>
      <p className="text-xl font-black text-white mt-1">{valor}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
      <p className="text-[9px] text-gray-600">{desc}</p>
    </div>
  );
}

function ModuloSection({ color, icon, titulo, descripcion, credenciales, links, baseUrl }: {
  color: string;
  icon: React.ReactNode;
  titulo: string;
  descripcion: string;
  credenciales: { usuario: string; password: string; nota: string };
  links: Array<{ nombre: string; desc: string; url: string }>;
  baseUrl: string;
}) {
  const colorMap: Record<string, { border: string; iconBg: string; iconText: string; badge: string }> = {
    brand: { border: 'border-brand-500/20', iconBg: 'bg-brand-500/10', iconText: 'text-brand-400', badge: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
    blue: { border: 'border-blue-500/20', iconBg: 'bg-blue-500/10', iconText: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    emerald: { border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    green: { border: 'border-green-500/20', iconBg: 'bg-green-500/10', iconText: 'text-green-400', badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
    orange: { border: 'border-orange-500/20', iconBg: 'bg-orange-500/10', iconText: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  };
  const s = colorMap[color] || colorMap.brand;

  return (
    <div className={`rounded-2xl bg-[#12121a] border ${s.border} overflow-hidden`}>
      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/[0.04]">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl ${s.iconBg} flex items-center justify-center ${s.iconText} flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">{titulo}</h2>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{descripcion}</p>
          </div>
        </div>
      </div>

      {/* Credenciales */}
      <div className="px-6 py-4 bg-white/[0.01] border-b border-white/[0.04]">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Credenciales</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-[9px] text-gray-600 uppercase">Usuario</p>
            <p className="text-xs text-white font-mono mt-0.5">{credenciales.usuario}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-600 uppercase">Contraseña / PIN</p>
            <p className="text-xs text-white font-mono mt-0.5">{credenciales.password}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-600 uppercase">Nota</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{credenciales.nota}</p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="p-4 space-y-1">
        {links.map((link) => (
          <div key={link.url} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">{link.nombre}</p>
              <p className="text-[10px] text-gray-500 truncate">{link.desc}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyBtn text={link.url} />
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
