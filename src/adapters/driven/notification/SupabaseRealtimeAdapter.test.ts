import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseRealtimeAdapter, CANALES } from './SupabaseRealtimeAdapter';
import type { Pedido, ArticuloInventario } from '@/shared/domain-types';

function createMockSupabase() {
  const mockChannel = {
    send: vi.fn().mockResolvedValue('ok'),
  };

  const mockFrom = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
  };

  return {
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    from: vi.fn().mockReturnValue(mockFrom),
    _channel: mockChannel,
    _from: mockFrom,
  };
}

const mockPedido: Pedido = {
  id: 'pedido-123',
  numero: 'P001',
  clienteId: 'cliente-1',
  items: [
    { productoId: 'prod-1', nombre: 'Alitas BBQ', cantidad: 2, precioUnitario: 150 },
  ],
  estado: 'recibido',
  modalidad: 'domicilio',
  total: 300,
  creadoEn: new Date('2024-01-01'),
  actualizadoEn: new Date('2024-01-01'),
};

const mockArticulo: ArticuloInventario = {
  id: 'art-1',
  nombre: 'Pollo',
  cantidad: 3,
  unidad: 'kg',
  nivelMinimo: 5,
  productoIds: ['prod-1'],
  creadoEn: new Date('2024-01-01'),
  actualizadoEn: new Date('2024-01-01'),
};

describe('SupabaseRealtimeAdapter', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let adapter: SupabaseRealtimeAdapter;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    adapter = new SupabaseRealtimeAdapter(mockSupabase as any);
  });

  describe('CANALES', () => {
    it('debe definir canal pedidos:vendedor', () => {
      expect(CANALES.PEDIDOS_VENDEDOR).toBe('pedidos:vendedor');
    });

    it('debe generar canal pedido:estado:{id}', () => {
      expect(CANALES.ESTADO_PEDIDO('abc')).toBe('pedido:estado:abc');
    });

    it('debe generar canal ubicacion:{id}', () => {
      expect(CANALES.UBICACION('pedido-1')).toBe('ubicacion:pedido-1');
    });

    it('debe definir canal inventario:alertas', () => {
      expect(CANALES.INVENTARIO_ALERTAS).toBe('inventario:alertas');
    });

    it('debe generar canal notificaciones:{userId}', () => {
      expect(CANALES.NOTIFICACIONES_USUARIO('user-1')).toBe('notificaciones:user-1');
    });
  });

  describe('notificarNuevoPedido', () => {
    it('debe enviar broadcast al canal pedidos:vendedor', async () => {
      await adapter.notificarNuevoPedido(mockPedido);

      expect(mockSupabase.channel).toHaveBeenCalledWith('pedidos:vendedor');
      expect(mockSupabase._channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'nuevo_pedido',
        payload: expect.objectContaining({
          pedidoId: 'pedido-123',
          numero: 'P001',
          sonido: true,
          persistente: true,
        }),
      });
    });

    it('debe limpiar el canal después del envío', async () => {
      await adapter.notificarNuevoPedido(mockPedido);
      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('notificarCambioEstado', () => {
    it('debe enviar broadcast al canal pedido:estado:{id}', async () => {
      await adapter.notificarCambioEstado('pedido-123', 'en_preparacion');

      expect(mockSupabase.channel).toHaveBeenCalledWith('pedido:estado:pedido-123');
      expect(mockSupabase._channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'cambio_estado',
        payload: expect.objectContaining({
          pedidoId: 'pedido-123',
          nuevoEstado: 'en_preparacion',
        }),
      });
    });
  });

  describe('notificarInventarioBajo', () => {
    it('debe enviar broadcast al canal inventario:alertas', async () => {
      await adapter.notificarInventarioBajo(mockArticulo);

      expect(mockSupabase.channel).toHaveBeenCalledWith('inventario:alertas');
      expect(mockSupabase._channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'inventario_bajo',
        payload: expect.objectContaining({
          articuloId: 'art-1',
          nombre: 'Pollo',
          cantidadActual: 3,
          nivelMinimo: 5,
        }),
      });
    });
  });

  describe('notificarRepartidorDisponible', () => {
    it('debe enviar broadcast al canal repartidor', async () => {
      await adapter.notificarRepartidorDisponible('pedido-456');

      expect(mockSupabase.channel).toHaveBeenCalledWith('repartidor');
      expect(mockSupabase._channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'entrega_disponible',
        payload: expect.objectContaining({
          pedidoId: 'pedido-456',
        }),
      });
    });
  });

  describe('enviarPush', () => {
    it('debe enviar notificación push con fallback a in-app', async () => {
      // Without push subscription, falls back to in-app
      const resultado = await adapter.enviarPush('user-1', 'Test', 'Body');

      // In-app via broadcast succeeds
      expect(resultado.exitoso).toBe(true);
    });

    it('debe retornar ResultadoEnvio con fecha', async () => {
      const resultado = await adapter.enviarPush('user-1', 'Test', 'Body');
      expect(resultado.fecha).toBeInstanceOf(Date);
    });
  });

  describe('manejo de errores', () => {
    it('debe lanzar ServicioExternoError si broadcast falla', async () => {
      mockSupabase._channel.send.mockResolvedValue('error');

      await expect(adapter.notificarNuevoPedido(mockPedido)).rejects.toThrow(
        /Error al enviar broadcast/
      );
    });
  });
});
