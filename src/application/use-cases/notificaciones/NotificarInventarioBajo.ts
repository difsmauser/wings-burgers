import type { INotificacionService } from '@/domain/ports/services';
import type { ArticuloInventario } from '@/shared/domain-types';

/**
 * Caso de uso: Notificar al administrador sobre inventario bajo.
 *
 * Envía una alerta visual en el panel de administración y una notificación push
 * al administrador cuando un artículo de inventario alcanza o baja del nivel
 * mínimo configurado.
 *
 * Requirements: 19.4
 */
export class NotificarInventarioBajo {
  constructor(
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Ejecuta la notificación de inventario bajo al administrador.
   * @param articulo - Artículo de inventario que alcanzó o bajó del mínimo
   */
  async ejecutar(articulo: ArticuloInventario): Promise<void> {
    await this.notificacionService.notificarInventarioBajo(articulo);
  }
}
