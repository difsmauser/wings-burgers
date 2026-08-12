/**
 * Categorías de productos del menú.
 */
export enum Categoria {
  ALITAS = 'ALITAS',
  HAMBURGUESAS = 'HAMBURGUESAS',
  BEBIDAS = 'BEBIDAS',
  OTROS = 'OTROS',
}

/**
 * Estados posibles de un pedido (máquina de estados secuencial).
 */
export enum EstadoPedido {
  RECIBIDO = 'RECIBIDO',
  EN_PREPARACION = 'EN_PREPARACION',
  EMPACADO = 'EMPACADO',
  LISTO_PARA_SERVIR = 'LISTO_PARA_SERVIR',
  SERVIDO = 'SERVIDO',
  EN_CAMINO = 'EN_CAMINO',
  ENTREGADO = 'ENTREGADO',
}

/**
 * Modalidad de servicio del pedido.
 */
export enum ModalidadServicio {
  LOCAL = 'LOCAL',
  DOMICILIO = 'DOMICILIO',
}

/**
 * Métodos de pago disponibles.
 */
export enum MetodoPago {
  MERCADO_PAGO = 'MERCADO_PAGO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

/**
 * Estados posibles de un pago.
 */
export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  RECHAZADO = 'RECHAZADO',
  CANCELADO = 'CANCELADO',
}

/**
 * Estados posibles de una entrega a domicilio.
 */
export enum EstadoEntrega {
  PENDIENTE = 'PENDIENTE',
  EN_CAMINO = 'EN_CAMINO',
  ENTREGADO = 'ENTREGADO',
  FALLIDO = 'FALLIDO',
}

/**
 * Tipos de movimiento de inventario.
 */
export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
}

/**
 * Categorías de gastos del negocio.
 */
export enum CategoriaGasto {
  INSUMOS = 'INSUMOS',
  SERVICIOS = 'SERVICIOS',
  NOMINA = 'NOMINA',
  MANTENIMIENTO = 'MANTENIMIENTO',
  MARKETING = 'MARKETING',
  RENTA = 'RENTA',
  OTROS = 'OTROS',
}
