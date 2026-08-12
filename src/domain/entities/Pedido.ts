import {
  Precio,
  EstadoPedido,
  ModalidadServicio,
  MetodoPago,
  EstadoPago,
} from '@/domain/value-objects';
import {
  ValidacionError,
  TransicionEstadoInvalidaError,
  PedidoMaximoItemsError,
} from '@/shared/errors';

/**
 * Personalización aplicada a un item del pedido.
 */
export interface Personalizacion {
  nombre: string;
  opcion: string;
  precioExtra?: number;
}

/**
 * Detalle de un item dentro del pedido.
 */
export interface PedidoDetalle {
  id: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: Precio;
  personalizaciones: Personalizacion[];
  comentario: string | null;
}

export interface PedidoProps {
  id: string;
  numero: string;
  clienteId: string;
  estado?: EstadoPedido;
  modalidad: ModalidadServicio;
  items?: PedidoDetalle[];
  subtotal?: Precio;
  impuestos?: Precio;
  total?: Precio;
  mesaZona?: string | null;
  observaciones?: string | null;
  metodoPago?: MetodoPago | null;
  estadoPago?: EstadoPago;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

/** Máximo de items permitidos en un pedido. */
const MAX_ITEMS = 50;

/** Tasa de impuestos (0% - productos sin IVA, precio final). */
const TASA_IMPUESTOS = 0;

/**
 * Mapa de transiciones válidas de la máquina de estados del pedido.
 * Cada estado tiene un arreglo de estados destino válidos.
 */
const TRANSICIONES_VALIDAS: Record<EstadoPedido, EstadoPedido[]> = {
  [EstadoPedido.RECIBIDO]: [EstadoPedido.EN_PREPARACION],
  [EstadoPedido.EN_PREPARACION]: [EstadoPedido.EMPACADO],
  [EstadoPedido.EMPACADO]: [EstadoPedido.SERVIDO, EstadoPedido.EN_CAMINO],
  [EstadoPedido.SERVIDO]: [],
  [EstadoPedido.EN_CAMINO]: [EstadoPedido.ENTREGADO],
  [EstadoPedido.ENTREGADO]: [],
};

/**
 * Estados en los que se permite modificar los items del pedido.
 */
const ESTADOS_MODIFICABLES: EstadoPedido[] = [
  EstadoPedido.RECIBIDO,
  EstadoPedido.EN_PREPARACION,
];

/**
 * Entidad de dominio que representa un pedido con máquina de estados.
 * Gestiona items, cálculos de totales y transiciones de estado válidas.
 */
export class Pedido {
  readonly id: string;
  readonly numero: string;
  clienteId: string;
  estado: EstadoPedido;
  modalidad: ModalidadServicio;
  items: PedidoDetalle[];
  subtotal: Precio;
  impuestos: Precio;
  total: Precio;
  mesaZona: string | null;
  observaciones: string | null;
  metodoPago: MetodoPago | null;
  estadoPago: EstadoPago;
  creadoEn: Date;
  actualizadoEn: Date;

  private constructor(props: PedidoProps) {
    this.id = props.id;
    this.numero = props.numero;
    this.clienteId = props.clienteId;
    this.estado = props.estado ?? EstadoPedido.RECIBIDO;
    this.modalidad = props.modalidad;
    this.items = props.items ?? [];
    this.subtotal = props.subtotal ?? Precio.crear(0.01);
    this.impuestos = props.impuestos ?? Precio.crear(0.01);
    this.total = props.total ?? Precio.crear(0.01);
    this.mesaZona = props.mesaZona ?? null;
    this.observaciones = props.observaciones ?? null;
    this.metodoPago = props.metodoPago ?? null;
    this.estadoPago = props.estadoPago ?? EstadoPago.PENDIENTE;
    this.creadoEn = props.creadoEn ?? new Date();
    this.actualizadoEn = props.actualizadoEn ?? new Date();
  }

