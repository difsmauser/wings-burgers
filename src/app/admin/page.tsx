'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalProductos: number;
  pedidosHoy: number;
  ventasHoy: number;
  gastosHoy: number;
}

function StatCard({ label, value, icon, color, href }: { label: string; value: string; icon: string; color: string; href: string }) {
  return (
    <Link href={href} className="group">
      <div className={`relative overflow-hidden rounded-2xl border border-white/5 bg-[#16161f] p-5 transition-all duration-300 hover:border-${color}-500/30 hover:shadow-lg hover:shadow-${color}-500/5`}>
        {/* Gradient glow */}
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-${color}-500/10 transition-colors duration-500`} />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">{icon}</span>
            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white mb-1">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProductos: 0,
    pedidosHoy: 0,
    ventasHoy: 0,
    gastosHoy: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch product count
        const prodRes = await fetch('/api/productos');
        const prodData = await prodRes.json();
        const totalProductos = prodData?.data?.length ?? 0;

        setStats({
          totalProductos,
          pedidosHoy: 0,
          ventasHoy: 0,
          gastosHoy: 0,
        });
      } catch (err) {
        // Silent fail - show zeros
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de tu negocio hoy</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Productos Activos"
          value={loading ? '...' : String(stats.totalProductos)}
          icon="🍗"
          color="brand"
          href="/admin/productos"
        />
        <StatCard
          label="Pedidos Hoy"
          value={loading ? '...' : String(stats.pedidosHoy)}
          icon="📋"
          color="blue"
          href="/admin/cortes"
        />
        <StatCard
          label="Ventas Hoy"
          value={loading ? '...' : `$${stats.ventasHoy.toLocaleString()}`}
          icon="💰"
          color="green"
          href="/admin/cortes"
        />
        <StatCard
          label="Gastos Hoy"
          value={loading ? '...' : `$${stats.gastosHoy.toLocaleString()}`}
          icon="📉"
          color="red"
          href="/admin/gastos"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/admin/productos"
            className="flex items-center gap-3 p-4 rounded-xl bg-[#16161f] border border-white/5 hover:border-brand-500/30 transition-all duration-200 group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform duration-200">🍗</span>
            <div>
              <p className="text-sm font-medium text-white">Gestionar Productos</p>
              <p className="text-xs text-gray-500">Crear, editar y administrar</p>
            </div>
          </Link>
          <Link
            href="/admin/gastos"
            className="flex items-center gap-3 p-4 rounded-xl bg-[#16161f] border border-white/5 hover:border-brand-500/30 transition-all duration-200 group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform duration-200">💸</span>
            <div>
              <p className="text-sm font-medium text-white">Registrar Gasto</p>
              <p className="text-xs text-gray-500">Insumos, servicios, nómina</p>
            </div>
          </Link>
          <Link
            href="/admin/cortes"
            className="flex items-center gap-3 p-4 rounded-xl bg-[#16161f] border border-white/5 hover:border-brand-500/30 transition-all duration-200 group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform duration-200">📊</span>
            <div>
              <p className="text-sm font-medium text-white">Generar Corte</p>
              <p className="text-xs text-gray-500">Diario, semanal, mensual</p>
            </div>
          </Link>
        </div>
      </div>

      {/* System Info */}
      <div className="rounded-xl bg-[#16161f] border border-white/5 p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sistema</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Versión</p>
            <p className="text-sm font-medium text-white">1.0.0</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Base de datos</p>
            <p className="text-sm font-medium text-green-400">● Conectada</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Realtime</p>
            <p className="text-sm font-medium text-green-400">● Activo</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">PWA</p>
            <p className="text-sm font-medium text-green-400">● Configurada</p>
          </div>
        </div>
      </div>
    </div>
  );
}
