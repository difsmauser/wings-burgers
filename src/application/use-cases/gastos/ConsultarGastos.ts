import { IGastoRepository } from '@/domain/ports/repositories';
import { FiltroGasto } from '@/shared/types';
import { Gasto as GastoData } from '@/shared/domain-types';

/**
 * Caso de uso: Consultar gastos con filtros opcionales.
 * Aplica filtros de categoría, rango de fechas y monto, y retorna los resultados.
 *
 * @requirements 3.3, 3.4, 3.5
 */
export class ConsultarGastos {
  constructor(private readonly gastoRepo: IGastoRepository) {}

  async ejecutar(filtros: FiltroGasto): Promise<GastoData[]> {
    const resultados = await this.gastoRepo.consultar(filtros);
    return resultados;
  }
}
