import { describe, it, expect, beforeEach } from 'vitest';
import { RegistrarGasto, RegistrarGastoDTO } from '@/application/use-cases/gastos/RegistrarGasto';
import { ConsultarGastos } from '@/application/use-cases/gastos/ConsultarGastos';
import { GenerarCorte } from '@/application/use-cases/cortes/GenerarCorte';
import { CategoriaGasto } from '@/domain/value-objects';
import { IGastoRepository } from '@/domain/ports/repositories';
import { IPedidoRepository } from '@/domain/ports/repositories';
import { FiltroGasto } from '@/shared/types';
import { Gasto as GastoData } from '@/shared/domain-types';

// --- In-memory mock repositories ---

function crearGastoRepoMock(): IGastoRepository & { gastos: GastoData[] } {
  const gastos: GastoData[] = [];
  return {
    gastos,
    async registrar(gasto: GastoData): Promise<GastoData> {
      gastos.push(gasto);
      return gasto;
    },
    async consultar(filtros: FiltroGasto): Promise<GastoData[]> {
      return gastos.filter((g) => {
        if (filtros.categoria && g.categoria !== filtros.categoria) return false;
        if (filtros.fechaInicio && g.fecha < filtros.fechaInicio) return false;
        if (filtros.fechaFin && g.fecha > filtros.fechaFin) return false;
        if (filtros.montoMin !== undefined && g.monto < filtros.montoMin) return false;
        if (filtros.montoMax !== undefined && g.monto > filtros.montoMax) return false;
        return true;
      });
    },
    async sumarPorCategoria() {
      return [];
    },
    async totalPorPeriodo() {
      return 0;
    },
  };
}

function crearPedidoRepoMock(): IPedidoRepository {
  const pedidos: any[] = [];
  return {
    pedidos,
    async crear(pedido: any) { pedidos.push(pedido); return pedido; },
    async actualizar(id: string, datos: any) { return { ...datos, id }; },
    async obtenerPorId(id: string) { return pedidos.find((p) => p.id === id) ?? null; },
    async obtenerPorNumero(numero: string) { return pedidos.find((p) => p.numero === numero) ?? null; },
    async listarPorEstado() { return []; },
    async listarPorCliente() { return { datos: [], total: 0, pagina: 1, porPagina: 50, totalPaginas: 0 }; },
    async listarPorPeriodo(inicio: Date, fin: Date) {
      return pedidos.filter((p: any) => p.creadoEn >= inicio && p.creadoEn <= fin);
    },
    async contarPorPeriodo() { return 0; },
  } as any;
}

// --- Tests ---

describe('RegistrarGasto', () => {
  let gastoRepo: IGastoRepository & { gastos: GastoData[] };
  let registrarGasto: RegistrarGasto;

  beforeEach(() => {
    gastoRepo = crearGastoRepoMock();
    registrarGasto = new RegistrarGasto(gastoRepo);
  });

  it('debe registrar un gasto válido y persistirlo', async () => {
    const input: RegistrarGastoDTO = {
      id: 'gasto-1',
      monto: 150.50,
      concepto: 'Compra de insumos',
      categoria: CategoriaGasto.INSUMOS,
      fecha: new Date(2024, 2, 15),
      adminId: 'admin-1',
    };

    const resultado = await registrarGasto.ejecutar(input);

    expect(resultado.id).toBe('gasto-1');
    expect(resultado.monto.valor).toBe(150.50);
    expect(resultado.concepto).toBe('Compra de insumos');
    expect(resultado.categoria).toBe(CategoriaGasto.INSUMOS);
    expect(gastoRepo.gastos).toHaveLength(1);
    expect(gastoRepo.gastos[0].monto).toBe(150.50);
  });

  it('debe rechazar un gasto con monto fuera de rango', async () => {
    const input: RegistrarGastoDTO = {
      id: 'gasto-2',
      monto: 0,
      concepto: 'Gasto inválido',
      categoria: CategoriaGasto.SERVICIOS,
      fecha: new Date(2024, 2, 15),
      adminId: 'admin-1',
    };

    await expect(registrarGasto.ejecutar(input)).rejects.toThrow();
  });

  it('debe rechazar un gasto con concepto vacío', async () => {
    const input: RegistrarGastoDTO = {
      id: 'gasto-3',
      monto: 50,
      concepto: '',
      categoria: CategoriaGasto.SERVICIOS,
      fecha: new Date(2024, 2, 15),
      adminId: 'admin-1',
    };

    await expect(registrarGasto.ejecutar(input)).rejects.toThrow();
  });

  it('debe rechazar un gasto con concepto mayor a 200 caracteres', async () => {
    const input: RegistrarGastoDTO = {
      id: 'gasto-4',
      monto: 50,
      concepto: 'x'.repeat(201),
      categoria: CategoriaGasto.SERVICIOS,
      fecha: new Date(2024, 2, 15),
      adminId: 'admin-1',
    };

    await expect(registrarGasto.ejecutar(input)).rejects.toThrow();
  });
});

