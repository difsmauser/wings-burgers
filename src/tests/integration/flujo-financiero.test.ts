/**
 * Integration Test: Flujo Financiero
 * registrar gastos → generar corte → verificar cálculos
 *
 * Valida que el sistema financiero calcula correctamente:
 * - Total de ventas (suma de pedidos completados)
 * - Total de gastos (suma de gastos registrados)
 * - Ganancia neta (ventas - gastos)
 * - Ticket promedio (ventas / número de pedidos)
 * - Top 5 productos más vendidos
 *
 * Requirements: 5.1, 13.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { IPedidoRepository, IGastoRepository } from '@/domain/ports/repositories';
import type { Pedido, Gasto, EstadoPedido } from '@/shared/domain-types';
import type { FiltroGasto, Paginacion, PedidoPaginado, ResumenGastoCategoria } from '@/shared/types';

import { RegistrarGasto } from '@/application/use-cases/gastos/RegistrarGasto';
import { ConsultarGastos } from '@/application/use-cases/gastos/ConsultarGastos';
import { GenerarCorte } from '@/application/use-cases/cortes/GenerarCorte';
import { CategoriaGasto } from '@/domain/value-objects';

// ============================================================
// In-memory mock implementations
// ============================================================

class MockPedidoRepo implements IPedidoRepository {
  private store: Map<string, Pedido> = new Map();

  seed(pedidos: Pedido[]) {
    pedidos.forEach((p) => this.store.set(p.id, p));
  }

  async crear(pedido: Pedido): Promise<Pedido> {
    this.store.set(pedido.id, pedido);
    return pedido;
  }

  async actualizar(id: string, datos: Partial<Pedido>): Promise<Pedido> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Pedido ${id} no encontrado`);
    const updated = { ...existing, ...datos, actualizadoEn: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async obtenerPorId(id: string): Promise<Pedido | null> {
    return this.store.get(id) ?? null;
  }

  async obtenerPorNumero(numero: string): Promise<Pedido | null> {
    return Array.from(this.store.values()).find((p) => p.numero === numero) ?? null;
  }

  async listarPorEstado(estado: EstadoPedido): Promise<Pedido[]> {
    return Array.from(this.store.values()).filter((p) => p.estado === estado);
  }

  async listarPorCliente(clienteId: string, paginacion: Paginacion): Promise<PedidoPaginado> {
    const datos = Array.from(this.store.values()).filter((p) => p.clienteId === clienteId);
    return { datos, total: datos.length, pagina: 1, porPagina: 50, totalPaginas: 1 };
  }

  async listarPorPeriodo(inicio: Date, fin: Date): Promise<Pedido[]> {
    return Array.from(this.store.values()).filter(
      (p) => p.creadoEn >= inicio && p.creadoEn <= fin
    );
  }

  async contarPorPeriodo(inicio: Date, fin: Date): Promise<number> {
    return (await this.listarPorPeriodo(inicio, fin)).length;
  }
}

class MockGastoRepo implements IGastoRepository {
  private store: Map<string, Gasto> = new Map();

  async registrar(gasto: Gasto): Promise<Gasto> {
    this.store.set(gasto.id, gasto);
    return gasto;
  }

  async consultar(filtros: FiltroGasto): Promise<Gasto[]> {
    let gastos = Array.from(this.store.values());

    if (filtros.categoria) {
      gastos = gastos.filter((g) => g.categoria === filtros.categoria);
    }
    if (filtros.fechaInicio) {
      gastos = gastos.filter((g) => g.fecha >= filtros.fechaInicio!);
    }
    if (filtros.fechaFin) {
      gastos = gastos.filter((g) => g.fecha <= filtros.fechaFin!);
    }
    if (filtros.montoMin !== undefined) {
      gastos = gastos.filter((g) => g.monto >= filtros.montoMin!);
    }
    if (filtros.montoMax !== undefined) {
      gastos = gastos.filter((g) => g.monto <= filtros.montoMax!);
    }

    return gastos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  async sumarPorCategoria(inicio: Date, fin: Date): Promise<ResumenGastoCategoria[]> {
    const gastos = Array.from(this.store.values()).filter(
      (g) => g.fecha >= inicio && g.fecha <= fin
    );

    const agrupados = new Map<string, { total: number; cantidad: number }>();
    for (const gasto of gastos) {
      const existing = agrupados.get(gasto.categoria) ?? { total: 0, cantidad: 0 };
      existing.total += gasto.monto;
      existing.cantidad += 1;
      agrupados.set(gasto.categoria, existing);
    }

    return Array.from(agrupados.entries()).map(([categoria, datos]) => ({
      categoria,
      total: datos.total,
      cantidad: datos.cantidad,
    }));
  }

  async totalPorPeriodo(inicio: Date, fin: Date): Promise<number> {
    const gastos = Array.from(this.store.values()).filter(
      (g) => g.fecha >= inicio && g.fecha <= fin
    );
    return gastos.reduce((sum, g) => sum + g.monto, 0);
  }
}

// ============================================================
// Tests
// ============================================================

describe('Flujo Financiero: Registrar gastos → Generar corte → Verificar cálculos', () => {
  let pedidoRepo: MockPedidoRepo;
  let gastoRepo: MockGastoRepo;

  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0, 0);
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);

  beforeEach(() => {
    pedidoRepo = new MockPedidoRepo();
    gastoRepo = new MockGastoRepo();
  });

  it('debe calcular corte diario correctamente: ventas, gastos, ganancia neta', async () => {
    // === PASO 1: Registrar gastos del día ===
    const registrarGasto = new RegistrarGasto(gastoRepo);

    await registrarGasto.ejecutar({
      id: 'gasto-1',
      monto: 500,
      concepto: 'Compra de pollo',
      categoria: CategoriaGasto.INSUMOS,
      fecha: hoy,
      adminId: 'admin-1',
    });

    await registrarGasto.ejecutar({
      id: 'gasto-2',
      monto: 200,
      concepto: 'Gas LP',
      categoria: CategoriaGasto.SERVICIOS,
      fecha: hoy,
      adminId: 'admin-1',
    });

    await registrarGasto.ejecutar({
      id: 'gasto-3',
      monto: 150,
      concepto: 'Servilletas y desechables',
      categoria: CategoriaGasto.INSUMOS,
      fecha: hoy,
      adminId: 'admin-1',
    });

    // === PASO 2: Simular pedidos completados del día ===
    pedidoRepo.seed([
      {
        id: 'ped-1',
        numero: 'PED-001',
        clienteId: 'cli-1',
        items: [
          { productoId: 'prod-alitas', nombre: 'Alitas BBQ', cantidad: 2, precioUnitario: 180 },
          { productoId: 'prod-refresco', nombre: 'Refresco', cantidad: 2, precioUnitario: 35 },
        ],
        estado: 'entregado',
        modalidad: 'domicilio',
        total: 430,
        creadoEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 13, 0),
        actualizadoEn: new Date(),
      },
      {
        id: 'ped-2',
        numero: 'PED-002',
        clienteId: 'cli-2',
        items: [
          { productoId: 'prod-hamburguesa', nombre: 'Hamburguesa Clásica', cantidad: 3, precioUnitario: 120 },
        ],
        estado: 'entregado',
        modalidad: 'local',
        total: 360,
        creadoEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 14, 30),
        actualizadoEn: new Date(),
      },
      {
        id: 'ped-3',
        numero: 'PED-003',
        clienteId: 'cli-3',
        items: [
          { productoId: 'prod-alitas', nombre: 'Alitas Buffalo', cantidad: 1, precioUnitario: 180 },
          { productoId: 'prod-hamburguesa', nombre: 'Hamburguesa Doble', cantidad: 1, precioUnitario: 150 },
        ],
        estado: 'servido',
        modalidad: 'local',
        total: 330,
        creadoEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 16, 0),
        actualizadoEn: new Date(),
      },
    ]);

    // === PASO 3: Generar corte diario ===
    const generarCorte = new GenerarCorte(pedidoRepo, gastoRepo);

    const corte = await generarCorte.ejecutar('diario', hoy);

    // === PASO 4: Verificar cálculos ===
    const totalVentasEsperado = 430 + 360 + 330; // 1120
    const totalGastosEsperado = 500 + 200 + 150; // 850
    const gananciaNeta = totalVentasEsperado - totalGastosEsperado; // 270
    const ticketPromedio = totalVentasEsperado / 3; // ~373.33

    expect(corte.totalVentas).toBe(totalVentasEsperado);
    expect(corte.totalGastos).toBe(totalGastosEsperado);
    expect(corte.gananciaNeta).toBe(gananciaNeta);
    expect(corte.ticketPromedio).toBeCloseTo(ticketPromedio, 2);
    expect(corte.numeroPedidos).toBe(3);
  });

  it('debe calcular top 5 productos más vendidos correctamente', async () => {
    // Pedidos con múltiples productos
    pedidoRepo.seed([
      {
        id: 'ped-a',
        numero: 'PED-A',
        clienteId: 'cli-1',
        items: [
          { productoId: 'prod-1', nombre: 'Alitas BBQ', cantidad: 5, precioUnitario: 180 },
          { productoId: 'prod-2', nombre: 'Hamburguesa', cantidad: 2, precioUnitario: 120 },
        ],
        estado: 'entregado',
        modalidad: 'local',
        total: 1140,
        creadoEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12, 0),
        actualizadoEn: new Date(),
      },
      {
        id: 'ped-b',
        numero: 'PED-B',
        clienteId: 'cli-2',
        items: [
          { productoId: 'prod-1', nombre: 'Alitas BBQ', cantidad: 3, precioUnitario: 180 },
          { productoId: 'prod-3', nombre: 'Refresco', cantidad: 4, precioUnitario: 35 },
          { productoId: 'prod-4', nombre: 'Papas', cantidad: 2, precioUnitario: 60 },
        ],
        estado: 'entregado',
        modalidad: 'domicilio',
        total: 800,
        creadoEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 14, 0),
        actualizadoEn: new Date(),
      },
      {
        id: 'ped-c',
        numero: 'PED-C',
        clienteId: 'cli-3',
        items: [
          { productoId: 'prod-2', nombre: 'Hamburguesa', cantidad: 4, precioUnitario: 120 },
          { productoId: 'prod-5', nombre: 'Cerveza', cantidad: 6, precioUnitario: 50 },
          { productoId: 'prod-6', nombre: 'Nachos', cantidad: 1, precioUnitario: 80 },
        ],
        estado: 'servido',
        modalidad: 'local',
        total: 860,
        creadoEn: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 18, 0),
        actualizadoEn: new Date(),
      },
    ]);

    const generarCorte = new GenerarCorte(pedidoRepo, gastoRepo);
    const corte = await generarCorte.ejecutar('diario', hoy);

    // Top 5 productos por cantidad vendida:
    // Alitas BBQ: 5 + 3 = 8
    // Cerveza: 6
    // Hamburguesa: 2 + 4 = 6
    // Refresco: 4
    // Papas: 2
    expect(corte.top5Productos).toBeDefined();
    expect(corte.top5Productos.length).toBeLessThanOrEqual(5);

    // El primer producto debe ser el más vendido
    if (corte.top5Productos.length > 0) {
      expect(corte.top5Productos[0].nombre).toBe('Alitas BBQ');
      expect(corte.top5Productos[0].cantidadVendida).toBe(8);
    }
  });

  it('debe retornar ceros en corte sin movimientos', async () => {
    // No hay pedidos ni gastos
    const generarCorte = new GenerarCorte(pedidoRepo, gastoRepo);
    const corte = await generarCorte.ejecutar('diario', hoy);

    expect(corte.totalVentas).toBe(0);
    expect(corte.totalGastos).toBe(0);
    expect(corte.gananciaNeta).toBe(0);
    expect(corte.ticketPromedio).toBe(0);
    expect(corte.numeroPedidos).toBe(0);
    expect(corte.top5Productos).toHaveLength(0);
  });

  it('debe filtrar gastos por categoría y fecha correctamente', async () => {
    const registrarGasto = new RegistrarGasto(gastoRepo);

    // Registrar gastos de distintas categorías
    await registrarGasto.ejecutar({
      id: 'g-1',
      monto: 300,
      concepto: 'Pollo',
      categoria: CategoriaGasto.INSUMOS,
      fecha: hoy,
      adminId: 'admin-1',
    });

    await registrarGasto.ejecutar({
      id: 'g-2',
      monto: 150,
      concepto: 'Electricidad',
      categoria: CategoriaGasto.SERVICIOS,
      fecha: hoy,
      adminId: 'admin-1',
    });

    await registrarGasto.ejecutar({
      id: 'g-3',
      monto: 400,
      concepto: 'Carne molida',
      categoria: CategoriaGasto.INSUMOS,
      fecha: hoy,
      adminId: 'admin-1',
    });

    // Consultar solo insumos
    const consultarGastos = new ConsultarGastos(gastoRepo);
    const gastoInsumos = await consultarGastos.ejecutar({
      categoria: CategoriaGasto.INSUMOS,
    });

    expect(gastoInsumos.length).toBe(2);
    expect(gastoInsumos.every((g) => g.categoria === CategoriaGasto.INSUMOS)).toBe(true);

    // Consultar solo servicios
    const gastoServicios = await consultarGastos.ejecutar({
      categoria: CategoriaGasto.SERVICIOS,
    });

    expect(gastoServicios.length).toBe(1);
    expect(gastoServicios[0].concepto).toBe('Electricidad');
  });

  it('debe verificar que suma de categorías = total general del período', async () => {
    const registrarGasto = new RegistrarGasto(gastoRepo);

    // Registrar varios gastos en categorías distintas
    const gastosData = [
      { id: 'ga-1', monto: 500, concepto: 'Pollo', categoria: CategoriaGasto.INSUMOS, fecha: hoy, adminId: 'admin-1' },
      { id: 'ga-2', monto: 200, concepto: 'Gas', categoria: CategoriaGasto.SERVICIOS, fecha: hoy, adminId: 'admin-1' },
      { id: 'ga-3', monto: 300, concepto: 'Salsas', categoria: CategoriaGasto.INSUMOS, fecha: hoy, adminId: 'admin-1' },
      { id: 'ga-4', monto: 100, concepto: 'Uber', categoria: CategoriaGasto.OTROS, fecha: hoy, adminId: 'admin-1' },
      { id: 'ga-5', monto: 250, concepto: 'Agua', categoria: CategoriaGasto.SERVICIOS, fecha: hoy, adminId: 'admin-1' },
    ];

    for (const gasto of gastosData) {
      await registrarGasto.ejecutar(gasto);
    }

    // Obtener total del período
    const totalPeriodo = await gastoRepo.totalPorPeriodo(inicioHoy, finHoy);
    const totalEsperado = 500 + 200 + 300 + 100 + 250; // 1350
    expect(totalPeriodo).toBe(totalEsperado);

    // Obtener resumen por categoría
    const resumen = await gastoRepo.sumarPorCategoria(inicioHoy, finHoy);

    // Verificar que la suma de todas las categorías = total
    const sumaCategorias = resumen.reduce((sum, r) => sum + r.total, 0);
    expect(sumaCategorias).toBe(totalEsperado);

    // Verificar cantidades por categoría
    const insumos = resumen.find((r) => r.categoria === CategoriaGasto.INSUMOS);
    expect(insumos?.total).toBe(800); // 500 + 300
    expect(insumos?.cantidad).toBe(2);

    const servicios = resumen.find((r) => r.categoria === CategoriaGasto.SERVICIOS);
    expect(servicios?.total).toBe(450); // 200 + 250
    expect(servicios?.cantidad).toBe(2);

    const otros = resumen.find((r) => r.categoria === CategoriaGasto.OTROS);
    expect(otros?.total).toBe(100);
    expect(otros?.cantidad).toBe(1);
  });

  it('debe calcular corte semanal con múltiples días', async () => {
    // Crear pedidos de los últimos 7 días
    const pedidos: Pedido[] = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i, 12, 0);
      pedidos.push({
        id: `ped-dia-${i}`,
        numero: `PED-W${i}`,
        clienteId: 'cli-1',
        items: [
          { productoId: 'prod-1', nombre: 'Alitas', cantidad: 2 + i, precioUnitario: 180 },
        ],
        estado: 'entregado',
        modalidad: 'local',
        total: (2 + i) * 180,
        creadoEn: fecha,
        actualizadoEn: fecha,
      });
    }
    pedidoRepo.seed(pedidos);

    // Registrar gastos durante la semana
    const registrarGasto = new RegistrarGasto(gastoRepo);
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i, 10, 0);
      await registrarGasto.ejecutar({
        id: `gasto-w-${i}`,
        monto: 100 + i * 50, // 100, 150, 200, 250, 300, 350, 400
        concepto: `Gasto día ${i}`,
        categoria: CategoriaGasto.INSUMOS,
        fecha,
        adminId: 'admin-1',
      });
    }

    const generarCorte = new GenerarCorte(pedidoRepo, gastoRepo);
    const corte = await generarCorte.ejecutar('semanal', hoy);

    // Total ventas = sum((2+i)*180 for i in 0..6) = 180*(2+3+4+5+6+7+8) = 180*35 = 6300
    const totalVentasEsperado = [2, 3, 4, 5, 6, 7, 8].reduce((sum, n) => sum + n * 180, 0);
    expect(corte.totalVentas).toBe(totalVentasEsperado);

    // Total gastos = 100+150+200+250+300+350+400 = 1750
    const totalGastosEsperado = [100, 150, 200, 250, 300, 350, 400].reduce((sum, n) => sum + n, 0);
    expect(corte.totalGastos).toBe(totalGastosEsperado);

    // Ganancia neta
    expect(corte.gananciaNeta).toBe(totalVentasEsperado - totalGastosEsperado);

    // Ticket promedio
    expect(corte.ticketPromedio).toBeCloseTo(totalVentasEsperado / 7, 2);

    // Número de pedidos
    expect(corte.numeroPedidos).toBe(7);
  });
});
