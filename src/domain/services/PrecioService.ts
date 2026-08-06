import { Producto, HistorialPrecio } from '@/domain/entities';
import { Precio } from '@/domain/value-objects';

/**
 * Servicio de dominio para la gestión de precios de productos.
 * Encapsula la lógica de actualización de precios y acumulación de historial.
 *
 * Servicio puro de dominio - sin dependencias de infraestructura.
 */
export class PrecioService {
  private historial: HistorialPrecio[] = [];

  /**
   * Actualiza el precio de un producto y genera un registro de historial.
   * @param producto - Producto al que se le actualizará el precio.
   * @param nuevoPrecio - Nuevo precio a asignar.
   * @returns HistorialPrecio con precio anterior, nuevo y fecha del cambio.
   */
  actualizarPrecio(producto: Producto, nuevoPrecio: Precio): HistorialPrecio {
    const registro = producto.actualizarPrecio(nuevoPrecio);
    this.historial.push(registro);
    return registro;
  }

  /**
   * Obtiene el historial de cambios de precios acumulado,
   * ordenado por fecha descendente.
   */
  obtenerHistorial(): HistorialPrecio[] {
    return [...this.historial].sort(
      (a, b) => b.fechaCambio.getTime() - a.fechaCambio.getTime()
    );
  }
}
