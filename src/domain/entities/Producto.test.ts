import { describe, it, expect } from 'vitest';
import { Producto } from './Producto';
import { Precio, Categoria } from '@/domain/value-objects';
import { ValidacionError } from '@/shared/errors';

describe('Producto', () => {
  const propsValidas = {
    id: 'prod-1',
    nombre: 'Alitas BBQ',
    descripcion: 'Alitas bañadas en salsa BBQ',
    categoria: Categoria.ALITAS,
    precio: Precio.crear(99.99),
  };

  describe('crear', () => {
    it('crea un producto con datos válidos', () => {
      const producto = Producto.crear(propsValidas);
      expect(producto.id).toBe('prod-1');
      expect(producto.nombre).toBe('Alitas BBQ');
      expect(producto.descripcion).toBe('Alitas bañadas en salsa BBQ');
      expect(producto.categoria).toBe(Categoria.ALITAS);
      expect(producto.precio.valor).toBe(99.99);
      expect(producto.activo).toBe(true);
      expect(producto.imagenUrl).toBeNull();
      expect(producto.opcionesPersonalizacion).toEqual([]);
    });

    it('crea un producto con imagen y opciones de personalización', () => {
      const producto = Producto.crear({
        ...propsValidas,
        imagenUrl: 'https://cdn.example.com/alitas.jpg',
        opcionesPersonalizacion: [
          { nombre: 'Picante', opciones: [{ nombre: 'Suave' }, { nombre: 'Medio' }, { nombre: 'Alto', precioExtra: 10 }] },
        ],
      });
      expect(producto.imagenUrl).toBe('https://cdn.example.com/alitas.jpg');
      expect(producto.opcionesPersonalizacion).toHaveLength(1);
      expect(producto.opcionesPersonalizacion[0].nombre).toBe('Picante');
    });

    it('rechaza nombre vacío', () => {
      expect(() => Producto.crear({ ...propsValidas, nombre: '' }))
        .toThrow(ValidacionError);
    });

    it('rechaza nombre con solo espacios', () => {
      expect(() => Producto.crear({ ...propsValidas, nombre: '   ' }))
        .toThrow(ValidacionError);
    });

    it('rechaza nombre mayor a 100 caracteres', () => {
      expect(() => Producto.crear({ ...propsValidas, nombre: 'x'.repeat(101) }))
        .toThrow(ValidacionError);
    });

    it('rechaza descripción mayor a 500 caracteres', () => {
      expect(() => Producto.crear({ ...propsValidas, descripcion: 'x'.repeat(501) }))
        .toThrow(ValidacionError);
    });

    it('rechaza categoría faltante', () => {
      expect(() => Producto.crear({ ...propsValidas, categoria: '' as unknown as Categoria }))
        .toThrow(ValidacionError);
    });

    it('rechaza precio faltante', () => {
      expect(() => Producto.crear({ ...propsValidas, precio: null as unknown as Precio }))
        .toThrow(ValidacionError);
    });

    it('incluye los campos con error en ValidacionError', () => {
      try {
        Producto.crear({ ...propsValidas, nombre: '', categoria: '' as unknown as Categoria });
      } catch (e) {
        expect(e).toBeInstanceOf(ValidacionError);
        expect((e as ValidacionError).campos).toContain('nombre');
        expect((e as ValidacionError).campos).toContain('categoria');
      }
    });
  });

  describe('desactivar', () => {
    it('marca el producto como inactivo', () => {
      const producto = Producto.crear(propsValidas);
      expect(producto.activo).toBe(true);
      producto.desactivar();
      expect(producto.activo).toBe(false);
    });

    it('actualiza la fecha de actualizadoEn', () => {
      const producto = Producto.crear({ ...propsValidas, actualizadoEn: new Date('2020-01-01') });
      const antes = producto.actualizadoEn;
      producto.desactivar();
      expect(producto.actualizadoEn.getTime()).toBeGreaterThanOrEqual(antes.getTime());
    });
  });

  describe('actualizarPrecio', () => {
    it('actualiza el precio y retorna historial', () => {
      const producto = Producto.crear(propsValidas);
      const nuevoPrecio = Precio.crear(149.99);
      const historial = producto.actualizarPrecio(nuevoPrecio);

      expect(producto.precio.valor).toBe(149.99);
      expect(historial.productoId).toBe('prod-1');
      expect(historial.precioAnterior).toBe(99.99);
      expect(historial.precioNuevo).toBe(149.99);
      expect(historial.fechaCambio).toBeInstanceOf(Date);
    });

    it('genera historial correcto con múltiples cambios de precio', () => {
      const producto = Producto.crear(propsValidas);

      const h1 = producto.actualizarPrecio(Precio.crear(120));
      expect(h1.precioAnterior).toBe(99.99);
      expect(h1.precioNuevo).toBe(120);

      const h2 = producto.actualizarPrecio(Precio.crear(80));
      expect(h2.precioAnterior).toBe(120);
      expect(h2.precioNuevo).toBe(80);
    });
  });
});
