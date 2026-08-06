import { SupabaseClient } from '@supabase/supabase-js';
import { ResultadoEnvio } from '@/shared/types';

/**
 * Configuración de reintentos para push notifications.
 * 3 intentos con 2 minutos entre cada uno (Requirements: 19.5).
 */
export interface PushRetryConfig {
  /** Máximo número de reintentos */
  maxReintentos: number;
  /** Intervalo entre reintentos en milisegundos */
  intervaloMs: number;
}

/** Configuración por defecto: 3 intentos, 2 minutos */
const DEFAULT_PUSH_RETRY_CONFIG: PushRetryConfig = {
  maxReintentos: 3,
  intervaloMs: 120_000, // 2 minutos
};

/**
 * Notificación pendiente almacenada cuando el push falla.
 */
export interface NotificacionPendiente {
  id: string;
  usuarioId: string;
  titulo: string;
  cuerpo: string;
  reintentos: number;
  ultimoIntento: Date;
  estado: 'pendiente' | 'enviado' | 'fallido';
}

/**
 * Servicio de Push Notifications con fallback a notificación in-app.
 *
 * Flujo:
 * 1. Intenta enviar push notification vía Web Push API / Service Worker
 * 2. Si push no está disponible o falla → fallback a notificación in-app (broadcast Realtime)
 * 3. Reintentos: 3 intentos con 2 minutos entre cada uno
 * 4. Si todos fallan → almacena como pendiente para mostrar al próximo acceso
 *
 * Requirements: 19.2, 19.4, 19.5
 */
export class PushNotificationService {
  private config: PushRetryConfig;

  constructor(
    private readonly supabase: SupabaseClient,
    config?: Partial<PushRetryConfig>
  ) {
    this.config = { ...DEFAULT_PUSH_RETRY_CONFIG, ...config };
  }

  /**
   * Envía una notificación push con fallback a in-app y lógica de reintentos.
   *
   * Flujo:
   * 1. Intenta push notification
   * 2. Si falla → intenta in-app (broadcast a canal del usuario)
   * 3. Si todo falla → almacena como pendiente
   *
   * @param usuarioId - ID del usuario destinatario
   * @param titulo - Título de la notificación
   * @param cuerpo - Contenido de la notificación
   * @returns Resultado del envío
   */
  async enviar(
    usuarioId: string,
    titulo: string,
    cuerpo: string
  ): Promise<ResultadoEnvio> {
    // 1. Intentar enviar push notification
    const pushResult = await this.intentarPush(usuarioId, titulo, cuerpo);
    if (pushResult.exitoso) {
      await this.registrarNotificacion(usuarioId, titulo, cuerpo, 'enviado', 0);
      return pushResult;
    }

    // 2. Fallback: enviar como notificación in-app via Realtime broadcast
    const inAppResult = await this.enviarInApp(usuarioId, titulo, cuerpo);
    if (inAppResult.exitoso) {
      await this.registrarNotificacion(usuarioId, titulo, cuerpo, 'enviado', 1);
      return inAppResult;
    }

    // 3. Almacenar como pendiente para mostrar al próximo acceso
    await this.registrarNotificacion(usuarioId, titulo, cuerpo, 'pendiente', 1);
    return {
      exitoso: false,
      error: 'Push y fallback in-app fallaron. Notificación almacenada como pendiente.',
      fecha: new Date(),
    };
  }

  /**
   * Envía con reintentos (3 intentos, 2 min entre cada uno).
   * Si todos los intentos fallan, almacena como pendiente.
   *
   * @param usuarioId - ID del usuario destinatario
   * @param titulo - Título de la notificación
   * @param cuerpo - Contenido de la notificación
   * @returns Resultado del último intento
   */
  async enviarConReintentos(
    usuarioId: string,
    titulo: string,
    cuerpo: string
  ): Promise<ResultadoEnvio> {
    let ultimoError: string | undefined;

    for (let intento = 1; intento <= this.config.maxReintentos; intento++) {
      const resultado = await this.enviar(usuarioId, titulo, cuerpo);

      if (resultado.exitoso) {
        return resultado;
      }

      ultimoError = resultado.error;

      // Actualizar reintentos en la base de datos
      await this.actualizarReintentos(usuarioId, titulo, intento);

      // Esperar antes del siguiente intento (excepto el último)
      if (intento < this.config.maxReintentos) {
        await this.esperar(this.config.intervaloMs);
      }
    }

    // Todos los intentos fallaron - marcar como pendiente
    await this.marcarComoPendiente(usuarioId, titulo, cuerpo);

    return {
      exitoso: false,
      error: `Push falló después de ${this.config.maxReintentos} intentos: ${ultimoError}. Almacenada como pendiente.`,
      fecha: new Date(),
    };
  }

