import { describe, it, expect } from 'vitest';
import {
  CorteService,
  PedidoData,
  GastoData,
} from '@/domain/services/CorteService';

describe('CorteService', () => {
  const service = new CorteService();

  // Helper to create a date at a specific day/time
  function crearFecha(year: number, month: number, day: number, hour = 12): Date {
    return new Date(year, month - 1, day, hour, 0, 0, 0);
  }

  function crearPedido(total: number, fecha: Date, items: PedidoData['items'] = []): PedidoData {
    return { total, creadoEn: fecha, items };
  }

  function crearGasto(monto: number, fecha: Date): GastoData {
    return { monto, fecha };
  }

  describe('Corte Diario (Req 5.1)', () => {
    it('debe generar un corte diario con totales correctos', () => {
      const fecha = crearFecha(2024, 3, 15);
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 3, 15, 9)),
        crearPedido(200, crearFecha(2024, 3, 15, 14)),
        crearPedido(150, crearFecha(2024, 3, 15, 20)),
      ];
      const gastos: GastoData[] = [
        crearGasto(50, crearFecha(2024, 3, 15, 8)),
        crearGasto(30, crearFecha(2024, 3, 15, 12)),
      ];

      const corte = service.generarCorte('diario', pedidos, gastos, fecha);

      expect(corte.tipo).toBe('diario');
      expect(corte.totalVentas).toBe(450);
      expect(corte.totalGastos).toBe(80);
      expect(corte.gananciaNeta).toBe(370);
      expect(corte.numeroPedidos).toBe(3);
      expect(corte.ticketPromedio).toBe(150);
    });

    it('debe tener fechaInicio y fechaFin del mismo día', () => {
      const fecha = crearFecha(2024, 6, 20);
      const corte = service.generarCorte('diario', [], [], fecha);

      expect(corte.fechaInicio.getFullYear()).toBe(2024);
      expect(corte.fechaInicio.getMonth()).toBe(5); // June (0-indexed)
      expect(corte.fechaInicio.getDate()).toBe(20);
      expect(corte.fechaInicio.getHours()).toBe(0);
      expect(corte.fechaInicio.getMinutes()).toBe(0);

      expect(corte.fechaFin.getDate()).toBe(20);
      expect(corte.fechaFin.getHours()).toBe(23);
      expect(corte.fechaFin.getMinutes()).toBe(59);
    });

    it('debe excluir pedidos de otros días', () => {
      const fecha = crearFecha(2024, 3, 15);
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 3, 15, 12)),
        crearPedido(200, crearFecha(2024, 3, 14, 23)), // día anterior
        crearPedido(300, crearFecha(2024, 3, 16, 1)),  // día siguiente
      ];

      const corte = service.generarCorte('diario', pedidos, [], fecha);

      expect(corte.totalVentas).toBe(100);
      expect(corte.numeroPedidos).toBe(1);
    });

    it('debe tener un desglose con un solo item para el día', () => {
      const fecha = crearFecha(2024, 3, 15);
      const pedidos: PedidoData[] = [crearPedido(200, crearFecha(2024, 3, 15, 10))];
      const gastos: GastoData[] = [crearGasto(50, crearFecha(2024, 3, 15, 8))];

      const corte = service.generarCorte('diario', pedidos, gastos, fecha);

      expect(corte.desglose).toHaveLength(1);
      expect(corte.desglose[0].periodo).toBe('2024-03-15');
      expect(corte.desglose[0].ventas).toBe(200);
      expect(corte.desglose[0].gastos).toBe(50);
      expect(corte.desglose[0].ganancia).toBe(150);
    });
  });

  describe('Corte Semanal (Req 5.2)', () => {
    it('debe generar un corte de los últimos 7 días', () => {
      const fecha = crearFecha(2024, 3, 17); // domingo
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 3, 11, 10)), // lunes (inicio)
        crearPedido(200, crearFecha(2024, 3, 14, 14)), // jueves
        crearPedido(150, crearFecha(2024, 3, 17, 20)), // domingo (fin)
      ];
      const gastos: GastoData[] = [
        crearGasto(40, crearFecha(2024, 3, 12, 8)),
        crearGasto(60, crearFecha(2024, 3, 16, 12)),
      ];

      const corte = service.generarCorte('semanal', pedidos, gastos, fecha);

      expect(corte.tipo).toBe('semanal');
      expect(corte.totalVentas).toBe(450);
      expect(corte.totalGastos).toBe(100);
      expect(corte.gananciaNeta).toBe(350);
      expect(corte.numeroPedidos).toBe(3);
      expect(corte.ticketPromedio).toBe(150);
    });

    it('debe tener desglose por día (7 días)', () => {
      const fecha = crearFecha(2024, 3, 17);
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 3, 11, 10)),
        crearPedido(200, crearFecha(2024, 3, 14, 14)),
      ];

      const corte = service.generarCorte('semanal', pedidos, [], fecha);

      expect(corte.desglose).toHaveLength(7);
      expect(corte.desglose[0].periodo).toBe('2024-03-11');
      expect(corte.desglose[6].periodo).toBe('2024-03-17');
      expect(corte.desglose[0].ventas).toBe(100);
      expect(corte.desglose[3].ventas).toBe(200); // jueves 14 - offset 3
    });

    it('debe excluir datos fuera de los 7 días', () => {
      const fecha = crearFecha(2024, 3, 17);
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 3, 10, 23)), // fuera del rango
        crearPedido(200, crearFecha(2024, 3, 11, 0)),  // dentro del rango
      ];

      const corte = service.generarCorte('semanal', pedidos, [], fecha);

      expect(corte.totalVentas).toBe(200);
      expect(corte.numeroPedidos).toBe(1);
    });
  });

  describe('Corte Mensual (Req 5.3)', () => {
    it('debe generar un corte del mes calendario completo', () => {
      const fecha = crearFecha(2024, 2, 15); // Feb 2024 (bisiesto, 29 días)
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 2, 1, 9)),
        crearPedido(200, crearFecha(2024, 2, 15, 14)),
        crearPedido(300, crearFecha(2024, 2, 29, 20)),
      ];
      const gastos: GastoData[] = [
        crearGasto(50, crearFecha(2024, 2, 5, 8)),
      ];

      const corte = service.generarCorte('mensual', pedidos, gastos, fecha);

      expect(corte.tipo).toBe('mensual');
      expect(corte.totalVentas).toBe(600);
      expect(corte.totalGastos).toBe(50);
      expect(corte.gananciaNeta).toBe(550);
      expect(corte.numeroPedidos).toBe(3);
      expect(corte.fechaInicio.getDate()).toBe(1);
      expect(corte.fechaFin.getDate()).toBe(29); // Feb 2024 bisiesto
    });

    it('debe tener desglose por semana', () => {
      const fecha = crearFecha(2024, 1, 15); // Enero 2024 (31 días)
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 1, 3, 10)),
        crearPedido(200, crearFecha(2024, 1, 10, 14)),
        crearPedido(300, crearFecha(2024, 1, 20, 16)),
        crearPedido(400, crearFecha(2024, 1, 30, 8)),
      ];

      const corte = service.generarCorte('mensual', pedidos, [], fecha);

      // Enero tiene 31 días → ceil(31/7) = 5 semanas
      expect(corte.desglose.length).toBeGreaterThanOrEqual(4);
      expect(corte.desglose[0].periodo).toBe('Semana 1');
      expect(corte.desglose[1].periodo).toBe('Semana 2');

      // Semana 1 (1-7 ene): 100
      expect(corte.desglose[0].ventas).toBe(100);
      // Semana 2 (8-14 ene): 200
      expect(corte.desglose[1].ventas).toBe(200);
    });

    it('debe excluir datos fuera del mes', () => {
      const fecha = crearFecha(2024, 3, 10); // Marzo 2024
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 2, 28, 23)), // Febrero
        crearPedido(200, crearFecha(2024, 3, 1, 0)),   // Marzo
        crearPedido(300, crearFecha(2024, 4, 1, 0)),   // Abril
      ];

      const corte = service.generarCorte('mensual', pedidos, [], fecha);

      expect(corte.totalVentas).toBe(200);
      expect(corte.numeroPedidos).toBe(1);
    });
  });

  describe('Ticket Promedio (Req 5.4)', () => {
    it('debe calcular ticket promedio = totalVentas / numeroPedidos', () => {
      const fecha = crearFecha(2024, 3, 15);
      const pedidos: PedidoData[] = [
        crearPedido(100, crearFecha(2024, 3, 15, 9)),
        crearPedido(300, crearFecha(2024, 3, 15, 14)),
      ];

      const corte = service.generarCorte('diario', pedidos, [], fecha);

      expect(corte.ticketPromedio).toBe(200); // 400 / 2
    });

    it('debe retornar 0 si no hay pedidos', () => {
      const fecha = crearFecha(2024, 3, 15);
      const corte = service.generarCorte('diario', [], [], fecha);

      expect(corte.ticketPromedio).toBe(0);
    });
  });

  describe('Top 5 Productos (Req 5.4)', () => {
    it('debe retornar los 5 productos más vendidos por cantidad', () => {
      const fecha = crearFecha(2024, 3, 15);
      const items = [
        { productoId: 'p1', nombre: 'Alitas BBQ', cantidad: 10 },
        { productoId: 'p2', nombre: 'Hamburguesa Clásica', cantidad: 8 },
        { productoId: 'p3', nombre: 'Papas Fritas', cantidad: 15 },
        { productoId: 'p4', nombre: 'Refresco', cantidad: 12 },
        { productoId: 'p5', nombre: 'Cerveza', cantidad: 6 },
        { productoId: 'p6', nombre: 'Nachos', cantidad: 3 },
      ];

      const pedidos: PedidoData[] = [
        { total: 500, items, creadoEn: crearFecha(2024, 3, 15, 12) },
      ];

      const corte = service.generarCorte('diario', pedidos, [], fecha);

      expect(corte.top5Productos).toHaveLength(5);
      expect(corte.top5Productos[0].productoId).toBe('p3'); // 15
      expect(corte.top5Productos[0].cantidadVendida).toBe(15);
      expect(corte.top5Productos[1].productoId).toBe('p4'); // 12
      expect(corte.top5Productos[2].productoId).toBe('p1'); // 10
      expect(corte.top5Productos[3].productoId).toBe('p2'); // 8
      expect(corte.top5Productos[4].productoId).toBe('p5'); // 6
      // p6 (Nachos, 3) no debe aparecer
    });

    it('debe acumular cantidades del mismo producto en múltiples pedidos', () => {
      const fecha = crearFecha(2024, 3, 15);
      const pedidos: PedidoData[] = [
        {
          total: 100,
          items: [{ productoId: 'p1', nombre: 'Alitas BBQ', cantidad: 3 }],
          creadoEn: crearFecha(2024, 3, 15, 10),
        },
        {
          total: 100,
          items: [{ productoId: 'p1', nombre: 'Alitas BBQ', cantidad: 5 }],
          creadoEn: crearFecha(2024, 3, 15, 14),
        },
      ];

      const corte = service.generarCorte('diario', pedidos, [], fecha);

      expect(corte.top5Productos[0].productoId).toBe('p1');
      expect(corte.top5Productos[0].cantidadVendida).toBe(8);
    });

    it('debe retornar menos de 5 si hay menos productos', () => {
      const fecha = crearFecha(2024, 3, 15);
      const pedidos: PedidoData[] = [
        {
          total: 100,
          items: [
            { productoId: 'p1', nombre: 'Alitas', cantidad: 2 },
            { productoId: 'p2', nombre: 'Burger', cantidad: 1 },
          ],
          creadoEn: crearFecha(2024, 3, 15, 10),
        },
      ];

      const corte = service.generarCorte('diario', pedidos, [], fecha);

      expect(corte.top5Productos).toHaveLength(2);
    });

    it('debe retornar array vacío si no hay pedidos', () => {
      const fecha = crearFecha(2024, 3, 15);
      const corte = service.generarCorte('diario', [], [], fecha);

      expect(corte.top5Productos).toHaveLength(0);
    });
  });

  describe('Período sin movimientos (Req 5.5)', () => {
    it('debe retornar valores en cero si no hay ventas ni gastos', () => {
      const fecha = crearFecha(2024, 3, 15);
      const corte = service.generarCorte('diario', [], [], fecha);

      expect(corte.totalVentas).toBe(0);
      expect(corte.totalGastos).toBe(0);
      expect(corte.gananciaNeta).toBe(0);
      expect(corte.numeroPedidos).toBe(0);
      expect(corte.ticketPromedio).toBe(0);
      expect(corte.top5Productos).toHaveLength(0);
    });

    it('debe retornar desglose con ceros para corte semanal sin datos', () => {
      const fecha = crearFecha(2024, 3, 17);
      const corte = service.generarCorte('semanal', [], [], fecha);

      expect(corte.desglose).toHaveLength(7);
      for (const item of corte.desglose) {
        expect(item.ventas).toBe(0);
        expect(item.gastos).toBe(0);
        expect(item.ganancia).toBe(0);
      }
    });

    it('debe retornar desglose con ceros para corte mensual sin datos', () => {
      const fecha = crearFecha(2024, 3, 15); // Marzo 2024 (31 días)
      const corte = service.generarCorte('mensual', [], [], fecha);

      expect(corte.desglose.length).toBeGreaterThanOrEqual(4);
      for (const item of corte.desglose) {
        expect(item.ventas).toBe(0);
        expect(item.gastos).toBe(0);
        expect(item.ganancia).toBe(0);
      }
    });
  });

  describe('Ganancia neta', () => {
    it('puede ser negativa si gastos superan ventas', () => {
      const fecha = crearFecha(2024, 3, 15);
      const pedidos: PedidoData[] = [crearPedido(50, crearFecha(2024, 3, 15, 10))];
      const gastos: GastoData[] = [crearGasto(200, crearFecha(2024, 3, 15, 8))];

      const corte = service.generarCorte('diario', pedidos, gastos, fecha);

      expect(corte.gananciaNeta).toBe(-150);
    });
  });

  describe('Fecha por defecto', () => {
    it('debe usar la fecha actual si no se proporciona', () => {
      const corte = service.generarCorte('diario', [], []);
      const hoy = new Date();

      expect(corte.fechaInicio.getFullYear()).toBe(hoy.getFullYear());
      expect(corte.fechaInicio.getMonth()).toBe(hoy.getMonth());
      expect(corte.fechaInicio.getDate()).toBe(hoy.getDate());
    });
  });
});