describe('ConsultarGastos', () => {
  let gastoRepo: IGastoRepository & { gastos: GastoData[] };
  let consultarGastos: ConsultarGastos;

  beforeEach(() => {
    gastoRepo = crearGastoRepoMock();
    consultarGastos = new ConsultarGastos(gastoRepo);

    // Seed data
    gastoRepo.gastos.push(
      { id: 'g1', monto: 100, concepto: 'Insumos', categoria: 'INSUMOS', fecha: new Date(2024, 2, 10), creadoEn: new Date() },
      { id: 'g2', monto: 200, concepto: 'Renta', categoria: 'RENTA', fecha: new Date(2024, 2, 15), creadoEn: new Date() },
      { id: 'g3', monto: 50, concepto: 'Marketing', categoria: 'MARKETING', fecha: new Date(2024, 2, 20), creadoEn: new Date() },
    );
  });

  it('debe retornar todos los gastos sin filtros', async () => {
    const resultados = await consultarGastos.ejecutar({});
    expect(resultados).toHaveLength(3);
  });

  it('debe filtrar por categoría', async () => {
    const resultados = await consultarGastos.ejecutar({ categoria: 'INSUMOS' });
    expect(resultados).toHaveLength(1);
    expect(resultados[0].categoria).toBe('INSUMOS');
  });

  it('debe filtrar por rango de fechas', async () => {
    const resultados = await consultarGastos.ejecutar({
      fechaInicio: new Date(2024, 2, 12),
      fechaFin: new Date(2024, 2, 18),
    });
    expect(resultados).toHaveLength(1);
    expect(resultados[0].id).toBe('g2');
  });

  it('debe filtrar por rango de monto', async () => {
    const resultados = await consultarGastos.ejecutar({
      montoMin: 100,
      montoMax: 150,
    });
    expect(resultados).toHaveLength(1);
    expect(resultados[0].id).toBe('g1');
  });
});

describe('GenerarCorte', () => {
  let gastoRepo: IGastoRepository & { gastos: GastoData[] };
  let pedidoRepo: IPedidoRepository & { pedidos: any[] };
  let generarCorte: GenerarCorte;

  beforeEach(() => {
    gastoRepo = crearGastoRepoMock();
    pedidoRepo = crearPedidoRepoMock() as any;
    generarCorte = new GenerarCorte(pedidoRepo, gastoRepo);
  });

  it('debe generar un corte diario con datos correctos', async () => {
    const fecha = new Date(2024, 2, 15);

    // Agregar pedidos del día
    (pedidoRepo as any).pedidos.push(
      { id: 'p1', total: 200, items: [{ productoId: 'prod1', nombre: 'Alitas BBQ', cantidad: 2 }], creadoEn: new Date(2024, 2, 15, 10) },
      { id: 'p2', total: 150, items: [{ productoId: 'prod2', nombre: 'Hamburguesa', cantidad: 1 }], creadoEn: new Date(2024, 2, 15, 14) },
    );

    // Agregar gastos del día
    gastoRepo.gastos.push(
      { id: 'g1', monto: 80, concepto: 'Insumos', categoria: 'INSUMOS', fecha: new Date(2024, 2, 15, 8), creadoEn: new Date() },
    );

    const corte = await generarCorte.ejecutar('diario', fecha);

    expect(corte.tipo).toBe('diario');
    expect(corte.totalVentas).toBe(350);
    expect(corte.totalGastos).toBe(80);
    expect(corte.gananciaNeta).toBe(270);
    expect(corte.numeroPedidos).toBe(2);
    expect(corte.ticketPromedio).toBe(175);
  });

  it('debe retornar ceros cuando no hay datos en el período (Req 5.5)', async () => {
    const fecha = new Date(2024, 2, 15);
    const corte = await generarCorte.ejecutar('diario', fecha);

    expect(corte.totalVentas).toBe(0);
    expect(corte.totalGastos).toBe(0);
    expect(corte.gananciaNeta).toBe(0);
    expect(corte.numeroPedidos).toBe(0);
    expect(corte.ticketPromedio).toBe(0);
    expect(corte.top5Productos).toHaveLength(0);
  });

  it('debe generar un corte semanal con desglose por día', async () => {
    const fecha = new Date(2024, 2, 15); // viernes

    (pedidoRepo as any).pedidos.push(
      { id: 'p1', total: 100, items: [], creadoEn: new Date(2024, 2, 10, 12) },
      { id: 'p2', total: 200, items: [], creadoEn: new Date(2024, 2, 12, 12) },
      { id: 'p3', total: 300, items: [], creadoEn: new Date(2024, 2, 15, 12) },
    );

    const corte = await generarCorte.ejecutar('semanal', fecha);

    expect(corte.tipo).toBe('semanal');
    expect(corte.totalVentas).toBe(600);
    expect(corte.desglose.length).toBe(7); // 7 días
  });

  it('debe generar un corte mensual', async () => {
    const fecha = new Date(2024, 2, 15); // Marzo 2024

    (pedidoRepo as any).pedidos.push(
      { id: 'p1', total: 500, items: [], creadoEn: new Date(2024, 2, 5, 12) },
    );

    gastoRepo.gastos.push(
      { id: 'g1', monto: 100, concepto: 'Renta', categoria: 'RENTA', fecha: new Date(2024, 2, 1, 10), creadoEn: new Date() },
    );

    const corte = await generarCorte.ejecutar('mensual', fecha);

    expect(corte.tipo).toBe('mensual');
    expect(corte.totalVentas).toBe(500);
    expect(corte.totalGastos).toBe(100);
    expect(corte.gananciaNeta).toBe(400);
    expect(corte.desglose.length).toBeGreaterThan(0);
  });
});
