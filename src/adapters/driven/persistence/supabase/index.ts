// Driven Adapter - Supabase Persistence
// Implementaciones de repositorios usando Supabase PostgreSQL
export {
  supabaseClient,
  createServerClient,
  REALTIME_CHANNELS,
  subscribeToChannel,
  subscribeToTableChanges,
  unsubscribeFromChannel,
} from './SupabaseClient';

export { SupabaseProductoRepo } from './SupabaseProductoRepo';
export { SupabasePedidoRepo } from './SupabasePedidoRepo';
export { SupabaseClienteRepo } from './SupabaseClienteRepo';
export { SupabaseInventarioRepo } from './SupabaseInventarioRepo';
export { SupabaseGastoRepo } from './SupabaseGastoRepo';
