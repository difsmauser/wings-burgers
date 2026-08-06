import { ArticuloInventario } from '@/domain/entities';
import { IInventarioRepository } from '@/domain/ports';
import { ArticuloInventario as ArticuloInventarioType } from '@/shared/domain-types';

/**
 * DTO de entrada para registrar un artículo de inventario.
 */
export interface RegistrarArticuloDTO {
  id: string;
  nombre: string;
  cantidad: number;
  unidadMedida: string;
  nivelMinimo: number;
}

/**
 * Caso de uso: Registrar Artículo de Inventario.
 *
 * Valida los datos de entrada, crea la entidad ArticuloInventario
 * y la persiste mediante el repositorio de inventario.
 *
 * Requirements: 4.1, 4.7
 */
export class RegistrarArticulo {
  constructor(private readonly inventarioRepo: IInventarioRepository) {}

  /**
   * Ejecuta el caso de uso de registrar un artículo de inventario.
   * @param input - Datos del artículo a registrar
   * @returns El artículo de inventario creado y persistido
   * @throws ValidacionError si los datos son inválidos
   */
  async ejecutar(input: RegistrarArticuloDTO): Promise<ArticuloInventarioType> {
    // La entidad ArticuloInventario.crear() realiza las validaciones:
    // - nombre no vacío, max 100 caracteres
    // - cantidad entre 0 y 999,999
    // - unidadMedida no vacía
    // - nivelMinimo >= 1
    const articulo = ArticuloInventario.crear({
      id: input.id,
      nombre: input.nombre,
      cantidad: input.cantidad,
      unidadMedida: input.unidadMedida,
      nivelMinimo: input.nivelMinimo,
    });

    // Persistir el artículo via repositorio
    // The repo maps from domain entity to persistence and returns the domain-types interface
    const articuloRegistrado = await this.inventarioRepo.registrar(articulo as unknown as ArticuloInventarioType);

    return articuloRegistrado;
  }
}
