// Application Layer - Use Cases
// Casos de uso que orquestan la lógica de dominio
export { CrearProducto, EditarProducto, EliminarProducto } from './productos';
export { RegistrarGasto, ConsultarGastos } from './gastos';
export type { RegistrarGastoDTO } from './gastos';
export { GenerarCorte } from './cortes';
export { RegistrarArticulo, ActualizarCantidad, VerificarDisponibilidad } from './inventario';
export type { RegistrarArticuloDTO } from './inventario';
export { CrearPedido, ActualizarEstadoPedido, AgregarProductoAPedido, ConfirmarPedido } from './pedidos';
export { NotificarNuevoPedido, NotificarCambioEstado, EnviarCuentaCliente, NotificarInventarioBajo } from './notificaciones';
export type { CanalEnvio } from './notificaciones';
export { AceptarEntrega, ActualizarUbicacion, CompletarEntrega, MarcarEntregaFallida } from './entregas';
export { IniciarPagoMercadoPago, ConfirmarPago, VerificarComprobante } from './pagos';
