import { describe, it, expect, beforeEach } from 'vitest';
import { InventarioService } from './InventarioService';
import { ArticuloInventario } from '@/domain/entities';

describe('InventarioService', () => {
  let service: InventarioService;

  beforeEach(() => {
    service = new InventarioService();
  });

  function crearArticulo(overrides: Partial<{
    id: string;
    nombre: string;
    cantidad: number;
    unidadMedida: string;
    nivelMinimo: number;
  }> = {}): ArticuloInventario {
    return ArticuloInventario.crear({
      id: overrides.id ?? 'art-1',
      nombre: overrides.nombre ?? 'Salsa BBQ',
      cantidad: overrides.cantidad ?? 50,
      unidadMedida: overrides.unidadMedida ?? 'litros',
      nivelMinimo: overrides.nivelMinimo ?? 5,
    });
  }

  describe('verificarDisponibilidad', () => {
    it('retorna true cuando todos los artículos tienen cantidad > 0', () => {
      const articulos = [
        crearArticulo({ id: 'art-1', cantidad: 10 }),
        crearArticulo({ id: 'art-2', nombre: 'Pan', cantidad: 25 }),
      ];

      expect(service.verificarDisponibilidad('prod-1', articulos)).toBe(true);
    });

    it('retorna false cuando algún artículo tiene cantidad === 0', () => {
      const articulos = [
        crearArticulo({ id: 'art-1', cantidad: 10 }),
        crearArticulo({ id: 'art-2', nombre: 'Pan', cantidad: 0 }),
      ];

      expect(service.verificarDisponibilidad('prod-1', articulos)).toBe(false);
    });

    it('retorna false cuando todos los artículos tienen cantidad === 0', () => {
      const articulos = [
        crearArticulo({ id: 'art-1', cantidad: 0 }),
        crearArticulo({ id: 'art-2', nombre: 'Pan', cantidad: 0 }),
      ];

      expect(service.verificarDisponibilidad('prod-1', articulos)).toBe(false);
    });

    it('retorna false cuando no hay artículos asociados', () => {
      expect(service.verificarDisponibilidad('prod-1', [])).toBe(false);
    });

    it('retorna true con un solo artículo con cantidad > 0', () => {
      const articulos = [crearArticulo({ cantidad: 1 })];
      expect(service.verificarDisponibilidad('prod-1', articulos)).toBe(true);
    });
  });

  describe('decrementarPorPedido', () => {
    it('decrementa artículos según receta del pedido', () => {
      const salsa = crearArticulo({ id: 'art-salsa', nombre: 'Salsa', cantidad: 100 });
      const pan = crearArticulo({ id: 'art-pan', nombre: 'Pan', cantidad: 50 });

      const items = [{ productoId: 'prod-1', cantidad: 3 }];
      const articulosPorProducto = new Map([
        ['prod-1', [
          { articulo: salsa, cantidadRequerida: 2 },
          { articulo: pan, cantidadRequerida: 1 },
        ]],
      ]);

      const movimientos = service.decrementarPorPedido(items, articulosPorProducto);

      // salsa: 100 - (3 * 2) = 94
      expect(salsa.cantidad).toBe(94);
      // pan: 50 - (3 * 1) = 47
      expect(pan.cantidad).toBe(47);
      expect(movimientos).toHaveLength(2);
    });

    it('genera movimientos con datos correctos', () => {
      const articulo = crearArticulo({ id: 'art-1', cantidad: 20 });

      const items = [{ productoId: 'prod-1', cantidad: 5 }];
      const articulosPorProducto = new Map([
        ['prod-1', [{ articulo, cantidadRequerida: 3 }]],
      ]);

      const movimientos = service.decrementarPorPedido(items, articulosPorProducto);

      expect(movimientos).toHaveLength(1);
      expect(movimientos[0].articuloId).toBe('art-1');
      expect(movimientos[0].cantidadAnterior).toBe(20);
      expect(movimientos[0].cantidadNueva).toBe(5); // 20 - (5*3) = 5
      expect(movimientos[0].tipoMovimiento).toBe('salida');
    });

    it('maneja múltiples items del pedido', () => {
      const salsa = crearArticulo({ id: 'art-salsa', nombre: 'Salsa', cantidad: 100 });
      const pan = crearArticulo({ id: 'art-pan', nombre: 'Pan', cantidad: 50 });
      const carne = crearArticulo({ id: 'art-carne', nombre: 'Carne', cantidad: 30 });

      const items = [
        { productoId: 'prod-1', cantidad: 2 },
        { productoId: 'prod-2', cantidad: 1 },
      ];
      const articulosPorProducto = new Map([
        ['prod-1', [{ articulo: salsa, cantidadRequerida: 1 }]],
        ['prod-2', [
          { articulo: pan, cantidadRequerida: 2 },
          { articulo: carne, cantidadRequerida: 1 },
        ]],
      ]);

      const movimientos = service.decrementarPorPedido(items, articulosPorProducto);

      expect(salsa.cantidad).toBe(98);  // 100 - (2*1)
      expect(pan.cantidad).toBe(48);     // 50 - (1*2)
      expect(carne.cantidad).toBe(29);   // 30 - (1*1)
      expect(movimientos).toHaveLength(3);
    });

    it('ignora productos sin artículos asociados en el mapa', () => {
      const items = [{ productoId: 'prod-inexistente', cantidad: 5 }];
      const articulosPorProducto = new Map<string, { articulo: ArticuloInventario; cantidadRequerida: number }[]>();

      const movimientos = service.decrementarPorPedido(items, articulosPorProducto);
      expect(movimientos).toHaveLength(0);
    });

    it('no permite que la cantidad baje de cero (se queda en 0)', () => {
      const articulo = crearArticulo({ id: 'art-1', cantidad: 2 });

      const items = [{ productoId: 'prod-1', cantidad: 5 }];
      const articulosPorProducto = new Map([
        ['prod-1', [{ articulo, cantidadRequerida: 1 }]],
      ]);

      const movimientos = service.decrementarPorPedido(items, articulosPorProducto);

      expect(articulo.cantidad).toBe(0); // Math.max(0, 2-5) = 0
      expect(movimientos[0].cantidadAnterior).toBe(2);
      expect(movimientos[0].cantidadNueva).toBe(0);
    });
  });

  describe('verificarAlertasBajoMinimo', () => {
    it('retorna artículos que están en o por debajo del nivel mínimo', () => {
      const articuloBajo = crearArticulo({ id: 'art-1', nombre: 'Salsa', cantidad: 5, nivelMinimo: 5 });
      const articuloOk = crearArticulo({ id: 'art-2', nombre: 'Pan', cantidad: 50, nivelMinimo: 10 });
      const articuloMuyBajo = crearArticulo({ id: 'art-3', nombre: 'Carne', cantidad: 2, nivelMinimo: 10 });

      const alertas = service.verificarAlertasBajoMinimo([articuloBajo, articuloOk, articuloMuyBajo]);

      expect(alertas).toHaveLength(2);
      expect(alertas).toContain(articuloBajo);
      expect(alertas).toContain(articuloMuyBajo);
    });

    it('retorna array vacío cuando ninguno está bajo mínimo', () => {
      const articulos = [
        crearArticulo({ id: 'art-1', cantidad: 50, nivelMinimo: 5 }),
        crearArticulo({ id: 'art-2', nombre: 'Pan', cantidad: 20, nivelMinimo: 10 }),
      ];

      expect(service.verificarAlertasBajoMinimo(articulos)).toHaveLength(0);
    });

    it('retorna todos cuando todos están bajo mínimo', () => {
      const articulos = [
        crearArticulo({ id: 'art-1', cantidad: 3, nivelMinimo: 5 }),
        crearArticulo({ id: 'art-2', nombre: 'Pan', cantidad: 1, nivelMinimo: 10 }),
      ];

      expect(service.verificarAlertasBajoMinimo(articulos)).toHaveLength(2);
    });

    it('retorna array vacío para lista vacía', () => {
      expect(service.verificarAlertasBajoMinimo([])).toEqual([]);
    });
  });
});
