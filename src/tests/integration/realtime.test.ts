import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseRealtimeAdapter } from '@/adapters/driven/notification/SupabaseRealtimeAdapter';
import { ServicioExternoError } from '@/shared/errors/ServicioExternoError';
import type { Pedido, ArticuloInventario } from '@/shared/domain-types';

describe('SupabaseRealtimeAdapter - Integration Tests', () => {
  let adapter: SupabaseRealtimeAdapter;
  let mockSend: ReturnType<typeof vi.fn>;
  let mockChannel: ReturnType<typeof vi.fn>;
  let mockRemoveChannel: ReturnType<typeof vi.fn>;
  let lastChannelName: string;

  beforeEach(() => {
    mockSend = vi.fn().mockResolvedValue('ok');
    mockRemoveChannel = vi.fn();

    const mockChannelObj = {
      send: mockSend,
    };

    mockChannel = vi.fn().mockImplementation((canal: string) => {
      lastChannelName = canal;
      return mockChannelObj;
    });

    const mockSupabase = {
      channel: mockChannel,
      removeChannel: mockRemoveChannel,
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as any;

    adapter = new SupabaseRealtimeAdapter(mockSupabase);
  });

  describe('broadcast de ubicación GPS (notificarCambioEstado)', () => {
    it('debe enviar broadcast al canal correcto del pedido', async () => {
      const pedidoId = 'pedido-456';

      await adapter.notificarCambioEstado(pedidoId, 'en_camino');

      // Verificar canal correcto
      expect(mockChannel).toHaveBeenCalledWith(`pedido:estado:${pedidoId}`);

      // Verificar tipo broadcast con evento y payload
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'cambio_estado',
        payload: expect.objectContaining({
          pedidoId: 'pedido-456',
          nuevoEstado: 'en_camino',
          fecha: expect.any(String),
        }),
      });

      // Verificar cleanup del canal
      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });

  describe('notificarNuevoPedido', () => {
    it('debe enviar broadcast al canal pedidos:vendedor con datos del pedido', async () => {
      const pedido: Pedido = {
        id: 'pedido-789',
        numero: 'P-042',
        clienteId: 'cliente-1',
        items: [
          {
            productoId: 'prod-1',
            nombre: 'Alitas BBQ',
            cantidad: 2,
            precioUnitario: 150.0,
          },
        ],
        estado: 'recibido',
        modalidad: 'local',
        total: 300.0,
        creadoEn: new Date('2024-06-15T10:00:00Z'),
        actualizadoEn: new Date('2024-06-15T10:00:00Z'),
      };

      await adapter.notificarNuevoPedido(pedido);

      expect(mockChannel).toHaveBeenCalledWith('pedidos:vendedor');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'nuevo_pedido',
        payload: expect.objectContaining({
          pedidoId: 'pedido-789',
          numero: 'P-042',
          modalidad: 'local',
          total: 300.0,
        }),
      });
    });
  });

  describe('notificarInventarioBajo', () => {
    it('debe enviar alerta al canal inventario:alertas', async () => {
      const articulo: ArticuloInventario = {
        id: 'art-1',
        nombre: 'Pan para hamburguesa',
        cantidad: 5,
        unidad: 'piezas',
        nivelMinimo: 10,
        productoIds: ['prod-2'],
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      await adapter.notificarInventarioBajo(articulo);

      expect(mockChannel).toHaveBeenCalledWith('inventario:alertas');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'inventario_bajo',
        payload: expect.objectContaining({
          articuloId: 'art-1',
          nombre: 'Pan para hamburguesa',
          cantidadActual: 5,
          nivelMinimo: 10,
        }),
      });
    });
  });

  describe('notificarRepartidorDisponible', () => {
    it('debe enviar broadcast al canal repartidor', async () => {
      await adapter.notificarRepartidorDisponible('pedido-domicilio-1');

      expect(mockChannel).toHaveBeenCalledWith('repartidor');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'entrega_disponible',
        payload: expect.objectContaining({
          pedidoId: 'pedido-domicilio-1',
        }),
      });
    });
  });

  describe('manejo de errores de broadcast', () => {
    it('debe lanzar ServicioExternoError cuando el broadcast falla', async () => {
      mockSend.mockResolvedValueOnce('error');

      await expect(
        adapter.notificarCambioEstado('pedido-x', 'entregado')
      ).rejects.toThrow(ServicioExternoError);
    });

    it('debe limpiar el canal incluso cuando el broadcast es exitoso', async () => {
      mockSend.mockResolvedValueOnce('ok');

      await adapter.notificarRepartidorDisponible('pedido-1');

      expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    });
  });

  describe('enviarPush', () => {
    it('debe enviar push con fallback a in-app y persistir notificación', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });

      const mockFromObj = {
        insert: mockInsert,
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        limit: mockLimit,
        single: mockSingle,
        update: vi.fn().mockReturnThis(),
      };
      const mockFrom = vi.fn().mockReturnValue(mockFromObj);

      const mockSupabaseWithDb = {
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
        from: mockFrom,
      } as any;

      const adapterWithDb = new SupabaseRealtimeAdapter(mockSupabaseWithDb);

      const resultado = await adapterWithDb.enviarPush(
        'user-123',
        'Pedido listo',
        'Tu pedido #P-042 está listo para recoger'
      );

      // Without a push subscription, falls back to in-app notification (broadcast)
      expect(resultado.exitoso).toBe(true);

      // Verificar broadcast al canal del usuario (in-app fallback)
      expect(mockChannel).toHaveBeenCalledWith('notificaciones:user-123');

      // Verificar que se guardó en base de datos
      expect(mockFrom).toHaveBeenCalledWith('notificacion');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario_id: 'user-123',
          tipo: 'push',
          titulo: 'Pedido listo',
          cuerpo: 'Tu pedido #P-042 está listo para recoger',
          leida: false,
        })
      );
    });
  });
});
