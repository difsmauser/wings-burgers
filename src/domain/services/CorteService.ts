/**
 * CorteService - Servicio de dominio para cálculos de cortes financieros.
 * Genera reportes diarios, semanales y mensuales con totales de ventas,
 * gastos, ganancia neta, ticket promedio y top 5 productos más vendidos.
 *
 * Es un servicio puro de dominio sin dependencias de infraestructura.
 * Opera sobre datos que le son pasados como argumentos.
 *
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

export type TipoCorte = 'diario' | 'semanal' | 'mensual';

export interface ProductoVendido {
  productoId: string;
  nombre: string;
  cantidadVendida: number;
}

export interface DesgloseItem {
  periodo: string;
  ventas: number;
  gastos: number;
  ganancia: number;
}

export interface Corte {
  tipo: TipoCorte;
  fechaInicio: Date;
  fechaFin: Date;
  totalVentas: number;
  totalGastos: number;
  gananciaNeta: number;
  numeroPedidos: number;
  ticketPromedio: number;
  top5Productos: ProductoVendido[];
  desglose: DesgloseItem[];
}

export interface PedidoData {
  total: number;
  items: { productoId: string; nombre: string; cantidad: number }[];
  creadoEn: Date;
}

export interface GastoData {
  monto: number;
  fecha: Date;
}

export class CorteService {
  /**
   * Genera un corte financiero para el tipo y período indicado.
   *
   * - 'diario': del inicio al fin del día seleccionado
   * - 'semanal': últimos 7 días desde la fecha, desglose por día
   * - 'mensual': mes calendario completo, desglose por semana
   *
   * Si no hay datos en el período, retorna valores en cero (Req 5.5).
   */
  generarCorte(
    tipo: TipoCorte,
    pedidos: PedidoData[],
    gastos: GastoData[],
    fecha?: Date
  ): Corte {
    const referencia = fecha ?? new Date();
    const { fechaInicio, fechaFin } = this.calcularPeriodo(tipo, referencia);

    const pedidosEnPeriodo = pedidos.filter(
      (p) => p.creadoEn >= fechaInicio && p.creadoEn <= fechaFin
    );
    const gastosEnPeriodo = gastos.filter(
      (g) => g.fecha >= fechaInicio && g.fecha <= fechaFin
    );

    const totalVentas = pedidosEnPeriodo.reduce((sum, p) => sum + p.total, 0);
    const totalGastos = gastosEnPeriodo.reduce((sum, g) => sum + g.monto, 0);
    const gananciaNeta = totalVentas - totalGastos;
    const numeroPedidos = pedidosEnPeriodo.length;
    const ticketPromedio = numeroPedidos > 0 ? totalVentas / numeroPedidos : 0;

    const top5Productos = this.calcularTop5Productos(pedidosEnPeriodo);
    const desglose = this.calcularDesglose(
      tipo,
      fechaInicio,
      fechaFin,
      pedidosEnPeriodo,
      gastosEnPeriodo
    );

    return {
      tipo,
      fechaInicio,
      fechaFin,
      totalVentas,
      totalGastos,
      gananciaNeta,
      numeroPedidos,
      ticketPromedio,
      top5Productos,
      desglose,
    };
  }

  private calcularPeriodo(
    tipo: TipoCorte,
    fecha: Date
  ): { fechaInicio: Date; fechaFin: Date } {
    switch (tipo) {
      case 'diario': {
        const fechaInicio = new Date(
          fecha.getFullYear(),
          fecha.getMonth(),
          fecha.getDate(),
          0, 0, 0, 0
        );
        const fechaFin = new Date(
          fecha.getFullYear(),
          fecha.getMonth(),
          fecha.getDate(),
          23, 59, 59, 999
        );
        return { fechaInicio, fechaFin };
      }
      case 'semanal': {
        // Últimos 7 días desde la fecha (inclusive)
        const fechaFin = new Date(
          fecha.getFullYear(),
          fecha.getMonth(),
          fecha.getDate(),
          23, 59, 59, 999
        );
        const fechaInicio = new Date(
          fecha.getFullYear(),
          fecha.getMonth(),
          fecha.getDate() - 6,
          0, 0, 0, 0
        );
        return { fechaInicio, fechaFin };
      }
      case 'mensual': {
        // Mes calendario completo
        const fechaInicio = new Date(
          fecha.getFullYear(),
          fecha.getMonth(),
          1,
          0, 0, 0, 0
        );
        const ultimoDia = new Date(
          fecha.getFullYear(),
          fecha.getMonth() + 1,
          0
        ).getDate();
        const fechaFin = new Date(
          fecha.getFullYear(),
          fecha.getMonth(),
          ultimoDia,
          23, 59, 59, 999
        );
        return { fechaInicio, fechaFin };
      }
    }
  }

  private calcularTop5Productos(pedidos: PedidoData[]): ProductoVendido[] {
    const acumulado = new Map<string, { nombre: string; cantidad: number }>();

    for (const pedido of pedidos) {
      for (const item of pedido.items) {
        const existing = acumulado.get(item.productoId);
        if (existing) {
          existing.cantidad += item.cantidad;
        } else {
          acumulado.set(item.productoId, {
            nombre: item.nombre,
            cantidad: item.cantidad,
          });
        }
      }
    }

    return Array.from(acumulado.entries())
      .map(([productoId, data]) => ({
        productoId,
        nombre: data.nombre,
        cantidadVendida: data.cantidad,
      }))
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, 5);
  }

  private calcularDesglose(
    tipo: TipoCorte,
    fechaInicio: Date,
    fechaFin: Date,
    pedidos: PedidoData[],
    gastos: GastoData[]
  ): DesgloseItem[] {
    switch (tipo) {
      case 'diario':
        // Para corte diario, no hay desglose adicional (un solo día)
        return this.desgloseDiario(fechaInicio, pedidos, gastos);
      case 'semanal':
        return this.desgloseSemanal(fechaInicio, fechaFin, pedidos, gastos);
      case 'mensual':
        return this.desgloseMensual(fechaInicio, fechaFin, pedidos, gastos);
    }
  }

  private desgloseDiario(
    fecha: Date,
    pedidos: PedidoData[],
    gastos: GastoData[]
  ): DesgloseItem[] {
    const ventas = pedidos.reduce((sum, p) => sum + p.total, 0);
    const gastosTotal = gastos.reduce((sum, g) => sum + g.monto, 0);
    return [
      {
        periodo: this.formatearFecha(fecha),
        ventas,
        gastos: gastosTotal,
        ganancia: ventas - gastosTotal,
      },
    ];
  }

  private desgloseSemanal(
    fechaInicio: Date,
    fechaFin: Date,
    pedidos: PedidoData[],
    gastos: GastoData[]
  ): DesgloseItem[] {
    const items: DesgloseItem[] = [];
    const current = new Date(fechaInicio);

    while (current <= fechaFin) {
      const diaInicio = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate(),
        0, 0, 0, 0
      );
      const diaFin = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate(),
        23, 59, 59, 999
      );

      const ventasDia = pedidos
        .filter((p) => p.creadoEn >= diaInicio && p.creadoEn <= diaFin)
        .reduce((sum, p) => sum + p.total, 0);
      const gastosDia = gastos
        .filter((g) => g.fecha >= diaInicio && g.fecha <= diaFin)
        .reduce((sum, g) => sum + g.monto, 0);

      items.push({
        periodo: this.formatearFecha(current),
        ventas: ventasDia,
        gastos: gastosDia,
        ganancia: ventasDia - gastosDia,
      });

      current.setDate(current.getDate() + 1);
    }

    return items;
  }

  private desgloseMensual(
    fechaInicio: Date,
    fechaFin: Date,
    pedidos: PedidoData[],
    gastos: GastoData[]
  ): DesgloseItem[] {
    const items: DesgloseItem[] = [];
    let semanaNum = 1;
    let current = new Date(fechaInicio);

    while (current <= fechaFin) {
      const semanaInicio = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate(),
        0, 0, 0, 0
      );

      // La semana termina 6 días después o al final del mes
      const sieteDiasDespues = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 6,
        23, 59, 59, 999
      );
      const semanaFin = sieteDiasDespues <= fechaFin ? sieteDiasDespues : fechaFin;

      const ventasSemana = pedidos
        .filter((p) => p.creadoEn >= semanaInicio && p.creadoEn <= semanaFin)
        .reduce((sum, p) => sum + p.total, 0);
      const gastosSemana = gastos
        .filter((g) => g.fecha >= semanaInicio && g.fecha <= semanaFin)
        .reduce((sum, g) => sum + g.monto, 0);

      items.push({
        periodo: `Semana ${semanaNum}`,
        ventas: ventasSemana,
        gastos: gastosSemana,
        ganancia: ventasSemana - gastosSemana,
      });

      // Avanzar al siguiente período de 7 días
      current = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 7,
        0, 0, 0, 0
      );
      semanaNum++;
    }

    return items;
  }

  private formatearFecha(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