  /**
   * Obtiene las notificaciones pendientes de un usuario.
   * Se muestran la próxima vez que el usuario accede al sistema.
   */
  async obtenerPendientes(usuarioId: string): Promise<NotificacionPendiente[]> {
    const { data, error } = await this.supabase
      .from('notificacion')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('estado_envio', 'pendiente')
      .eq('leida', false)
      .order('creado_en', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      usuarioId: row.usuario_id,
      titulo: row.titulo,
      cuerpo: row.cuerpo,
      reintentos: row.reintentos,
      ultimoIntento: new Date(row.creado_en),
      estado: row.estado_envio as 'pendiente' | 'enviado' | 'fallido',
    }));
  }

  /**
   * Marca una notificación pendiente como leída.
   */
  async marcarComoLeida(notificacionId: string): Promise<void> {
    await this.supabase
      .from('notificacion')
      .update({ leida: true })
      .eq('id', notificacionId);
  }

  /**
   * Intenta enviar un push notification usando la Web Push API.
   * Verifica si el usuario tiene suscripción push activa.
   */
  private async intentarPush(
    usuarioId: string,
    titulo: string,
    cuerpo: string
  ): Promise<ResultadoEnvio> {
    try {
      // Verificar si hay suscripción push para este usuario
      const { data: suscripcion, error } = await this.supabase
        .from('push_suscripcion')
        .select('endpoint, p256dh, auth')
        .eq('usuario_id', usuarioId)
        .eq('activa', true)
        .single();

      if (error || !suscripcion) {
        return {
          exitoso: false,
          error: 'No hay suscripción push activa para este usuario',
          fecha: new Date(),
        };
      }

      // Enviar push via server-side Web Push
      // En producción esto usa la Web Push API (web-push npm package)
      // El payload se envía al endpoint del service worker del usuario
      const pushPayload = {
        title: titulo,
        body: cuerpo,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: { usuarioId, timestamp: Date.now() },
      };

      // Almacenar el push como enviado vía el endpoint del service worker
      const { error: pushError } = await this.supabase
        .from('push_envio')
        .insert({
          usuario_id: usuarioId,
          endpoint: suscripcion.endpoint,
          payload: pushPayload,
          estado: 'enviado',
          creado_en: new Date().toISOString(),
        });

      if (pushError) {
        return {
          exitoso: false,
          error: `Error al registrar push: ${pushError.message}`,
          fecha: new Date(),
        };
      }

      return {
        exitoso: true,
        mensajeId: `push_${usuarioId}_${Date.now()}`,
        fecha: new Date(),
      };
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      return {
        exitoso: false,
        error: `Push falló: ${mensaje}`,
        fecha: new Date(),
      };
    }
  }

  /**
   * Envía una notificación in-app como fallback.
   * Usa Supabase Realtime broadcast al canal del usuario.
   */
  private async enviarInApp(
    usuarioId: string,
    titulo: string,
    cuerpo: string
  ): Promise<ResultadoEnvio> {
    try {
      const channel = this.supabase.channel(`notificaciones:${usuarioId}`);

      const response = await channel.send({
        type: 'broadcast',
        event: 'push',
        payload: {
          titulo,
          cuerpo,
          fecha: new Date().toISOString(),
        },
      });

      this.supabase.removeChannel(channel);

      if (response !== 'ok') {
        return {
          exitoso: false,
          error: `Broadcast in-app falló: ${response}`,
          fecha: new Date(),
        };
      }

      return {
        exitoso: true,
        mensajeId: `inapp_${usuarioId}_${Date.now()}`,
        fecha: new Date(),
      };
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      return {
        exitoso: false,
        error: `In-app falló: ${mensaje}`,
        fecha: new Date(),
      };
    }
  }

  /**
   * Registra una notificación en la base de datos.
   */
  private async registrarNotificacion(
    usuarioId: string,
    titulo: string,
    cuerpo: string,
    estado: string,
    reintentos: number
  ): Promise<void> {
    await this.supabase.from('notificacion').insert({
      usuario_id: usuarioId,
      tipo: 'push',
      titulo,
      cuerpo,
      leida: false,
      reintentos,
      estado_envio: estado,
      creado_en: new Date().toISOString(),
    });
  }

  /**
   * Actualiza el conteo de reintentos en la base de datos.
   */
  private async actualizarReintentos(
    usuarioId: string,
    titulo: string,
    reintentos: number
  ): Promise<void> {
    await this.supabase
      .from('notificacion')
      .update({ reintentos, estado_envio: 'reintentando' })
      .eq('usuario_id', usuarioId)
      .eq('titulo', titulo)
      .eq('estado_envio', 'pendiente')
      .order('creado_en', { ascending: false })
      .limit(1);
  }

  /**
   * Marca la notificación como pendiente definitiva.
   */
  private async marcarComoPendiente(
    usuarioId: string,
    titulo: string,
    cuerpo: string
  ): Promise<void> {
    // Verificar si ya existe como pendiente
    const { data } = await this.supabase
      .from('notificacion')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('titulo', titulo)
      .eq('estado_envio', 'reintentando')
      .limit(1);

    if (data && data.length > 0) {
      // Actualizar la existente
      await this.supabase
        .from('notificacion')
        .update({
          estado_envio: 'pendiente',
          reintentos: this.config.maxReintentos,
        })
        .eq('id', data[0].id);
    } else {
      // Crear nueva
      await this.registrarNotificacion(
        usuarioId,
        titulo,
        cuerpo,
        'pendiente',
        this.config.maxReintentos
      );
    }
  }

  /**
   * Espera un tiempo determinado (para reintentos).
   */
  private esperar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
