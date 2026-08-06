import { IPagoGateway } from '@/domain/ports/services';
import { Pedido } from '@/shared/domain-types';
import { PreferenciaPago, EstadoPago, NotificacionPago } from '@/shared/types';
import { PagoFallidoError } from '@/shared/errors/PagoFallidoError';
import { ServicioExternoError } from '@/shared/errors/ServicioExternoError';

const MERCADOPAGO_API_URL = 'https://api.mercadopago.com';

/**
 * Adaptador de MercadoPago que implementa IPagoGateway.
 * Utiliza la API REST de MercadoPago Checkout Pro para:
 * - Crear preferencias de pago
 * - Verificar estado de pagos
 * - Procesar notificaciones webhook
 */
export class MercadoPagoAdapter implements IPagoGateway {
  private readonly accessToken: string;
  private readonly successUrl: string;
  private readonly failureUrl: string;
  private readonly pendingUrl: string;

  constructor(config?: {
    accessToken?: string;
    successUrl?: string;
    failureUrl?: string;
    pendingUrl?: string;
  }) {
    this.accessToken = config?.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    this.successUrl = config?.successUrl || process.env.MERCADOPAGO_SUCCESS_URL || '/pago/exitoso';
    this.failureUrl = config?.failureUrl || process.env.MERCADOPAGO_FAILURE_URL || '/pago/fallido';
    this.pendingUrl = config?.pendingUrl || process.env.MERCADOPAGO_PENDING_URL || '/pago/pendiente';

    if (!this.accessToken) {
      throw new ServicioExternoError(
        'MercadoPago',
        'MERCADOPAGO_ACCESS_TOKEN no está configurado'
      );
    }
  }

  /**
   * Crea una preferencia de checkout en MercadoPago con los items del pedido.
   * La preferencia incluye URLs de retorno y auto_return habilitado.
   */
  async crearPreferencia(pedido: Pedido): Promise<PreferenciaPago> {
    const items = pedido.items.map((item) => ({
      title: item.nombre,
      quantity: item.cantidad,
      unit_price: item.precioUnitario,
      currency_id: 'MXN',
    }));

    const body = {
      items,
      back_urls: {
        success: this.successUrl,
        failure: this.failureUrl,
        pending: this.pendingUrl,
      },
      auto_return: 'approved' as const,
      external_reference: pedido.id,
      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL || undefined,
    };

    let response: Response;
    try {
      response = await fetch(`${MERCADOPAGO_API_URL}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new ServicioExternoError(
        'MercadoPago',
        `Error de conexión al crear preferencia: ${(error as Error).message}`
      );
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ServicioExternoError(
        'MercadoPago',
        `Error al crear preferencia (HTTP ${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();

    return {
      id: data.id,
      urlPago: data.init_point,
      urlRetorno: this.successUrl,
      monto: pedido.total,
      expiracion: new Date(data.expiration_date_to || Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Consulta el estado de un pago en la API de MercadoPago.
   */
  async verificarPago(pagoId: string): Promise<EstadoPago> {
    let response: Response;
    try {
      response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments/${pagoId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    } catch (error) {
      throw new ServicioExternoError(
        'MercadoPago',
        `Error de conexión al verificar pago: ${(error as Error).message}`
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new PagoFallidoError(pagoId, 'Pago no encontrado en MercadoPago');
      }
      const errorBody = await response.text();
      throw new ServicioExternoError(
        'MercadoPago',
        `Error al verificar pago (HTTP ${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    return this.mapearEstado(data.status);
  }

  /**
   * Procesa una notificación webhook de MercadoPago.
   * Valida el tipo de notificación, extrae el payment_id y consulta su estado.
   */
  async procesarWebhook(payload: unknown): Promise<NotificacionPago> {
    if (!payload || typeof payload !== 'object') {
      throw new PagoFallidoError('desconocido', 'Payload de webhook inválido');
    }

    const webhookData = payload as Record<string, unknown>;

    // MercadoPago envía notificaciones con type 'payment' y data.id
    const tipo = webhookData.type as string | undefined;
    const data = webhookData.data as Record<string, unknown> | undefined;

    if (tipo !== 'payment' || !data?.id) {
      throw new PagoFallidoError(
        'desconocido',
        `Tipo de notificación no soportado: ${tipo || 'indefinido'}`
      );
    }

    const pagoId = String(data.id);

    // Consultar el estado real del pago en MercadoPago
    let response: Response;
    try {
      response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments/${pagoId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    } catch (error) {
      throw new ServicioExternoError(
        'MercadoPago',
        `Error de conexión al procesar webhook: ${(error as Error).message}`
      );
    }

    if (!response.ok) {
      throw new ServicioExternoError(
        'MercadoPago',
        `Error al consultar pago del webhook (HTTP ${response.status})`
      );
    }

    const pagoData = await response.json();

    return {
      pagoId,
      pedidoId: pagoData.external_reference || '',
      estado: this.mapearEstado(pagoData.status),
      monto: pagoData.transaction_amount || 0,
      fecha: new Date(pagoData.date_approved || pagoData.date_created || Date.now()),
    };
  }

  /**
   * Mapea el estado de MercadoPago a nuestro tipo EstadoPago interno.
   */
  private mapearEstado(statusMercadoPago: string): EstadoPago {
    const mapeo: Record<string, EstadoPago> = {
      approved: 'aprobado',
      rejected: 'rechazado',
      pending: 'pendiente',
      in_process: 'en_proceso',
      cancelled: 'cancelado',
      refunded: 'cancelado',
      charged_back: 'cancelado',
    };

    return mapeo[statusMercadoPago] || 'pendiente';
  }
}
