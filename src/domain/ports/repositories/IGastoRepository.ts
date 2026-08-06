import { Gasto } from '@/shared/domain-types';
import { FiltroGasto, ResumenGastoCategoria } from '@/shared/types';

/**
 * Puerto de repositorio para la entidad Gasto.
 * Define las operaciones de persistencia disponibles para gastos.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IGastoRepository {
  /**
   * Registra un nuevo gasto en el sistema.
   * @param gasto - Datos del gasto a registrar
   * @returns El gasto registrado con su identificador asignado
   */
  registrar(gasto: Gasto): Promise<Gasto>;

  /**
   * Consulta gastos con filtros opcionales.
   * Los resultados se ordenan por fecha descendente.
   * @param filtros - Criterios de filtrado (categoría, rango de fechas, monto)
   * @returns Lista de gastos que cumplen los filtros
   */
  consultar(filtros: FiltroGasto): Promise<Gasto[]>;

  /**
   * Suma los gastos agrupados por categoría en un período.
   * @param inicio - Fecha de inicio del período
   * @param fin - Fecha de fin del período
   * @returns Resumen con total y cantidad de registros por categoría
   */
  sumarPorCategoria(inicio: Date, fin: Date): Promise<ResumenGastoCategoria[]>;

  /**
   * Calcula el total de gastos en un período.
   * Útil para cortes financieros.
   * @param inicio - Fecha de inicio del período
   * @param fin - Fecha de fin del período
   * @returns Suma total de gastos en el período
   */
  totalPorPeriodo(inicio: Date, fin: Date): Promise<number>;
}
