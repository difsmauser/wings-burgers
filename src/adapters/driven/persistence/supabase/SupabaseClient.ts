import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Variables de entorno requeridas para Supabase.
 * NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY se exponen al cliente.
 * SUPABASE_SERVICE_ROLE_KEY solo se usa server-side.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Cliente Supabase singleton con inicialización diferida.
 * Evita fallar en build time cuando las variables de entorno no están disponibles.
 */
let _supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas.'
    );
  }

  _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return _supabaseClient;
}

/**
 * Cliente Supabase para uso en el lado del cliente (browser).
 * Usa la clave anónima con Row Level Security.
 * Acceder mediante la propiedad getter para inicialización lazy.
 */
export const supabaseClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabaseClient(), prop);
  },
});

/**
 * Crea un cliente Supabase para uso server-side con permisos elevados.
 * Solo usar en API Routes o server components.
 */
export function createServerClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY es requerida para operaciones server-side.');
  }
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL es requerida para operaciones server-side.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Canales de Supabase Realtime para el sistema.
 */
export const REALTIME_CHANNELS = {
  /** Nuevos pedidos notificados al vendedor */
  PEDIDOS_VENDEDOR: 'pedidos:vendedor',
  /** Cambios de estado de un pedido específico → cliente */
  ESTADO_PEDIDO: (pedidoId: string) => `pedido:estado:${pedidoId}`,
  /** Ubicación GPS del repartidor → cliente */
  UBICACION_REPARTIDOR: (pedidoId: string) => `ubicacion:${pedidoId}`,
  /** Alertas de inventario bajo → admin */
  INVENTARIO_ALERTA: 'inventario:alertas',
  /** Notificaciones generales para un usuario */
  NOTIFICACIONES: (userId: string) => `notificaciones:${userId}`,
} as const;

/**
 * Suscribirse a un canal de Realtime.
 * Retorna el canal para poder desuscribirse después.
 */
export function subscribeToChannel(
  channelName: string,
  event: string,
  callback: (payload: unknown) => void
): RealtimeChannel {
  const channel = supabaseClient
    .channel(channelName)
    .on('broadcast', { event }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return channel;
}

/**
 * Suscribirse a cambios en una tabla (postgres_changes).
 */
export function subscribeToTableChanges(
  channelName: string,
  table: string,
  filter: string | undefined,
  callback: (payload: unknown) => void
): RealtimeChannel {
  const channel = supabaseClient
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Desuscribirse de un canal de Realtime.
 */
export function unsubscribeFromChannel(channel: RealtimeChannel): void {
  supabaseClient.removeChannel(channel);
}
