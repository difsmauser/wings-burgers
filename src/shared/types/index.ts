// Shared - Type Definitions
// Tipos compartidos y utilidades de tipos para el sistema

/**
 * Parámetros de paginación para consultas
 */
export interface Paginacion {
  /** Página actual (inicia en 1) */
  pagina: number;
  /** Cantidad de elementos por página */
  porPagina: number;
}

/**
 * Resultado paginado genérico
 */
export interface ResultadoPaginado<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

/**
 * Resultado paginado de pedidos
 */
export interface PedidoPaginado {
  datos: import('@/shared/domain-types').Pedido[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

/**
 * Filtros para consulta de productos
 */
export interface FiltroProducto {
  /** Nombre parcial del producto */
  nombre?: string;
  /** Categoría del producto */
  categoria?: string;
  /** Solo productos disponibles */
  disponible?: boolean;
  /** Precio mínimo */
  precioMin?: number;
  /** Precio máximo */
  precioMax?: number;
}

/**
 * Filtros para consulta de clientes
 */
export interface FiltroCliente {
  /** Nombre parcial del cliente */
  nombre?: string;
  /** Número mínimo de pedidos en los últimos 30 días */
  pedidosMinimos?: number;
  /** Monto total gastado mínimo */
  montoTotalMin?: number;
  /** Paginación */
  paginacion?: Paginacion;
}

/**
 * Filtros para consulta de gastos
 */
export interface FiltroGasto {
  /** Categoría del gasto */
  categoria?: string;
  /** Fecha de inicio del rango */
  fechaInicio?: Date;
  /** Fecha de fin del rango */
  fechaFin?: Date;
  /** Monto mínimo */
  montoMin?: number;
  /** Monto máximo */
  montoMax?: number;
}

/**
 * Resumen de gastos agrupados por categoría
 */
export interface ResumenGastoCategoria {
  /** Nombre de la categoría */
  categoria: string;
  /** Suma total de gastos en la categoría */
  total: number;
  /** Número de registros en la categoría */
  cantidad: number;
}

/**
 * Preferencia de pago generada por el gateway
 */
export interface PreferenciaPago {
  /** Identificador de la preferencia */
  id: string;
  /** URL de redirección al gateway de pago */
  urlPago: string;
  /** URL de retorno al completar */
  urlRetorno: string;
  /** Monto total */
  monto: number;
  /** Fecha de expiración de la preferencia */
  expiracion: Date;
}

/**
 * Estado del pago
 */
export type EstadoPago = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado' | 'en_proceso';

/**
 * Notificación de pago recibida del gateway
 */
export interface NotificacionPago {
  /** Identificador del pago */
  pagoId: string;
  /** Identificador del pedido asociado */
  pedidoId: string;
  /** Estado resultante del pago */
  estado: EstadoPago;
  /** Monto pagado */
  monto: number;
  /** Fecha de la transacción */
  fecha: Date;
}

/**
 * Resultado del envío de un mensaje o notificación
 */
export interface ResultadoEnvio {
  /** Si el envío fue exitoso */
  exitoso: boolean;
  /** Identificador del mensaje enviado */
  mensajeId?: string;
  /** Error en caso de fallo */
  error?: string;
  /** Fecha y hora del envío */
  fecha: Date;
}

/**
 * Coordenadas geográficas
 */
export interface Coordenadas {
  /** Latitud */
  lat: number;
  /** Longitud */
  lng: number;
}

/**
 * Tipo de movimiento de inventario
 */
export type TipoMovimiento = 'entrada' | 'salida';

/**
 * Registro de movimiento de inventario
 */
export interface MovimientoInventario {
  /** Identificador único del movimiento */
  id?: string;
  /** Identificador del artículo de inventario */
  articuloId: string;
  /** Cantidad anterior */
  cantidadAnterior: number;
  /** Cantidad nueva */
  cantidadNueva: number;
  /** Tipo de movimiento */
  tipoMovimiento: TipoMovimiento;
  /** Identificador del administrador que realizó el cambio */
  adminId: string;
  /** Fecha del movimiento */
  fecha: Date;
}
