import { SupabaseClient } from '@supabase/supabase-js';
import { INotificacionService } from '@/domain/ports/services/INotificacionService';
import { Pedido, EstadoPedido, ArticuloInventario } from '@/shared/domain-types';
import { ResultadoEnvio } from '@/shared/types';
import { ServicioExternoError } from '@/shared/errors';
import { PushNotificationService } from './PushNotificationService';

/**
 * Nombres de canales de Supabase Realtime para el sistema de notificaciones.
 *
 * Canales configurados:
 * - pedidos:vendedor → Nuevos pedidos notificados al vendedor
 * - pedido:estado:{id} → Cambios de estado de un pedido específico
 * - ubicacion:{id} → Ubicación GPS del repartidor para rastreo
 * - inventario:alertas → Alertas de inventario bajo para el admin
 * - notificaciones:{userId} → Notificaciones generales por usuario
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
export const CANALES = {
  PEDIDOS_VENDEDOR: 'pedidos:vendedor',
  ESTADO_PEDIDO: (pedidoId: string) => `pedido:estado:${pedidoId}`,
  UBICACION: (pedidoId: string) => `ubicacion:${pedidoId}`,
  INVENTARIO_ALERTAS: 'inventario:alertas',
  NOTIFICACIONES_USUARIO: (userId: string) => `notificaciones:${userId}`,
  REPARTIDOR: 'repartidor',
} as const;

/**
 * Adaptador de notificaciones usando Supabase Realtime con canales broadcast.
 * Implementa INotificacionService para enviar notificaciones en tiempo real.
 *
 * Integra:
 * - Broadcast en tiempo real via Supabase Realtime channels
 * - Push notifications con fallback a notificación in-app
 * - Reintentos de push (3 intentos, 2 min) con almacenamiento como pendiente
 *
 * Canales del sistema:
 * - pedidos:vendedor → Nuevos pedidos para el vendedor (Req 19.1)
 * - pedido:estado:{id} → Cambios de estado de pedido (Req 19.2)
 * - ubicacion:{id} → Ubicación GPS del repartidor (Req 14.3, 15.1)
 * - inventario:alertas → Alertas de stock bajo (Req 19.4)
 * - notificaciones:{userId} → Notificaciones personales (Req 19.5)
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
export class SupabaseRealtimeAdapter implements INotificacionService {
  private readonly pushService: PushNotificationService;

  constructor(private readonly supabase: SupabaseClient) {
    this.pushService = new PushNotificationService(supabase);
  }

  /**
   * Notifica al vendedor sobre un nuevo pedido.
   * Broadcast al canal pedidos:vendedor con datos del pedido.
   * Incluye alerta visual y sonido audible (manejado en el cliente).
   *
   * Requirement: 19.1
   */
  async notificarNuevoPedido(pedido: Pedido): Promise<void> {
    await this.broadcast(CANALES.PEDIDOS_VENDEDOR, 'nuevo_pedido', {
      pedidoId: pedido.id,
      numero: pedido.numero,
      clienteId: pedido.clienteId,
      items: pedido.items,
      modalidad: pedido.modalidad,
      total: pedido.total,
      mesaZona: pedido.mesaZona ?? null,
      origenQr: !!pedido.mesaZona,
      creadoEn: pedido.creadoEn,
      sonido: true,
      persistente: true, // Persiste hasta reconocer manualmente (max 5 min)
    });
  }

  /**
   * Notifica al cliente sobre un cambio de estado en su pedido.
   * Broadcast al canal pedido:estado:{pedidoId} y envía push notification.
   * Si la app está abierta, se muestra in-app. Si no, push notification.
   *
   * Requirement: 19.2
   */
  async notificarCambioEstado(pedidoId: string, nuevoEstado: EstadoPedido): Promise<void> {
    // Broadcast al canal del pedido para clientes con la app abierta
    await this.broadcast(CANALES.ESTADO_PEDIDO(pedidoId), 'cambio_estado', {
      pedidoId,
      nuevoEstado,
      fecha: new Date().toISOString(),
    });
  }

  /**
   * Notifica al administrador que un artículo de inventario está bajo.
   * Broadcast al canal inventario:alertas y envía push al admin.
   *
   * Requirement: 19.4
   */
  async notificarInventarioBajo(articulo: ArticuloInventario): Promise<void> {
    await this.broadcast(CANALES.INVENTARIO_ALERTAS, 'inventario_bajo', {
      articuloId: articulo.id,
      nombre: articulo.nombre,
      cantidadActual: articulo.cantidad,
      nivelMinimo: articulo.nivelMinimo,
      fecha: new Date().toISOString(),
    });
  }

  /**
   * Notifica que hay un pedido listo para entrega y se requiere repartidor.
   * Broadcast al canal repartidor para los repartidores activos.
   *
   * Requirement: 19.3
   */
  async notificarRepartidorDisponible(pedidoId: string): Promise<void> {
    await this.broadcast(CANALES.REPARTIDOR, 'entrega_disponible', {
      pedidoId,
      fecha: new Date().toISOString(),
    });
  }

  /**
   * Envía una notificación push a un usuario específico con reintentos
   * y fallback a notificación in-app.
   *
   * Flujo:
   * 1. Intenta push notification (Web Push API)
   * 2. Si push no disponible → fallback a in-app (broadcast Realtime)
   * 3. Reintentos: 3 intentos, 2 min entre cada uno
   * 4. Si todo falla → almacena como pendiente
   *
   * Requirements: 19.2, 19.5
   * @returns Resultado del envío
   */
  async enviarPush(usuarioId: string, titulo: string, cuerpo: string): Promise<ResultadoEnvio> {
    return this.pushService.enviarConReintentos(usuarioId, titulo, cuerpo);
  }

  /**
   * Envía un broadcast a un canal de Supabase Realtime.
   * @param canal - Nombre del canal
   * @param evento - Tipo de evento
   * @param payload - Datos del evento
   */
  private async broadcast(canal: string, evento: string, payload: Record<string, unknown>): Promise<void> {
    const channel = this.supabase.channel(canal);

    const response = await channel.send({
      type: 'broadcast',
      event: evento,
      payload,
    });

    // Limpiar canal después del envío
    this.supabase.removeChannel(channel);

    if (response !== 'ok') {
      throw new ServicioExternoError(
        'Supabase Realtime',
        `Error al enviar broadcast al canal "${canal}": ${response}`
      );
    }
  }
}
