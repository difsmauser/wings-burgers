import { Pedido } from '@/shared/domain-types';
import { PreferenciaPago, EstadoPago, NotificacionPago } from '@/shared/types';

/**
 * Puerto de servicio para el gateway de pagos (MercadoPago).
 * Define las operaciones disponibles para procesar pagos electrónicos.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IPagoGateway {
  /**
   * Crea una preferencia de pago en el gateway externo.
   * Genera la URL de redirección para que el cliente realice el pago.
   * @param pedido - Pedido para el cual se crea la preferencia
   * @returns Preferencia de pago con URL de redirección
   */
  crearPreferencia(pedido: Pedido): Promise<PreferenciaPago>;

  /**
   * Verifica el estado actual de un pago en el gateway.
   * @param pagoId - Identificador del pago en el gateway
   * @returns Estado actual del pago
   */
  verificarPago(pagoId: string): Promise<EstadoPago>;

  /**
   * Procesa una notificación webhook recibida del gateway de pagos.
   * Valida y transforma el payload en una notificación estructurada.
   * @param payload - Datos crudos recibidos del webhook
   * @returns Notificación de pago procesada
   */
  procesarWebhook(payload: unknown): Promise<NotificacionPago>;
}
