// Shared hooks for the application

export { usePWA } from './usePWA';
export type { PWAState, PWAActions } from './usePWA';

export { useRealtimeChannel } from './useRealtimeChannel';
export type {
  EstadoCanal,
  UseRealtimeChannelOptions,
  UseRealtimeChannelResult,
} from './useRealtimeChannel';

export { useVendedorNotifications } from './useVendedorNotifications';
export type {
  NuevoPedidoPayload,
  UseVendedorNotificationsOptions,
  UseVendedorNotificationsResult,
} from './useVendedorNotifications';

export { usePedidoEstadoNotifications } from './usePedidoEstadoNotifications';
export type {
  CambioEstadoPayload,
  UsePedidoEstadoNotificationsOptions,
  UsePedidoEstadoNotificationsResult,
} from './usePedidoEstadoNotifications';

export { useInventarioAlertas } from './useInventarioAlertas';
export type {
  InventarioBajoPayload,
  UseInventarioAlertasOptions,
  UseInventarioAlertasResult,
} from './useInventarioAlertas';

export { useNotificacionesUsuario } from './useNotificacionesUsuario';
export type {
  NotificacionUsuarioPayload,
  UseNotificacionesUsuarioOptions,
  UseNotificacionesUsuarioResult,
} from './useNotificacionesUsuario';
