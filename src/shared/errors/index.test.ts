import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidacionError,
  PrecioFueraDeRangoError,
  PrecioDecimalesInvalidosError,
  TelefonoInvalidoError,
  ArchivoInvalidoError,
  ProductoNoDisponibleError,
  TransicionEstadoInvalidaError,
  LimiteEntregasExcedidoError,
  PedidoMaximoItemsError,
  RecursoNoEncontradoError,
  ServicioExternoError,
  PagoFallidoError,
} from './index';

describe('DomainError hierarchy', () => {
  describe('ValidacionError', () => {
    it('should have correct code, statusCode and campos', () => {
      const error = new ValidacionError('Campos faltantes', ['nombre', 'precio']);
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('VALIDACION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.campos).toEqual(['nombre', 'precio']);
      expect(error.message).toBe('Campos faltantes');
      expect(error.name).toBe('ValidacionError');
    });
  });

  describe('PrecioFueraDeRangoError', () => {
    it('should have correct code, statusCode and valor', () => {
      const error = new PrecioFueraDeRangoError(100000);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('PRECIO_FUERA_DE_RANGO');
      expect(error.statusCode).toBe(400);
      expect(error.valor).toBe(100000);
      expect(error.message).toContain('100000');
    });
  });

  describe('PrecioDecimalesInvalidosError', () => {
    it('should have correct code, statusCode and valor', () => {
      const error = new PrecioDecimalesInvalidosError(10.123);
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('PRECIO_DECIMALES_INVALIDOS');
      expect(error.statusCode).toBe(400);
      expect(error.valor).toBe(10.123);
      expect(error.message).toContain('2 decimales');
    });
  });

  describe('TelefonoInvalidoError', () => {
    it('should have correct code, statusCode and valor', () => {
      const error = new TelefonoInvalidoError('123');
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('TELEFONO_INVALIDO');
      expect(error.statusCode).toBe(400);
      expect(error.valor).toBe('123');
      expect(error.message).toContain('10 dígitos');
    });
  });

  describe('ArchivoInvalidoError', () => {
    it('should have correct code, statusCode and motivo', () => {
      const error = new ArchivoInvalidoError('Formato no soportado');
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('ARCHIVO_INVALIDO');
      expect(error.statusCode).toBe(400);
      expect(error.motivo).toBe('Formato no soportado');
    });
  });

  describe('ProductoNoDisponibleError', () => {
    it('should have correct code, statusCode and productoId', () => {
      const error = new ProductoNoDisponibleError('prod-123');
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('PRODUCTO_NO_DISPONIBLE');
      expect(error.statusCode).toBe(409);
      expect(error.productoId).toBe('prod-123');
    });
  });

  describe('TransicionEstadoInvalidaError', () => {
    it('should have correct code, statusCode and estados', () => {
      const error = new TransicionEstadoInvalidaError('recibido', 'entregado');
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('TRANSICION_ESTADO_INVALIDA');
      expect(error.statusCode).toBe(422);
      expect(error.estadoActual).toBe('recibido');
      expect(error.estadoDestino).toBe('entregado');
      expect(error.message).toContain('recibido');
      expect(error.message).toContain('entregado');
    });
  });

  describe('LimiteEntregasExcedidoError', () => {
    it('should have correct code, statusCode and repartidorId', () => {
      const error = new LimiteEntregasExcedidoError('rep-456');
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('LIMITE_ENTREGAS_EXCEDIDO');
      expect(error.statusCode).toBe(409);
      expect(error.repartidorId).toBe('rep-456');
      expect(error.limite).toBe(3);
    });
  });

  describe('PedidoMaximoItemsError', () => {
    it('should have correct code, statusCode and limite', () => {
      const error = new PedidoMaximoItemsError();
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('PEDIDO_MAXIMO_ITEMS');
      expect(error.statusCode).toBe(400);
      expect(error.limite).toBe(50);
      expect(error.message).toContain('50');
    });
  });

  describe('RecursoNoEncontradoError', () => {
    it('should have correct code, statusCode and resource info', () => {
      const error = new RecursoNoEncontradoError('Pedido', 'ped-789');
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('RECURSO_NO_ENCONTRADO');
      expect(error.statusCode).toBe(404);
      expect(error.recurso).toBe('Pedido');
      expect(error.identificador).toBe('ped-789');
      expect(error.message).toContain('Pedido');
    });
  });

  describe('ServicioExternoError', () => {
    it('should have correct code, statusCode and servicio', () => {
      const error = new ServicioExternoError('WhatsApp', 'timeout');
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('SERVICIO_EXTERNO_ERROR');
      expect(error.statusCode).toBe(502);
      expect(error.servicio).toBe('WhatsApp');
      expect(error.causa).toBe('timeout');
    });

    it('should work without causa', () => {
      const error = new ServicioExternoError('MercadoPago');
      expect(error.causa).toBeUndefined();
      expect(error.message).toContain('MercadoPago');
    });
  });

  describe('PagoFallidoError', () => {
    it('should have correct code, statusCode and pedidoId', () => {
      const error = new PagoFallidoError('ped-001', 'Fondos insuficientes');
      expect(error).toBeInstanceOf(DomainError);
      expect(error.code).toBe('PAGO_FALLIDO');
      expect(error.statusCode).toBe(402);
      expect(error.pedidoId).toBe('ped-001');
      expect(error.motivo).toBe('Fondos insuficientes');
    });

    it('should work without motivo', () => {
      const error = new PagoFallidoError('ped-002');
      expect(error.motivo).toBeUndefined();
      expect(error.message).toContain('ped-002');
    });
  });
});
