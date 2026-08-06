import { ResultadoEnvio } from '@/shared/types';

/**
 * Puerto de servicio para mensajería externa (WhatsApp, Email).
 * Define las operaciones disponibles para enviar mensajes a clientes.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IMensajeriaService {
  /**
   * Envía un mensaje por WhatsApp al número indicado.
   * @param telefono - Número de teléfono del destinatario (10 dígitos)
   * @param mensaje - Contenido del mensaje a enviar
   * @returns Resultado del envío con estado y posible error
   */
  enviarWhatsApp(telefono: string, mensaje: string): Promise<ResultadoEnvio>;

  /**
   * Envía un correo electrónico al destinatario.
   * @param correo - Dirección de correo electrónico del destinatario
   * @param asunto - Asunto del correo
   * @param contenido - Contenido HTML o texto del correo
   * @returns Resultado del envío con estado y posible error
   */
  enviarEmail(correo: string, asunto: string, contenido: string): Promise<ResultadoEnvio>;
}
