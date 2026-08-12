import { IMensajeriaService } from '@/domain/ports/services';
import { ResultadoEnvio } from '@/shared/types';
import { ServicioExternoError } from '@/shared/errors';

/**
 * Configuración del adaptador WhatsApp Cloud API
 */
interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  businessAccountId: string;
  /** Número máximo de reintentos (default: 3) */
  maxReintentos?: number;
  /** Timeout por intento en milisegundos (default: 30000) */
  timeoutMs?: number;
}

/**
 * Templates de mensajes predefinidos para el sistema
 */
export const WHATSAPP_TEMPLATES = {
  /** Template para enviar la cuenta/resumen al cliente */
  cuentaCliente: (nombre: string, resumen: string, total: string): string =>
    `🍔 *A-la Burguer*\n\nHola ${nombre}, aquí tienes tu cuenta:\n\n${resumen}\n\n💰 *Total: $${total}*\n\n¡Gracias por tu preferencia!`,

  /** Template para confirmación de pedido */
  confirmacionPedido: (nombre: string, numeroPedido: string, modalidad: string): string =>
    `🍔 *A-la Burguer*\n\nHola ${nombre}, tu pedido #${numeroPedido} ha sido confirmado.\n\n📋 Modalidad: ${modalidad}\n\nTe notificaremos cuando esté listo. ¡Gracias!`,

  /** Template para cambio de estado del pedido */
  cambioEstado: (nombre: string, numeroPedido: string, nuevoEstado: string): string =>
    `🍔 *A-la Burguer*\n\nHola ${nombre}, tu pedido #${numeroPedido} ha cambiado de estado:\n\n📦 Nuevo estado: *${nuevoEstado}*`,
};

/**
 * Adaptador de WhatsApp Cloud API que implementa IMensajeriaService.
 * Envía mensajes de texto mediante la Meta WhatsApp Cloud API.
 * Incluye reintentos con backoff exponencial y timeout configurable.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class WhatsAppAdapter implements IMensajeriaService {
  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly businessAccountId: string;
  private readonly maxReintentos: number;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(config?: Partial<WhatsAppConfig>) {
    this.token = config?.token ?? process.env.WHATSAPP_TOKEN ?? '';
    this.phoneNumberId = config?.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';
    this.businessAccountId = config?.businessAccountId ?? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? '';
    this.maxReintentos = config?.maxReintentos ?? 3;
    this.timeoutMs = config?.timeoutMs ?? 30_000;
    this.baseUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Envía un mensaje de texto por WhatsApp al número indicado.
   * Implementa reintentos (3 intentos) con backoff exponencial y timeout de 30s.
   *
   * @param telefono - Número de teléfono del destinatario (10 dígitos, se agrega código de país 52 para México)
   * @param mensaje - Contenido del mensaje de texto a enviar
   * @returns ResultadoEnvio con el estado del envío
   * @throws ServicioExternoError cuando se agotan todos los reintentos
   */
  async enviarWhatsApp(telefono: string, mensaje: string): Promise<ResultadoEnvio> {
    const telefonoFormateado = this.formatearTelefono(telefono);
    let ultimoError: string | undefined;

    for (let intento = 1; intento <= this.maxReintentos; intento++) {
      try {
        const resultado = await this.enviarMensajeConTimeout(telefonoFormateado, mensaje);
        return resultado;
      } catch (error) {
        ultimoError = error instanceof Error ? error.message : String(error);

        // Si no es el último intento, esperar con backoff exponencial
        if (intento < this.maxReintentos) {
          const delayMs = Math.pow(2, intento - 1) * 1000; // 1s, 2s, 4s...
          await this.esperar(delayMs);
        }
      }
    }

    // Todos los reintentos agotados
    throw new ServicioExternoError(
      'WhatsApp Cloud API',
      `Falló después de ${this.maxReintentos} intentos. Último error: ${ultimoError}`
    );
  }

  /**
   * Envío de email no está implementado en este adaptador.
   * WhatsApp Cloud API solo maneja mensajes de WhatsApp.
   *
   * @returns ResultadoEnvio con exitoso=false indicando que el servicio no está disponible
   */
  async enviarEmail(correo: string, asunto: string, contenido: string): Promise<ResultadoEnvio> {
    return {
      exitoso: false,
      error: 'El envío de email no está implementado en el adaptador de WhatsApp. Use un adaptador de email dedicado.',
      fecha: new Date(),
    };
  }

  /**
   * Envía el mensaje con timeout usando AbortController
   */
  private async enviarMensajeConTimeout(telefono: string, mensaje: string): Promise<ResultadoEnvio> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: telefono,
          type: 'text',
          text: {
            preview_url: false,
            body: mensaje,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      return {
        exitoso: true,
        mensajeId: data.messages?.[0]?.id ?? undefined,
        fecha: new Date(),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout después de ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Formatea el teléfono al formato internacional esperado por WhatsApp API.
   * Asume código de país México (52) si el número tiene 10 dígitos.
   */
  private formatearTelefono(telefono: string): string {
    // Limpiar caracteres no numéricos
    const limpio = telefono.replace(/\D/g, '');

    // Si ya tiene código de país (más de 10 dígitos), usarlo tal cual
    if (limpio.length > 10) {
      return limpio;
    }

    // Agregar código de país México (52) por defecto
    return `52${limpio}`;
  }

  /**
   * Espera un tiempo determinado (para backoff entre reintentos)
   */
  private esperar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
