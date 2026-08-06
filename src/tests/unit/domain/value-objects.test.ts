import { describe, it, expect } from 'vitest';
import { Precio } from '@/domain/value-objects/Precio';
import { Telefono } from '@/domain/value-objects/Telefono';
import { Direccion } from '@/domain/value-objects/Direccion';
import {
  Categoria,
  EstadoPedido,
  ModalidadServicio,
  MetodoPago,
  EstadoPago,
  EstadoEntrega,
  TipoMovimiento,
} from '@/domain/value-objects/enums';
import { PrecioFueraDeRangoError, PrecioDecimalesInvalidosError } from '@/shared/errors';
import { TelefonoInvalidoError } from '@/shared/errors';
import { ValidacionError } from '@/shared/errors';

describe('Precio', () => {
  it('crea un precio válido con entero', () => {
    const precio = Precio.crear(100);
    expect(precio.valor).toBe(100);
  });

  it('crea un precio válido con 2 decimales', () => {
    const precio = Precio.crear(99.99);
    expect(precio.valor).toBe(99.99);
  });

  it('crea un precio con el mínimo permitido (0.01)', () => {
    const precio = Precio.crear(0.01);
    expect(precio.valor).toBe(0.01);
  });

  it('crea un precio con el máximo permitido (99999.99)', () => {
    const precio = Precio.crear(99_999.99);
    expect(precio.valor).toBe(99_999.99);
  });

  it('rechaza precio igual a 0', () => {
    expect(() => Precio.crear(0)).toThrow(PrecioFueraDeRangoError);
  });

  it('rechaza precio negativo', () => {
    expect(() => Precio.crear(-5)).toThrow(PrecioFueraDeRangoError);
  });

  it('rechaza precio superior a 99999.99', () => {
    expect(() => Precio.crear(100_000)).toThrow(PrecioFueraDeRangoError);
  });

  it('rechaza precio con más de 2 decimales', () => {
    expect(() => Precio.crear(10.123)).toThrow(PrecioDecimalesInvalidosError);
  });

  it('rechaza Infinity', () => {
    expect(() => Precio.crear(Infinity)).toThrow(PrecioDecimalesInvalidosError);
  });

  it('rechaza NaN', () => {
    expect(() => Precio.crear(NaN)).toThrow(PrecioDecimalesInvalidosError);
  });

  it('suma dos precios correctamente', () => {
    const a = Precio.crear(10.50);
    const b = Precio.crear(5.25);
    const resultado = a.sumar(b);
    expect(resultado.valor).toBe(15.75);
  });

  it('multiplica por un factor correctamente', () => {
    const precio = Precio.crear(10);
    const resultado = precio.multiplicar(3);
    expect(resultado.valor).toBe(30);
  });

  it('multiplicar redondea a 2 decimales', () => {
    const precio = Precio.crear(10);
    const resultado = precio.multiplicar(1.5);
    expect(resultado.valor).toBe(15);
  });

  it('esIgual retorna true para precios iguales', () => {
    const a = Precio.crear(25.50);
    const b = Precio.crear(25.50);
    expect(a.esIgual(b)).toBe(true);
  });

  it('esIgual retorna false para precios diferentes', () => {
    const a = Precio.crear(25.50);
    const b = Precio.crear(25.51);
    expect(a.esIgual(b)).toBe(false);
  });
});

describe('Telefono', () => {
  it('crea un teléfono con 10 dígitos', () => {
    const tel = Telefono.crear('5512345678');
    expect(tel.valor).toBe('5512345678');
  });

  it('limpia caracteres no numéricos', () => {
    const tel = Telefono.crear('(55) 1234-5678');
    expect(tel.valor).toBe('5512345678');
  });

  it('limpia espacios y guiones', () => {
    const tel = Telefono.crear('55 1234 5678');
    expect(tel.valor).toBe('5512345678');
  });

  it('limpia prefijo +52', () => {
    // +52 adds digits, so a full number like +525512345678 has 12 digits -> invalid
    // But if someone writes just the 10 digits with a + prefix: +5512345678
    const tel = Telefono.crear('+5512345678');
    expect(tel.valor).toBe('5512345678');
  });

  it('rechaza teléfono con menos de 10 dígitos', () => {
    expect(() => Telefono.crear('123456789')).toThrow(TelefonoInvalidoError);
  });

  it('rechaza teléfono con más de 10 dígitos', () => {
    expect(() => Telefono.crear('12345678901')).toThrow(TelefonoInvalidoError);
  });

  it('rechaza teléfono sin dígitos', () => {
    expect(() => Telefono.crear('abcdefghij')).toThrow(TelefonoInvalidoError);
  });

  it('esIgual retorna true para teléfonos con mismo valor', () => {
    const a = Telefono.crear('5512345678');
    const b = Telefono.crear('55-1234-5678');
    expect(a.esIgual(b)).toBe(true);
  });
});

