import { describe, it, expect, beforeEach } from 'vitest';
import { PrecioService } from './PrecioService';
import { Producto } from '@/domain/entities';
import { Precio, Categoria } from '@/domain/value-objects';

describe('PrecioService', () => {
  let service: PrecioService;
  let producto: Producto;

  beforeEach(() => {
    service = new PrecioService();
    producto = Producto.crear({
      id: 'prod-1',
      nombre: 'Hamburguesa Clásica',
      categoria: Categoria.HAMBURGUESAS,
      precio: Precio.crear(89.99),
    });
  });

  describe('actualizarPrecio', () => {
    it('actualiza el precio del producto y retorna historial', () => {
      const nuevoPrecio = Precio.crear(99.99);
      const historial = service.actualizarPrecio(producto, nuevoPrecio);

      expect(producto.precio.valor).toBe(99.99);
      expect(historial.productoId).toBe('prod-1');
      expect(historial.precioAnterior).toBe(89.99);
      expect(historial.precioNuevo).toBe(99.99);
      expect(historial.fechaCambio).toBeInstanceOf(Date);
    });

    it('acumula múltiples cambios en el historial', () => {
      service.actualizarPrecio(producto, Precio.crear(100));
      service.actualizarPrecio(producto, Precio.crear(120));
      service.actualizarPrecio(producto, Precio.crear(110));

      const historial = service.obtenerHistorial();
      expect(historial).toHaveLength(3);
    });

    it('registra precio anterior y nuevo correctos en cambios secuenciales', () => {
      const h1 = service.actualizarPrecio(producto, Precio.crear(100));
      const h2 = service.actualizarPrecio(producto, Precio.crear(150));

      expect(h1.precioAnterior).toBe(89.99);
      expect(h1.precioNuevo).toBe(100);
      expect(h2.precioAnterior).toBe(100);
      expect(h2.precioNuevo).toBe(150);

      const historial = service.obtenerHistorial();
      expect(historial).toHaveLength(2);
      // Verificar que ambos registros existen con datos correctos
      const registros = historial.map((h) => ({ anterior: h.precioAnterior, nuevo: h.precioNuevo }));
      expect(registros).toContainEqual({ anterior: 89.99, nuevo: 100 });
      expect(registros).toContainEqual({ anterior: 100, nuevo: 150 });
    });
  });

  describe('obtenerHistorial', () => {
    it('retorna array vacío cuando no hay cambios', () => {
      expect(service.obtenerHistorial()).toEqual([]);
    });

    it('retorna historial ordenado por fecha descendente', () => {
      service.actualizarPrecio(producto, Precio.crear(100));
      service.actualizarPrecio(producto, Precio.crear(120));

      const historial = service.obtenerHistorial();
      expect(historial).toHaveLength(2);
      expect(historial[0].fechaCambio.getTime()).toBeGreaterThanOrEqual(
        historial[1].fechaCambio.getTime()
      );
    });

    it('retorna una copia del historial (no mutable externamente)', () => {
      service.actualizarPrecio(producto, Precio.crear(100));
      const historial = service.obtenerHistorial();
      historial.pop();
      expect(service.obtenerHistorial()).toHaveLength(1);
    });
  });
});
