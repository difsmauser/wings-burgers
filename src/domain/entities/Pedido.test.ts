import { describe, it, expect } from 'vitest';
import { Pedido } from './Pedido';
import { Precio, EstadoPedido, ModalidadServicio } from '@/domain/value-objects';
import {
  ValidacionError,
  TransicionEstadoInvalidaError,
  PedidoMaximoItemsError,
} from '@/shared/errors';

function crearPedidoBase(overrides: Partial<Parameters<typeof Pedido.crear>[0]> = {}) {
  return Pedido.crear({
    id: 'pedido-1',
    numero: 'P001',
    clienteId: 'cliente-1',
    modalidad: ModalidadServicio.LOCAL,
    ...overrides,
  });
}

function productoMock(precio = 100) {
  return { id: 'prod-1', nombre: 'Alitas BBQ', precio: Precio.crear(precio) };
}

describe('Pedido', () => {
  describe('crear', () => {
    it('crea un pedido con datos válidos', () => {
      const pedido = crearPedidoBase();

      expect(pedido.id).toBe('pedido-1');
      expect(pedido.numero).toBe('P001');
      expect(pedido.clienteId).toBe('cliente-1');
      expect(pedido.estado).toBe(EstadoPedido.RECIBIDO);
      expect(pedido.modalidad).toBe(ModalidadServicio.LOCAL);
      expect(pedido.items).toHaveLength(0);
    });

    it('lanza ValidacionError si falta id', () => {
      expect(() => crearPedidoBase({ id: '' })).toThrow(ValidacionError);
    });

    it('lanza ValidacionError si falta numero', () => {
      expect(() => crearPedidoBase({ numero: '' })).toThrow(ValidacionError);
    });

    it('lanza ValidacionError si falta clienteId', () => {
      expect(() => crearPedidoBase({ clienteId: '' })).toThrow(ValidacionError);
    });
  });

  describe('agregarItem', () => {
    it('agrega un item correctamente', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 2);

      expect(pedido.items).toHaveLength(1);
      expect(pedido.items[0].productoId).toBe('prod-1');
      expect(pedido.items[0].cantidad).toBe(2);
    });

    it('recalcula el total al agregar', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(100), 2);

      // subtotal = 100 * 2 = 200, impuestos = 0.01 (mínimo, sin IVA), total = 200
      expect(pedido.subtotal.valor).toBe(200);
      expect(pedido.impuestos.valor).toBe(0.01);
      expect(pedido.total.valor).toBe(200);
    });

    it('agrega personalizaciones al item', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1, [
        { nombre: 'Picante', opcion: 'Alto', precioExtra: 10 },
      ]);

      expect(pedido.items[0].personalizaciones).toHaveLength(1);
      expect(pedido.items[0].personalizaciones[0].nombre).toBe('Picante');
    });

    it('lanza error si cantidad es menor a 1', () => {
      const pedido = crearPedidoBase();
      expect(() => pedido.agregarItem(productoMock(), 0)).toThrow(ValidacionError);
    });

    it('lanza PedidoMaximoItemsError si se exceden 50 items', () => {
      const pedido = crearPedidoBase();
      for (let i = 0; i < 50; i++) {
        pedido.agregarItem(
          { id: `prod-${i}`, nombre: `Producto ${i}`, precio: Precio.crear(10) },
          1
        );
      }

      expect(() => pedido.agregarItem(productoMock(), 1)).toThrow(PedidoMaximoItemsError);
    });

    it('lanza error si el pedido no está en estado modificable', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1);
      pedido.confirmar(); // pasa a EN_PREPARACION -> luego EMPACADO
      pedido.cambiarEstado(EstadoPedido.EMPACADO);

      expect(() => pedido.agregarItem(productoMock(), 1)).toThrow(ValidacionError);
    });
  });

  describe('eliminarItem', () => {
    it('elimina un item existente', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1);
      const detalleId = pedido.items[0].id;

      pedido.eliminarItem(detalleId);

      expect(pedido.items).toHaveLength(0);
    });

    it('lanza error si el item no existe', () => {
      const pedido = crearPedidoBase();
      expect(() => pedido.eliminarItem('no-existe')).toThrow(ValidacionError);
    });

    it('lanza error si el estado no permite modificaciones', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1);
      pedido.confirmar();
      pedido.cambiarEstado(EstadoPedido.EMPACADO);

      expect(() => pedido.eliminarItem(pedido.items[0].id)).toThrow(ValidacionError);
    });
  });

  describe('modificarCantidad', () => {
    it('modifica la cantidad de un item', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(50), 1);
      const detalleId = pedido.items[0].id;

      pedido.modificarCantidad(detalleId, 5);

      expect(pedido.items[0].cantidad).toBe(5);
      // subtotal = 50 * 5 = 250
      expect(pedido.subtotal.valor).toBe(250);
    });

    it('lanza error si la cantidad es menor a 1', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 2);
      const detalleId = pedido.items[0].id;

      expect(() => pedido.modificarCantidad(detalleId, 0)).toThrow(ValidacionError);
    });

    it('lanza error si el item no existe', () => {
      const pedido = crearPedidoBase();
      expect(() => pedido.modificarCantidad('no-existe', 3)).toThrow(ValidacionError);
    });
  });

  describe('recalcularTotal', () => {
    it('calcula subtotal, impuestos y total correctamente', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(
        { id: 'p1', nombre: 'Alitas', precio: Precio.crear(150) },
        2
      );
      pedido.agregarItem(
        { id: 'p2', nombre: 'Hamburguesa', precio: Precio.crear(100) },
        1
      );

      // subtotal = (150*2) + (100*1) = 400
      // impuestos = 0.01 (mínimo, sin IVA)
      // total = 400
      expect(pedido.subtotal.valor).toBe(400);
      expect(pedido.impuestos.valor).toBe(0.01);
      expect(pedido.total.valor).toBe(400);
    });

    it('establece valores mínimos cuando no hay items', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1);
      const detalleId = pedido.items[0].id;
      pedido.eliminarItem(detalleId);

      expect(pedido.subtotal.valor).toBe(0.01);
      expect(pedido.impuestos.valor).toBe(0.01);
      expect(pedido.total.valor).toBe(0.01);
    });
  });

  describe('cambiarEstado - máquina de estados', () => {
    it('transición RECIBIDO → EN_PREPARACION', () => {
      const pedido = crearPedidoBase();
      pedido.cambiarEstado(EstadoPedido.EN_PREPARACION);
      expect(pedido.estado).toBe(EstadoPedido.EN_PREPARACION);
    });

    it('transición EN_PREPARACION → EMPACADO', () => {
      const pedido = crearPedidoBase();
      pedido.cambiarEstado(EstadoPedido.EN_PREPARACION);
      pedido.cambiarEstado(EstadoPedido.EMPACADO);
      expect(pedido.estado).toBe(EstadoPedido.EMPACADO);
    });

    it('transición EMPACADO → LISTO_PARA_SERVIR → SERVIDO para LOCAL', () => {
      const pedido = crearPedidoBase({ modalidad: ModalidadServicio.LOCAL });
      pedido.cambiarEstado(EstadoPedido.EN_PREPARACION);
      pedido.cambiarEstado(EstadoPedido.EMPACADO);
      pedido.cambiarEstado(EstadoPedido.LISTO_PARA_SERVIR);
      expect(pedido.estado).toBe(EstadoPedido.LISTO_PARA_SERVIR);
      pedido.cambiarEstado(EstadoPedido.SERVIDO);
      expect(pedido.estado).toBe(EstadoPedido.SERVIDO);
    });

    it('transición EMPACADO → EN_CAMINO para DOMICILIO', () => {
      const pedido = crearPedidoBase({ modalidad: ModalidadServicio.DOMICILIO });
      pedido.cambiarEstado(EstadoPedido.EN_PREPARACION);
      pedido.cambiarEstado(EstadoPedido.EMPACADO);
      pedido.cambiarEstado(EstadoPedido.EN_CAMINO);
      expect(pedido.estado).toBe(EstadoPedido.EN_CAMINO);
    });

    it('transición EN_CAMINO → ENTREGADO', () => {
      const pedido = crearPedidoBase({ modalidad: ModalidadServicio.DOMICILIO });
      pedido.cambiarEstado(EstadoPedido.EN_PREPARACION);
      pedido.cambiarEstado(EstadoPedido.EMPACADO);
      pedido.cambiarEstado(EstadoPedido.EN_CAMINO);
      pedido.cambiarEstado(EstadoPedido.ENTREGADO);
      expect(pedido.estado).toBe(EstadoPedido.ENTREGADO);
    });

    it('lanza error en transición inválida RECIBIDO → EMPACADO', () => {
      const pedido = crearPedidoBase();
      expect(() => pedido.cambiarEstado(EstadoPedido.EMPACADO)).toThrow(
        TransicionEstadoInvalidaError
      );
    });

    it('lanza error en transición inválida RECIBIDO → ENTREGADO', () => {
      const pedido = crearPedidoBase();
      expect(() => pedido.cambiarEstado(EstadoPedido.ENTREGADO)).toThrow(
        TransicionEstadoInvalidaError
      );
    });

    it('lanza error si EMPACADO → SERVIDO con modalidad DOMICILIO', () => {
      const pedido = crearPedidoBase({ modalidad: ModalidadServicio.DOMICILIO });
      pedido.cambiarEstado(EstadoPedido.EN_PREPARACION);
      pedido.cambiarEstado(EstadoPedido.EMPACADO);

      expect(() => pedido.cambiarEstado(EstadoPedido.SERVIDO)).toThrow(
        TransicionEstadoInvalidaError
      );
    });

    it('lanza error si EMPACADO → EN_CAMINO con modalidad LOCAL', () => {
      const pedido = crearPedidoBase({ modalidad: ModalidadServicio.LOCAL });
      pedido.cambiarEstado(EstadoPedido.EN_PREPARACION);
      pedido.cambiarEstado(EstadoPedido.EMPACADO);

      expect(() => pedido.cambiarEstado(EstadoPedido.EN_CAMINO)).toThrow(
        TransicionEstadoInvalidaError
      );
    });
  });

  describe('confirmar', () => {
    it('confirma un pedido con items pasándolo a EN_PREPARACION', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1);
      pedido.confirmar();

      expect(pedido.estado).toBe(EstadoPedido.EN_PREPARACION);
    });

    it('lanza error si el pedido no tiene items', () => {
      const pedido = crearPedidoBase();
      expect(() => pedido.confirmar()).toThrow(ValidacionError);
    });

    it('lanza error si el pedido no está en estado RECIBIDO', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1);
      pedido.confirmar();

      expect(() => pedido.confirmar()).toThrow(ValidacionError);
    });
  });

  describe('puedeAgregarProductos', () => {
    it('retorna true para pedido vacío en estado RECIBIDO', () => {
      const pedido = crearPedidoBase();
      expect(pedido.puedeAgregarProductos()).toBe(true);
    });

    it('retorna true para pedido en estado EN_PREPARACION con menos de 50 items', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1);
      pedido.cambiarEstado(EstadoPedido.EN_PREPARACION);
      expect(pedido.puedeAgregarProductos()).toBe(true);
    });

    it('retorna false para pedido con 50 items', () => {
      const pedido = crearPedidoBase();
      for (let i = 0; i < 50; i++) {
        pedido.agregarItem(
          { id: `prod-${i}`, nombre: `Producto ${i}`, precio: Precio.crear(10) },
          1
        );
      }
      expect(pedido.puedeAgregarProductos()).toBe(false);
    });

    it('retorna false para pedido en estado EMPACADO', () => {
      const pedido = crearPedidoBase();
      pedido.agregarItem(productoMock(), 1);
      pedido.confirmar();
      pedido.cambiarEstado(EstadoPedido.EMPACADO);
      expect(pedido.puedeAgregarProductos()).toBe(false);
    });
  });
});
