/**
 * Re-exportación del cliente Supabase y utilidades de Realtime.
 * Punto de acceso conveniente para el resto de la aplicación.
 */
export {
  supabaseClient,
  createServerClient,
  REALTIME_CHANNELS,
  subscribeToChannel,
  subscribeToTableChanges,
  unsubscribeFromChannel,
} from '@/adapters/driven/persistence/supabase/SupabaseClient';