  /**
   * Crea una nueva instancia de Pedido validando los datos de entrada.
   * @throws ValidacionError si faltan campos obligatorios.
   */
  static crear(props: PedidoProps): Pedido {
    const errores: string[] = [];

    if (!props.id || props.id.trim().length === 0) {
      errores.push('id');
    }
    if (!props.numero || props.numero.trim().length === 0) {
      errores.push('numero');
    }
    if (!props.clienteId || props.clienteId.trim().length === 0) {
      errores.push('clienteId');
    }
    if (!props.modalidad) {
      errores.push('modalidad');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Datos inválidos para pedido: ${errores.join(', ')}`,
        errores
      );
    }

    const pedido = new Pedido(props);

    // Recalcular si hay items iniciales
    if (pedido.items.length > 0) {
      pedido.recalcularTotal();
    }

    return pedido;
  }

  /**
   * Agrega un item al pedido.
   * @throws PedidoMaximoItemsError si se excede el límite de 50 items.
   * @throws ValidacionError si el estado no permite modificaciones.
   */
  agregarItem(
    producto: { id: string; nombre: string; precio: Precio },
    cantidad: number,
    personalizaciones?: Personalizacion[]
  ): void {
    if (!ESTADOS_MODIFICABLES.includes(this.estado)) {
      throw new ValidacionError(
        `No se pueden agregar productos en estado "${this.estado}"`,
        ['estado']
      );
    }

    if (this.items.length >= MAX_ITEMS) {
      throw new PedidoMaximoItemsError(MAX_ITEMS);
    }

    if (cantidad < 1) {
      throw new ValidacionError('La cantidad debe ser al menos 1', ['cantidad']);
    }

    const detalle: PedidoDetalle = {
      id: crypto.randomUUID(),
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad,
      precioUnitario: producto.precio,
      personalizaciones: personalizaciones ?? [],
      comentario: null,
    };

    this.items.push(detalle);
    this.recalcularTotal();
    this.actualizadoEn = new Date();
  }

  /**
   * Elimina un item del pedido por su ID de detalle.
   * @throws ValidacionError si el estado no permite modificaciones o el item no existe.
   */
  eliminarItem(detalleId: string): void {
    if (!ESTADOS_MODIFICABLES.includes(this.estado)) {
      throw new ValidacionError(
        `No se pueden eliminar productos en estado "${this.estado}"`,
        ['estado']
      );
    }

    const index = this.items.findIndex((item) => item.id === detalleId);
    if (index === -1) {
      throw new ValidacionError(
        `No se encontró el item con id "${detalleId}"`,
        ['detalleId']
      );
    }

    this.items.splice(index, 1);
    this.recalcularTotal();
    this.actualizadoEn = new Date();
  }

  /**
   * Modifica la cantidad de un item existente en el pedido.
   * @throws ValidacionError si el estado no permite modificaciones, el item no existe, o la cantidad es inválida.
   */
  modificarCantidad(detalleId: string, cantidad: number): void {
    if (!ESTADOS_MODIFICABLES.includes(this.estado)) {
      throw new ValidacionError(
        `No se pueden modificar productos en estado "${this.estado}"`,
        ['estado']
      );
    }

    if (cantidad < 1) {
      throw new ValidacionError('La cantidad debe ser al menos 1', ['cantidad']);
    }

    const item = this.items.find((i) => i.id === detalleId);
    if (!item) {
      throw new ValidacionError(
        `No se encontró el item con id "${detalleId}"`,
        ['detalleId']
      );
    }

    item.cantidad = cantidad;
    this.recalcularTotal();
    this.actualizadoEn = new Date();
  }

  /**
   * Recalcula subtotal, impuestos y total del pedido.
   * subtotal = sum(precioUnitario * cantidad)
   * impuestos = subtotal * TASA_IMPUESTOS (0 = sin IVA)
   * total = subtotal + impuestos
   */
  recalcularTotal(): void {
    if (this.items.length === 0) {
      this.subtotal = Precio.crear(0.01);
      this.impuestos = Precio.crear(0.01);
      this.total = Precio.crear(0.01);
      return;
    }

    const subtotalValor = this.items.reduce((acc, item) => {
      const itemTotal = item.precioUnitario.valor * item.cantidad;
      return acc + itemTotal;
    }, 0);

    // Round to 2 decimals
    const subtotalRedondeado = Math.round(subtotalValor * 100) / 100;
    const impuestosValor = Math.round(subtotalRedondeado * TASA_IMPUESTOS * 100) / 100;
    const totalValor = Math.round((subtotalRedondeado + impuestosValor) * 100) / 100;

    this.subtotal = Precio.crear(subtotalRedondeado);
    // Precio requires minimum 0.01, use that as floor when no tax
    this.impuestos = Precio.crear(impuestosValor > 0 ? impuestosValor : 0.01);
    this.total = Precio.crear(totalValor > 0 ? totalValor : 0.01);
  }

  /**
   * Cambia el estado del pedido validando las transiciones permitidas según la máquina de estados.
   * Para la transición de EMPACADO, valida que el destino sea coherente con la modalidad.
   * @throws TransicionEstadoInvalidaError si la transición no es válida.
   */
  cambiarEstado(nuevoEstado: EstadoPedido): void {
    const transicionesPermitidas = TRANSICIONES_VALIDAS[this.estado];

    if (!transicionesPermitidas.includes(nuevoEstado)) {
      throw new TransicionEstadoInvalidaError(this.estado, nuevoEstado);
    }

    // Validar coherencia con modalidad en la transición desde EMPACADO
    if (this.estado === EstadoPedido.EMPACADO) {
      if (
        nuevoEstado === EstadoPedido.SERVIDO &&
        this.modalidad !== ModalidadServicio.LOCAL
      ) {
        throw new TransicionEstadoInvalidaError(this.estado, nuevoEstado);
      }
      if (
        nuevoEstado === EstadoPedido.EN_CAMINO &&
        this.modalidad !== ModalidadServicio.DOMICILIO
      ) {
        throw new TransicionEstadoInvalidaError(this.estado, nuevoEstado);
      }
    }

    this.estado = nuevoEstado;
    this.actualizadoEn = new Date();
  }

  /**
   * Confirma el pedido validando que tenga al menos un item.
   * @throws ValidacionError si el pedido no tiene items o ya fue confirmado.
   */
  confirmar(): void {
    if (this.estado !== EstadoPedido.RECIBIDO) {
      throw new ValidacionError(
        'Solo se puede confirmar un pedido en estado RECIBIDO',
        ['estado']
      );
    }

    if (this.items.length === 0) {
      throw new ValidacionError(
        'No se puede confirmar un pedido sin productos',
        ['items']
      );
    }

    this.cambiarEstado(EstadoPedido.EN_PREPARACION);
  }

  /**
   * Verifica si se pueden agregar más productos al pedido.
   * @returns true si el número de items es menor a 50 y el estado permite modificaciones.
   */
  puedeAgregarProductos(): boolean {
    return (
      this.items.length < MAX_ITEMS &&
      ESTADOS_MODIFICABLES.includes(this.estado)
    );
  }
}
