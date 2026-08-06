import { ArticuloInventario } from '@/domain/entities';
import { IInventarioRepository, INotificacionService } from '@/domain/ports';
import { RecursoNoEncontradoError, ValidacionError } from '@/shared/errors';
import { TipoMovimiento, MovimientoInventario } from '@/shared/types';
import { ArticuloInventario as ArticuloInventarioType } from '@/shared/domain-types';

/**
 * Caso de uso: Actualizar Cantidad de Artículo de Inventario.
 *
 * Obtiene el artículo existente, actualiza su cantidad registrando un movimiento,
 * verifica si queda por debajo del nivel mínimo y notifica al administrador si es así.
 *
 * Requirements: 4.2, 4.3
 */
export class ActualizarCantidad {
  constructor(
    private readonly inventarioRepo: IInventarioRepository,
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Ejecuta el caso de uso de actualizar la cantidad de un artículo.
   * @param id - Identificador del artículo de inventario
   * @param cantidad - Cantidad a agregar o retirar (valor positivo)
   * @param tipoMovimiento - Tipo de movimiento: 'entrada' o 'salida'
   * @param adminId - Identificador del administrador que realiza el cambio
   * @returns El artículo actualizado (persistido)
   * @throws RecursoNoEncontradoError si el artículo no existe
   * @throws ValidacionError si la cantidad es inválida (<=0)
   */
  async ejecutar(
    id: string,
    cantidad: number,
    tipoMovimiento: TipoMovimiento,
    adminId: string
  ): Promise<ArticuloInventarioType> {
    // 1. Validar cantidad
    if (cantidad <= 0) {
      throw new ValidacionError(
        'La cantidad debe ser mayor a cero',
        ['cantidad']
      );
    }

    // 2. Obtener artículo existente del repo (domain-types interface)
    const articuloData = await this.inventarioRepo.obtenerPorId(id);
    if (!articuloData) {
      throw new RecursoNoEncontradoError('ArticuloInventario', id);
    }

    // 3. Reconstruir entidad de dominio para aplicar lógica de negocio
    const articulo = ArticuloInventario.crear({
      id: articuloData.id,
      nombre: articuloData.nombre,
      cantidad: articuloData.cantidad,
      unidadMedida: articuloData.unidad,
      nivelMinimo: articuloData.nivelMinimo,
    });

    // 4. Aplicar el movimiento según tipo y generar registro de movimiento
    let movimiento: MovimientoInventario;
    if (tipoMovimiento === 'entrada') {
      movimiento = articulo.incrementar(cantidad, adminId);
    } else {
      movimiento = articulo.decrementar(cantidad, adminId);
    }

    // 5. Registrar movimiento en historial
    await this.inventarioRepo.registrarMovimiento(movimiento);

    // 6. Persistir artículo actualizado via repo
    const articuloActualizado = await this.inventarioRepo.actualizar(
      id,
      articulo.cantidad,
      tipoMovimiento,
      adminId
    );

    // 7. Verificar nivel mínimo y notificar si está bajo
    if (articulo.estaBajoMinimo()) {
      await this.notificacionService.notificarInventarioBajo(articuloData);
    }

    return articuloActualizado;
  }
}
