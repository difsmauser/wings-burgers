import { SupabaseClient } from '@supabase/supabase-js';
import { RealtimeChannelManager, ReconexionConfig } from '@/adapters/driven/notification/RealtimeChannelManager';

/**
 * Tipos de notificación soportados por el sistema.
 */
export type TipoNotificacion =
  | 'nuevo_pedido'
  | 'cambio_estado'
  | 'ubicacion_repartidor'
  | 'inventario_bajo'
  | 'entrega_disponible'
  | 'push';

/**
 * Callback para manejar notificaciones entrantes.
 */
export type NotificacionCallback = (tipo: TipoNotificacion, payload: unknown) => void;

/**
 * Estado de conexión del sistema de notificaciones.
 */
export type EstadoConexion = 'conectado' | 'reconectando' | 'desconectado';

/**
 * Gestor de notificaciones del lado del cliente.
 *
 * Configura suscripciones a los canales Supabase Realtime según el rol del usuario:
 * - Vendedor: pedidos:vendedor, inventario:alertas
 * - Cliente: pedido:estado:{id}, ubicacion:{id}
 * - Admin: inventario:alertas, notificaciones:{userId}
 * - Repartidor: repartidor, notificaciones:{userId}
 *
 * Implementa:
 * - Reconexión automática (max 5 reintentos, 10s intervalo)
 * - Fallback a notificación in-app cuando push no está disponible
 * - Gestión del permiso de notificaciones del navegador
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
export class NotificationManager {
  private channelManager: RealtimeChannelManager;
  private callbacks: Set<NotificacionCallback> = new Set();
  private estadoConexion: EstadoConexion = 'desconectado';
  private onEstadoCambia?: (estado: EstadoConexion) => void;

  constructor(
    private readonly supabase: SupabaseClient,
    config?: Partial<ReconexionConfig>
  ) {
    this.channelManager = new RealtimeChannelManager(supabase, {
      ...config,
      onReconectado: (canal) => {
        this.estadoConexion = 'conectado';
        this.onEstadoCambia?.('conectado');
      },
      onDesconectado: (canal) => {
        this.estadoConexion = 'reconectando';
        this.onEstadoCambia?.('reconectando');
      },
      onFalloDefinitivo: (canal) => {
        this.estadoConexion = 'desconectado';
        this.onEstadoCambia?.('desconectado');
      },
    });
  }

  /**
   * Registra un listener para cambios de estado de conexión.
   */
  onEstadoConexion(callback: (estado: EstadoConexion) => void): void {
    this.onEstadoCambia = callback;
  }

  /**
   * Obtiene el estado actual de la conexión.
   */
  getEstadoConexion(): EstadoConexion {
    return this.estadoConexion;
  }

  /**
   * Agrega un callback para recibir notificaciones.
   */
  onNotificacion(callback: NotificacionCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Suscribe al canal de nuevos pedidos (para vendedor).
   * Canal: pedidos:vendedor
   * Requirement: 19.1
   */
  suscribirPedidosVendedor(): void {
    this.channelManager.suscribir(
      'pedidos:vendedor',
      'nuevo_pedido',
      (payload) => this.emitir('nuevo_pedido', payload)
    );
    this.estadoConexion = 'conectado';
  }

  /**
   * Suscribe a cambios de estado de un pedido específico.
   * Canal: pedido:estado:{pedidoId}
   * Requirement: 19.2
   */
  suscribirEstadoPedido(pedidoId: string): void {
    this.channelManager.suscribir(
      `pedido:estado:${pedidoId}`,
      'cambio_estado',
      (payload) => this.emitir('cambio_estado', payload)
    );
    this.estadoConexion = 'conectado';
  }

  /**
   * Suscribe a actualizaciones de ubicación del repartidor.
   * Canal: ubicacion:{pedidoId}
   * Requirement: 15.1, 15.2
   */
  suscribirUbicacionRepartidor(pedidoId: string): void {
    this.channelManager.suscribir(
      `ubicacion:${pedidoId}`,
      'ubicacion_actualizada',
      (payload) => this.emitir('ubicacion_repartidor', payload)
    );
    this.estadoConexion = 'conectado';
  }

  /**
   * Suscribe a alertas de inventario bajo (para admin).
   * Canal: inventario:alertas
   * Requirement: 19.4
   */
  suscribirInventarioAlertas(): void {
    this.channelManager.suscribir(
      'inventario:alertas',
      'inventario_bajo',
      (payload) => this.emitir('inventario_bajo', payload)
    );
    this.estadoConexion = 'conectado';
  }

  /**
   * Suscribe a entregas disponibles (para repartidor).
   * Canal: repartidor
   * Requirement: 19.3
   */
  suscribirEntregasDisponibles(): void {
    this.channelManager.suscribir(
      'repartidor',
      'entrega_disponible',
      (payload) => this.emitir('entrega_disponible', payload)
    );
    this.estadoConexion = 'conectado';
  }

  /**
   * Suscribe al canal de notificaciones personales del usuario.
   * Canal: notificaciones:{userId}
   * Requirement: 19.5
   */
  suscribirNotificacionesUsuario(userId: string): void {
    this.channelManager.suscribir(
      `notificaciones:${userId}`,
      'push',
      (payload) => this.emitir('push', payload)
    );
    this.estadoConexion = 'conectado';
  }

  /**
   * Desuscribe de un canal por su nombre completo.
   */
  desuscribir(canal: string): void {
    this.channelManager.desuscribir(canal);
  }

  /**
   * Desuscribe de todos los canales y libera recursos.
   */
  desconectar(): void {
    this.channelManager.desuscribirTodos();
    this.callbacks.clear();
    this.estadoConexion = 'desconectado';
  }

  /**
   * Obtiene los canales actualmente suscritos.
   */
  getCanalesActivos(): string[] {
    return this.channelManager.getCanalesActivos();
  }

  /**
   * Solicita permiso para notificaciones push del navegador.
   * @returns true si el permiso fue concedido
   */
  async solicitarPermisoNotificaciones(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permiso = await Notification.requestPermission();
    return permiso === 'granted';
  }

  /**
   * Registra la suscripción push del service worker en el servidor.
   * @param userId - ID del usuario
   * @param subscription - Suscripción del Service Worker
   */
  async registrarSuscripcionPush(
    userId: string,
    subscription: PushSubscription
  ): Promise<void> {
    const keys = subscription.toJSON().keys;

    await this.supabase.from('push_suscripcion').upsert({
      usuario_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keys?.p256dh ?? '',
      auth: keys?.auth ?? '',
      activa: true,
      creado_en: new Date().toISOString(),
    }, {
      onConflict: 'usuario_id',
    });
  }

  /**
   * Emite una notificación a todos los callbacks registrados.
   */
  private emitir(tipo: TipoNotificacion, payload: unknown): void {
    for (const callback of this.callbacks) {
      try {
        callback(tipo, payload);
      } catch {
        // No propagar errores de callbacks individuales
      }
    }
  }
}
