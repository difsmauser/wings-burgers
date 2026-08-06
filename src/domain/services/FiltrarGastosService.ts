import { CategoriaGasto } from '@/domain/value-objects';

/**
 * Representación de un gasto para fines de filtrado.
 */
export interface GastoFiltrable {
  id: string;
  monto: number;
  concepto: string;
  categoria: CategoriaGasto;
  fecha: Date;
}

/**
 * Filtros opcionales para la consulta de gastos.
 * Todos los campos son opcionales; solo se aplican los que estén definidos.
 */
export interface FiltroGasto {
  categoria?: CategoriaGasto;
  fechaInicio?: Date;
  fechaFin?: Date;
  montoMin?: number;
  montoMax?: number;
}

/**
 * Filtra un arreglo de gastos según los filtros proporcionados.
 * 
 * Reglas:
 * - categoria: coincidencia exacta (si se proporciona)
 * - fechaInicio/fechaFin: rango inclusivo de fechas (si se proporcionan)
 * - montoMin/montoMax: rango inclusivo de monto (si se proporcionan)
 * - Si no se proporciona ningún filtro, se retornan todos los gastos.
 * - El resultado es siempre un subconjunto del input.
 */
export function filtrarGastos(
  gastos: GastoFiltrable[],
  filtros: FiltroGasto
): GastoFiltrable[] {
  return gastos.filter((gasto) => {
    // Filtrar por categoría (coincidencia exacta)
    if (filtros.categoria !== undefined && gasto.categoria !== filtros.categoria) {
      return false;
    }

    // Filtrar por fecha inicio (inclusivo)
    if (filtros.fechaInicio !== undefined && gasto.fecha < filtros.fechaInicio) {
      return false;
    }

    // Filtrar por fecha fin (inclusivo)
    if (filtros.fechaFin !== undefined && gasto.fecha > filtros.fechaFin) {
      return false;
    }

    // Filtrar por monto mínimo (inclusivo)
    if (filtros.montoMin !== undefined && gasto.monto < filtros.montoMin) {
      return false;
    }

    // Filtrar por monto máximo (inclusivo)
    if (filtros.montoMax !== undefined && gasto.monto > filtros.montoMax) {
      return false;
    }

    return true;
  });
}
