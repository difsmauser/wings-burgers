import { IPedidoRepository, IGastoRepository } from '@/domain/ports/repositories';
import {
  CorteService,
  TipoCorte,
  Corte,
  PedidoData,
  GastoData,
} from '@/domain/services';

/**
 * Caso de uso: Generar un corte financiero (diario, semanal o mensual).
 * Obtiene pedidos y gastos del período desde los repositorios,
 * y usa CorteService para calcular el reporte financiero.
 *
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class GenerarCorte {
  private readonly corteService: CorteService;

  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly gastoRepo: IGastoRepository
  ) {
    this.corteService = new CorteService();
  }

  async ejecutar(tipo: TipoCorte, fecha?: Date): Promise<Corte> {
    const referencia = fecha ?? new Date();

    // Calcular el rango de fechas según el tipo de corte
    const { fechaInicio, fechaFin } = this.calcularPeriodo(tipo, referencia);

    // Obtener datos del período desde los repositorios
    const [pedidos, gastos] = await Promise.all([
      this.pedidoRepo.listarPorPeriodo(fechaInicio, fechaFin),
      this.gastoRepo.consultar({ fechaInicio, fechaFin }),
    ]);

    // Mapear pedidos al formato esperado por CorteService
    const pedidosData: PedidoData[] = pedidos.map((p) => ({
      total: p.total,
      items: p.items.map((item) => ({
        productoId: item.productoId,
        nombre: item.nombre,
        cantidad: item.cantidad,
      })),
      creadoEn: p.creadoEn,
    }));

    // Mapear gastos al formato esperado por CorteService
    const gastosData: GastoData[] = gastos.map((g) => ({
      monto: g.monto,
      fecha: g.fecha,
    }));

    // Delegar el cálculo al servicio de dominio
    const corte = this.corteService.generarCorte(tipo, pedidosData, gastosData, referencia);

    return corte;
  }

  private calcularPeriodo(
    tipo: TipoCorte,
    fecha: Date
  ): { fechaInicio: Date; fechaFin: Date } {
    switch (tipo) {
      case 'diario': {
        const fechaInicio = new Date(
          fecha.getFullYear(), fecha.getMonth(), fecha.getDate(),
          0, 0, 0, 0
        );
        const fechaFin = new Date(
          fecha.getFullYear(), fecha.getMonth(), fecha.getDate(),
          23, 59, 59, 999
        );
        return { fechaInicio, fechaFin };
      }
      case 'semanal': {
        const fechaFin = new Date(
          fecha.getFullYear(), fecha.getMonth(), fecha.getDate(),
          23, 59, 59, 999
        );
        const fechaInicio = new Date(
          fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - 6,
          0, 0, 0, 0
        );
        return { fechaInicio, fechaFin };
      }
      case 'mensual': {
        const fechaInicio = new Date(
          fecha.getFullYear(), fecha.getMonth(), 1,
          0, 0, 0, 0
        );
        const ultimoDia = new Date(
          fecha.getFullYear(), fecha.getMonth() + 1, 0
        ).getDate();
        const fechaFin = new Date(
          fecha.getFullYear(), fecha.getMonth(), ultimoDia,
          23, 59, 59, 999
        );
        return { fechaInicio, fechaFin };
      }
    }
  }
}
