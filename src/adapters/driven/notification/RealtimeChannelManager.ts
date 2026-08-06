import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Configuración de reconexión para canales Realtime.
 * Max 5 reintentos con intervalo de 10 segundos entre cada uno.
 * Requirements: 19.1, 19.2, 12.4
 */
export interface ReconexionConfig {
  /** Máximo número de reintentos antes de desistir */
  maxReintentos: number;
  /** Intervalo entre reintentos en milisegundos */
  intervaloMs: number;
  /** Callback cuando la reconexión falla definitivamente */
  onFalloDefinitivo?: (canal: string) => void;
  /** Callback cuando se reconecta exitosamente */
  onReconectado?: (canal: string) => void;
  /** Callback cuando se pierde la conexión */
  onDesconectado?: (canal: string) => void;
}

/** Configuración por defecto según spec (max 5 reintentos, 10s intervalo) */
const DEFAULT_RECONEXION_CONFIG: ReconexionConfig = {
  maxReintentos: 5,
  intervaloMs: 10_000,
};

/**
 * Información de un canal suscrito con su estado de reconexión.
 */
interface CanalSuscrito {
  nombre: string;
  channel: RealtimeChannel;
  eventos: Map<string, (payload: unknown) => void>;
  reintentos: number;
  reconexionTimer?: ReturnType<typeof setTimeout>;
  activo: boolean;
}

/**
 * Gestiona los canales de Supabase Realtime con reconexión automática.
 *
 * Canales del sistema:
 * - pedidos:vendedor → Nuevos pedidos para el vendedor
 * - pedido:estado:{id} → Cambios de estado de un pedido
 * - ubicacion:{id} → Ubicación GPS del repartidor
 * - inventario:alertas → Alertas de inventario bajo
 * - notificaciones:{userId} → Notificaciones del usuario
 *
 * Implementa reconexión automática con max 5 reintentos y 10s de intervalo.
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 12.4
 */
export class RealtimeChannelManager {
  private canales: Map<string, CanalSuscrito> = new Map();
  private config: ReconexionConfig;
  private disposed: boolean = false;

  constructor(
    private readonly supabase: SupabaseClient,
    config?: Partial<ReconexionConfig>
  ) {
    this.config = { ...DEFAULT_RECONEXION_CONFIG, ...config };
  }

  /**
   * Suscribe a un canal de broadcast con reconexión automática.
   * @param nombre - Nombre del canal (ej: 'pedidos:vendedor')
   * @param evento - Tipo de evento a escuchar
   * @param callback - Función a ejecutar cuando llega un evento
   * @returns El canal de Realtime para referencia
   */
  suscribir(
    nombre: string,
    evento: string,
    callback: (payload: unknown) => void
  ): RealtimeChannel {
    // Si ya existe el canal, agregar el evento
    const existente = this.canales.get(nombre);
    if (existente) {
      existente.eventos.set(evento, callback);
      return existente.channel;
    }

    const eventos = new Map<string, (payload: unknown) => void>();
    eventos.set(evento, callback);

    const channel = this.crearCanal(nombre, eventos);

    const canalSuscrito: CanalSuscrito = {
      nombre,
      channel,
      eventos,
      reintentos: 0,
      activo: true,
    };

    this.canales.set(nombre, canalSuscrito);
    return channel;
  }

  /**
   * Desuscribe de un canal específico y limpia recursos.
   * @param nombre - Nombre del canal
   */
  desuscribir(nombre: string): void {
    const canal = this.canales.get(nombre);
    if (!canal) return;

    canal.activo = false;
    if (canal.reconexionTimer) {
      clearTimeout(canal.reconexionTimer);
    }
    this.supabase.removeChannel(canal.channel);
    this.canales.delete(nombre);
  }

  /**
   * Desuscribe de todos los canales y libera recursos.
   */
  desuscribirTodos(): void {
    this.disposed = true;
    for (const [nombre] of this.canales) {
      this.desuscribir(nombre);
    }
  }

  /**
   * Obtiene los nombres de los canales actualmente suscritos.
   */
  getCanalesActivos(): string[] {
    return Array.from(this.canales.keys()).filter(
      (nombre) => this.canales.get(nombre)?.activo
    );
  }

  /**
   * Obtiene el estado de un canal.
   */
  getEstadoCanal(nombre: string): { activo: boolean; reintentos: number } | null {
    const canal = this.canales.get(nombre);
    if (!canal) return null;
    return { activo: canal.activo, reintentos: canal.reintentos };
  }

  /**
   * Crea un canal de Supabase Realtime con todos los eventos configurados.
   */
  private crearCanal(
    nombre: string,
    eventos: Map<string, (payload: unknown) => void>
  ): RealtimeChannel {
    let channel = this.supabase.channel(nombre);

    for (const [evento, callback] of eventos) {
      channel = channel.on('broadcast', { event: evento }, (payload) => {
        callback(payload);
      });
    }

    channel.subscribe((status) => {
      this.manejarCambioEstado(nombre, status);
    });

    return channel;
  }

  /**
   * Maneja cambios de estado del canal (connected, disconnected, error).
   * Implementa reconexión automática según la configuración.
   */
  private manejarCambioEstado(nombre: string, status: string): void {
    const canal = this.canales.get(nombre);
    if (!canal || this.disposed) return;

    if (status === 'SUBSCRIBED') {
      // Conexión exitosa, resetear reintentos
      canal.reintentos = 0;
      canal.activo = true;
      this.config.onReconectado?.(nombre);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      // Pérdida de conexión - intentar reconexión
      canal.activo = false;
      this.config.onDesconectado?.(nombre);
      this.intentarReconexion(nombre);
    }
  }

  /**
   * Intenta reconectar al canal con lógica de reintentos.
   * Max 5 reintentos con 10 segundos de intervalo.
   */
  private intentarReconexion(nombre: string): void {
    const canal = this.canales.get(nombre);
    if (!canal || this.disposed || !canal.eventos.size) return;

    if (canal.reintentos >= this.config.maxReintentos) {
      // Se agotaron los reintentos
      this.config.onFalloDefinitivo?.(nombre);
      return;
    }

    canal.reintentos += 1;

    // Limpiar timer anterior si existe
    if (canal.reconexionTimer) {
      clearTimeout(canal.reconexionTimer);
    }

    canal.reconexionTimer = setTimeout(() => {
      if (this.disposed || !this.canales.has(nombre)) return;

      // Remover canal anterior
      this.supabase.removeChannel(canal.channel);

      // Crear nuevo canal con los mismos eventos
      const nuevoChannel = this.crearCanal(nombre, canal.eventos);
      canal.channel = nuevoChannel;
    }, this.config.intervaloMs);
  }
}
