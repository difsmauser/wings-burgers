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
        <div className="rounded-2xl bg-[#12121a] border border-white/[0.06] p-6 sm:p-8 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">¿Qué es este sistema?</h2>
            <p className="text-sm text-gray-300 leading-relaxed mb-3">
              Es un sistema <span className="text-brand-400 font-medium">completo de gestión</span> diseñado para restaurantes que necesitan digitalizar toda su operación. Controla desde el momento en que un cliente decide pedir, hasta que paga y se va. Cocina, bar, meseros, repartidores, caja — todo conectado en tiempo real.
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              Funciona como app en el celular del cliente (no necesita descargar nada), en la tablet de la cocina, y en la computadora del administrador. Se instala como PWA (Progressive Web App) — se ve y funciona como app nativa.
            </p>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HighlightCard emoji="📱" valor="4" label="Canales de Venta" desc="QR Mesa / Mesero / Para Llevar / Domicilio" />
            <HighlightCard emoji="🧩" valor="12+" label="Módulos" desc="Admin, Cocina, Bar, Mesero, Caja..." />
            <HighlightCard emoji="🍗" valor="40+" label="Productos" desc="Con fotos y personalización" />
            <HighlightCard emoji="⚡" valor="Tiempo Real" label="Auto-Refresh" desc="Pedidos, cocina, pagos" />
          </div>

          {/* 4 CANALES DE VENTA */}
          <div>
            <h3 className="text-base font-bold text-white mb-1">4 Canales de Venta Independientes</h3>
            <p className="text-xs text-gray-500 mb-4">Cada canal tiene su propio flujo optimizado. No se mezclan entre sí.</p>

            <div className="space-y-3">
              <CanalDesc
                color="yellow" emoji="📱" titulo="QR en Mesa"
                desc="El cliente escanea el código QR pegado en su mesa. Ve el menú completo con fotos, agrega productos, y confirma su pedido. El pedido llega directo a cocina sin necesidad de mesero. Cuando está listo, el mesero sirve y después cobra."
                flujo="Escanea QR → Ve menú → Agrega productos → Confirma → Cocina prepara → Mesero sirve → Cliente paga"
              />
              <CanalDesc
                color="blue" emoji="🧑‍🍳" titulo="Mesero (Presencial o WhatsApp)"
                desc="El mesero toma la orden directamente en la mesa del cliente o recibe el pedido por WhatsApp. Tiene un selector inteligente que solo muestra mesas disponibles. Puede agregar instrucciones especiales por producto (sin cebolla, extra picante, etc.)."
                flujo="Mesero toma orden → Selecciona mesa → Envía a cocina → Cocina prepara → Mesero sirve → Cobra"
              />
              <CanalDesc
                color="amber" emoji="🛍️" titulo="Para Llevar (QR en Mostrador)"
                desc="Un QR genérico pegado en el mostrador o barra. El cliente que no tiene mesa escanea, arma su pedido con su nombre y WhatsApp. Va a cocina, se prepara, y cuando está listo se le llama. Paga en caja y se le entrega su pedido."
                flujo="Escanea QR mostrador → Agrega productos → Confirma → Cocina prepara → Se llama al cliente → Paga en caja → Se entrega"
              />
              <CanalDesc
                color="green" emoji="🛵" titulo="Domicilio"
                desc="Link único que se comparte en redes sociales, WhatsApp, o grupos. El cliente abre desde su celular, arma su pedido, y paga antes de que se envíe a cocina. Si paga con transferencia, caja valida y luego va a cocina. Si paga en efectivo, dice con qué billete paga para que el repartidor lleve cambio."
                flujo="Abre link → Agrega productos → Paga (transfer o efectivo) → Cocina prepara → Repartidor entrega → Ticket WhatsApp"
              />
            </div>
          </div>

          {/* FLUJO DE PAGO */}
          <div>
            <h3 className="text-base font-bold text-white mb-1">Sistema de Pago Inteligente</h3>
            <p className="text-xs text-gray-500 mb-4">El pago se adapta automáticamente al canal. No se muestra hasta que es el momento correcto.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <p className="text-xs font-bold text-blue-400 mb-2">💳 Transferencia</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">Se muestran los datos bancarios (Titular, CLABE, Tarjeta) con botón de <span className="text-white">Copiar</span> para que el cliente pegue directo en su banca móvil. Sube foto del comprobante y caja valida en tiempo real.</p>
              </div>
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                <p className="text-xs font-bold text-green-400 mb-2">💵 Efectivo</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">En mesa: el mesero cobra. Para llevar: paga en caja. Domicilio: el cliente indica con qué billete paga ($100, $200, $500) y el repartidor lleva el cambio exacto.</p>
              </div>
            </div>
          </div>

          {/* MÓDULOS DEL ADMIN */}
          <div>
            <h3 className="text-base font-bold text-white mb-1">Panel de Administración</h3>
            <p className="text-xs text-gray-500 mb-4">El dueño del negocio controla todo desde aquí. Accesible desde celular o computadora.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AdminModuleDesc emoji="📊" titulo="Dashboard" desc="Ventas del día en tiempo real, gráfica de ventas por hora, ticket promedio, utilidad neta, actividad reciente con badges de color por canal, top productos vendidos." />
              <AdminModuleDesc emoji="📈" titulo="Corte de Caja" desc="Reporte financiero con filtro por período (hoy/semana/mes). Dona por método de pago, dona por canal de venta, desglose Cocina vs Bar, tabla completa de pedidos." />
              <AdminModuleDesc emoji="📦" titulo="Inventario" desc="Control de stock con alertas automáticas. Cuando un insumo baja del nivel mínimo, se marca como crítico. Historial de entradas y salidas con timeline visual." />
              <AdminModuleDesc emoji="💰" titulo="Gastos" desc="Registro de gastos por categoría (insumos, nómina, servicios, etc.). Gráfica de dona por categoría, tendencia mensual con línea de 6 meses, promedio diario." />
              <AdminModuleDesc emoji="🧑‍🍳" titulo="Meseros" desc="Alta de meseros con foto y PIN numérico de 4 dígitos. El mesero inicia sesión seleccionando su foto e ingresando su PIN — sin emails ni contraseñas." />
              <AdminModuleDesc emoji="🪑" titulo="Mesas" desc="Mapa visual del local con posición de cada mesa. Estado en tiempo real (disponible, ocupada, pendiente cobro). Generación automática de QR por mesa." />
              <AdminModuleDesc emoji="🍗" titulo="Productos" desc="Menú completo con fotos, descripciones, precios y opciones de personalización por producto. Activar/desactivar productos sin eliminarlos." />
              <AdminModuleDesc emoji="🛵" titulo="Repartidores" desc="Alta de repartidores con nombre, teléfono y vehículo. Se asignan a pedidos de domicilio para la entrega." />
            </div>
          </div>

          {/* SEGURIDAD Y TÉCNICO */}
          <div>
            <h3 className="text-base font-bold text-white mb-1">Seguridad y Arquitectura</h3>
            <p className="text-xs text-gray-500 mb-4">Construido con estándares enterprise de seguridad y código limpio.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {[
                'Autenticación JWT con roles (admin, caja, vendedor)',
                'Rate limiting — protección contra abuso de APIs',
                'Validación de datos en servidor (no confía en el cliente)',
                'Sesiones aisladas — 10 clientes simultáneos sin conflicto',
                'Carrito con expiración automática de 12 horas',
                'Arquitectura hexagonal (dominio puro, adaptadores, puertos)',
                'TypeScript estricto end-to-end (frontend + backend)',
                'Base de datos PostgreSQL (Supabase) con RLS',
                'Storage para imágenes y comprobantes (Supabase Storage)',
                'Deploy automático en Vercel con CDN global',
                'PWA: se instala como app, funciona sin conexión',
                'Responsive: celular, tablet y escritorio',
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
        {/* MÓDULO: PARA LLEVAR */}
        {/* ═══════════════════════════════════════════════ */}
        <ModuloSection
          color="amber"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
          titulo="QR Para Llevar — Sin Mesero"
          descripcion="QR genérico en mostrador. El cliente escanea, arma su pedido, pone nombre y WhatsApp. Va a cocina, se le avisa cuando está listo y paga en caja."
          credenciales={{ usuario: 'Sin login', password: 'QR público en mostrador', nota: 'Múltiples clientes simultáneos, cada uno con su carrito' }}
          links={[
            { nombre: 'Menú Para Llevar', desc: 'Link/QR para pedidos para llevar sin mesero', url: `${base}/para-llevar` },
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

        {/* Valuación oculta por el momento */}

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

function CanalDesc({ color, emoji, titulo, desc, flujo }: { color: string; emoji: string; titulo: string; desc: string; flujo: string }) {
  const borderColors: Record<string, string> = {
    yellow: 'border-yellow-500/20', blue: 'border-blue-500/20', amber: 'border-amber-500/20', green: 'border-green-500/20',
  };
  const textColors: Record<string, string> = {
    yellow: 'text-yellow-400', blue: 'text-blue-400', amber: 'text-amber-400', green: 'text-green-400',
  };
  return (
    <div className={`p-4 rounded-xl bg-white/[0.01] border ${borderColors[color] || 'border-white/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{emoji}</span>
        <h4 className={`text-sm font-bold ${textColors[color] || 'text-white'}`}>{titulo}</h4>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-3">{desc}</p>
      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
        <p className="text-[10px] text-gray-500"><span className="text-gray-400 font-medium">Flujo:</span> {flujo}</p>
      </div>
    </div>
  );
}

function AdminModuleDesc({ emoji, titulo, desc }: { emoji: string; titulo: string; desc: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{emoji}</span>
        <h4 className="text-xs font-bold text-white">{titulo}</h4>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
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
    amber: { border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconText: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
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