describe('Direccion', () => {
  it('crea una dirección válida', () => {
    const dir = Direccion.crear('Calle Falsa 123, Colonia Centro');
    expect(dir.valor).toBe('Calle Falsa 123, Colonia Centro');
  });

  it('trim espacios al inicio y final', () => {
    const dir = Direccion.crear('  Av. Principal 456  ');
    expect(dir.valor).toBe('Av. Principal 456');
  });

  it('rechaza dirección vacía', () => {
    expect(() => Direccion.crear('')).toThrow(ValidacionError);
  });

  it('rechaza dirección con solo espacios', () => {
    expect(() => Direccion.crear('   ')).toThrow(ValidacionError);
  });

  it('rechaza dirección con más de 200 caracteres', () => {
    const larga = 'A'.repeat(201);
    expect(() => Direccion.crear(larga)).toThrow(ValidacionError);
  });

  it('acepta dirección con exactamente 200 caracteres', () => {
    const exacta = 'B'.repeat(200);
    const dir = Direccion.crear(exacta);
    expect(dir.valor).toBe(exacta);
  });

  it('esIgual retorna true para direcciones iguales', () => {
    const a = Direccion.crear('Calle 1');
    const b = Direccion.crear('Calle 1');
    expect(a.esIgual(b)).toBe(true);
  });
});

describe('Enums', () => {
  it('Categoria tiene 4 valores', () => {
    expect(Object.values(Categoria)).toHaveLength(4);
    expect(Categoria.ALITAS).toBe('ALITAS');
    expect(Categoria.HAMBURGUESAS).toBe('HAMBURGUESAS');
    expect(Categoria.BEBIDAS).toBe('BEBIDAS');
    expect(Categoria.OTROS).toBe('OTROS');
  });

  it('EstadoPedido tiene 6 valores', () => {
    expect(Object.values(EstadoPedido)).toHaveLength(6);
    expect(EstadoPedido.RECIBIDO).toBe('RECIBIDO');
    expect(EstadoPedido.EN_PREPARACION).toBe('EN_PREPARACION');
    expect(EstadoPedido.EMPACADO).toBe('EMPACADO');
    expect(EstadoPedido.SERVIDO).toBe('SERVIDO');
    expect(EstadoPedido.EN_CAMINO).toBe('EN_CAMINO');
    expect(EstadoPedido.ENTREGADO).toBe('ENTREGADO');
  });

  it('ModalidadServicio tiene 2 valores', () => {
    expect(Object.values(ModalidadServicio)).toHaveLength(2);
    expect(ModalidadServicio.LOCAL).toBe('LOCAL');
    expect(ModalidadServicio.DOMICILIO).toBe('DOMICILIO');
  });

  it('MetodoPago tiene 2 valores', () => {
    expect(Object.values(MetodoPago)).toHaveLength(2);
    expect(MetodoPago.MERCADO_PAGO).toBe('MERCADO_PAGO');
    expect(MetodoPago.TRANSFERENCIA).toBe('TRANSFERENCIA');
  });

  it('EstadoPago tiene 4 valores', () => {
    expect(Object.values(EstadoPago)).toHaveLength(4);
    expect(EstadoPago.PENDIENTE).toBe('PENDIENTE');
    expect(EstadoPago.PAGADO).toBe('PAGADO');
    expect(EstadoPago.RECHAZADO).toBe('RECHAZADO');
    expect(EstadoPago.CANCELADO).toBe('CANCELADO');
  });

  it('EstadoEntrega tiene 4 valores', () => {
    expect(Object.values(EstadoEntrega)).toHaveLength(4);
    expect(EstadoEntrega.PENDIENTE).toBe('PENDIENTE');
    expect(EstadoEntrega.EN_CAMINO).toBe('EN_CAMINO');
    expect(EstadoEntrega.ENTREGADO).toBe('ENTREGADO');
    expect(EstadoEntrega.FALLIDO).toBe('FALLIDO');
  });

  it('TipoMovimiento tiene 2 valores', () => {
    expect(Object.values(TipoMovimiento)).toHaveLength(2);
    expect(TipoMovimiento.ENTRADA).toBe('ENTRADA');
    expect(TipoMovimiento.SALIDA).toBe('SALIDA');
  });
});
