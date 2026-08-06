import { Gasto, GastoProps } from '@/domain/entities';
import { CategoriaGasto } from '@/domain/value-objects';
import { IGastoRepository } from '@/domain/ports/repositories';
import { ValidacionError } from '@/shared/errors';

/**
 * DTO de entrada para registrar un gasto.
 */
export interface RegistrarGastoDTO {
  id: string;
  monto: number;
  concepto: string;
  categoria: CategoriaGasto;
  fecha: Date;
  adminId: string;
}

/**
 * Caso de uso: Registrar un nuevo gasto en el sistema.
 * Valida monto (0.01-999999.99), concepto (max 200), categoría (enum válido),
 * y fecha antes de persistir.
 *
 * @requirements 3.1, 3.2
 */
export class RegistrarGasto {
  constructor(private readonly gastoRepo: IGastoRepository) {}

  async ejecutar(input: RegistrarGastoDTO): Promise<Gasto> {
    // La entidad Gasto.crear() ya valida monto, concepto, categoría y fecha
    const gasto = Gasto.crear({
      id: input.id,
      monto: input.monto,
      concepto: input.concepto,
      categoria: input.categoria,
      fecha: input.fecha,
      adminId: input.adminId,
    });

    // Persistir vía repositorio (convertir a formato del puerto)
    const gastoData = {
      id: gasto.id,
      monto: gasto.monto.valor,
      concepto: gasto.concepto,
      categoria: gasto.categoria,
      fecha: gasto.fecha,
      creadoEn: gasto.creadoEn,
    };

    await this.gastoRepo.registrar(gastoData);

    return gasto;
  }
}
