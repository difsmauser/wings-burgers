import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeChannelManager } from './RealtimeChannelManager';

// Mock de Supabase channel
function createMockChannel(overrides = {}) {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation((callback) => {
      // Simulate immediate successful subscription
      if (callback) callback('SUBSCRIBED');
      return channel;
    }),
    send: vi.fn().mockResolvedValue('ok'),
    unsubscribe: vi.fn(),
    ...overrides,
  };
  return channel;
}

function createMockSupabase() {
  const channels: Map<string, ReturnType<typeof createMockChannel>> = new Map();

  return {
    channel: vi.fn((name: string) => {
      const ch = createMockChannel();
      channels.set(name, ch);
      return ch;
    }),
    removeChannel: vi.fn(),
    _channels: channels,
  };
}

describe('RealtimeChannelManager', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let manager: RealtimeChannelManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSupabase = createMockSupabase();
    manager = new RealtimeChannelManager(mockSupabase as any, {
      maxReintentos: 5,
      intervaloMs: 10_000,
    });
  });

  afterEach(() => {
    manager.desuscribirTodos();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('suscribir', () => {
    it('debe crear un canal y suscribirse a eventos', () => {
      const callback = vi.fn();
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('pedidos:vendedor');
      const canalesActivos = manager.getCanalesActivos();
      expect(canalesActivos).toContain('pedidos:vendedor');
    });

    it('debe reutilizar canal existente para nuevo evento', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', callback1);
      manager.suscribir('pedidos:vendedor', 'pedido_actualizado', callback2);

      // Solo se crea un canal
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);
    });

    it('debe soportar múltiples canales independientes', () => {
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());
      manager.suscribir('inventario:alertas', 'inventario_bajo', vi.fn());
      manager.suscribir('notificaciones:user-1', 'push', vi.fn());

      const canales = manager.getCanalesActivos();
      expect(canales).toHaveLength(3);
      expect(canales).toContain('pedidos:vendedor');
      expect(canales).toContain('inventario:alertas');
      expect(canales).toContain('notificaciones:user-1');
    });
  });

  describe('desuscribir', () => {
    it('debe remover un canal y limpiar recursos', () => {
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());
      manager.desuscribir('pedidos:vendedor');

      expect(mockSupabase.removeChannel).toHaveBeenCalled();
      expect(manager.getCanalesActivos()).not.toContain('pedidos:vendedor');
    });

    it('no debe fallar al desuscribir un canal inexistente', () => {
      expect(() => manager.desuscribir('canal-inexistente')).not.toThrow();
    });
  });

  describe('desuscribirTodos', () => {
    it('debe remover todos los canales', () => {
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());
      manager.suscribir('inventario:alertas', 'inventario_bajo', vi.fn());

      manager.desuscribirTodos();

      expect(manager.getCanalesActivos()).toHaveLength(0);
    });
  });

  describe('getEstadoCanal', () => {
    it('debe retornar el estado de un canal suscrito', () => {
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());

      const estado = manager.getEstadoCanal('pedidos:vendedor');
      expect(estado).not.toBeNull();
      expect(estado!.activo).toBe(true);
      expect(estado!.reintentos).toBe(0);
    });

    it('debe retornar null para un canal no suscrito', () => {
      expect(manager.getEstadoCanal('inexistente')).toBeNull();
    });
  });

  describe('reconexión automática', () => {
    it('debe intentar reconexión cuando el canal se desconecta', () => {
      let subscribeCallback: ((status: string) => void) | null = null;

      mockSupabase.channel.mockImplementation((name) => {
        const ch = createMockChannel({
          subscribe: vi.fn((cb) => {
            subscribeCallback = cb;
            cb('SUBSCRIBED');
            return ch;
          }),
        });
        return ch;
      });

      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());

      // Simular desconexión
      subscribeCallback!('CHANNEL_ERROR');

      // Avanzar timer
      vi.advanceTimersByTime(10_000);

      // Debe haber intentado crear un nuevo canal
      expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
    });

    it('debe respetar el máximo de 5 reintentos', () => {
      const subscribeCallbacks: Array<(status: string) => void> = [];
      const onFalloDefinitivo = vi.fn();
      let callCount = 0;

      manager = new RealtimeChannelManager(mockSupabase as any, {
        maxReintentos: 5,
        intervaloMs: 10_000,
        onFalloDefinitivo,
      });

      mockSupabase.channel.mockImplementation((name) => {
        const ch = createMockChannel({
          subscribe: vi.fn((cb) => {
            subscribeCallbacks.push(cb);
            callCount++;
            // First subscription succeeds, subsequent ones fail immediately
            if (callCount === 1) {
              cb('SUBSCRIBED');
            } else {
              cb('CHANNEL_ERROR');
            }
            return ch;
          }),
        });
        return ch;
      });

      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());

      // Trigger initial disconnection
      subscribeCallbacks[0]('CHANNEL_ERROR');

      // Advance through 5 retry intervals - each creates a new channel that fails
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(10_000);
      }

      // After exhausting all 5 retries, onFalloDefinitivo should be called
      expect(onFalloDefinitivo).toHaveBeenCalledWith('pedidos:vendedor');
    });

    it('debe resetear reintentos cuando se reconecta exitosamente', () => {
      let subscribeCallback: ((status: string) => void) | null = null;
      const onReconectado = vi.fn();

      manager = new RealtimeChannelManager(mockSupabase as any, {
        maxReintentos: 5,
        intervaloMs: 10_000,
        onReconectado,
      });

      mockSupabase.channel.mockImplementation((name) => {
        const ch = createMockChannel({
          subscribe: vi.fn((cb) => {
            subscribeCallback = cb;
            cb('SUBSCRIBED');
            return ch;
          }),
        });
        return ch;
      });

      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());

      // Simular desconexión y reconexión
      subscribeCallback!('CHANNEL_ERROR');
      vi.advanceTimersByTime(10_000);
      subscribeCallback!('SUBSCRIBED');

      expect(onReconectado).toHaveBeenCalledWith('pedidos:vendedor');

      const estado = manager.getEstadoCanal('pedidos:vendedor');
      expect(estado!.reintentos).toBe(0);
    });

    it('debe usar intervalo de 10 segundos entre reintentos', () => {
      let subscribeCallback: ((status: string) => void) | null = null;

      mockSupabase.channel.mockImplementation((name) => {
        const ch = createMockChannel({
          subscribe: vi.fn((cb) => {
            subscribeCallback = cb;
            cb('SUBSCRIBED');
            return ch;
          }),
        });
        return ch;
      });

      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());

      subscribeCallback!('CHANNEL_ERROR');

      // No debe reconectar antes de 10s
      vi.advanceTimersByTime(5_000);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);

      // Debe reconectar después de 10s
      vi.advanceTimersByTime(5_000);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
    });
  });

  describe('canales del sistema', () => {
    it('debe soportar canal pedidos:vendedor', () => {
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());
      expect(mockSupabase.channel).toHaveBeenCalledWith('pedidos:vendedor');
    });

    it('debe soportar canal pedido:estado:{id}', () => {
      manager.suscribir('pedido:estado:pedido-123', 'cambio_estado', vi.fn());
      expect(mockSupabase.channel).toHaveBeenCalledWith('pedido:estado:pedido-123');
    });

    it('debe soportar canal ubicacion:{id}', () => {
      manager.suscribir('ubicacion:pedido-123', 'ubicacion_actualizada', vi.fn());
      expect(mockSupabase.channel).toHaveBeenCalledWith('ubicacion:pedido-123');
    });

    it('debe soportar canal inventario:alertas', () => {
      manager.suscribir('inventario:alertas', 'inventario_bajo', vi.fn());
      expect(mockSupabase.channel).toHaveBeenCalledWith('inventario:alertas');
    });

    it('debe soportar canal notificaciones:{userId}', () => {
      manager.suscribir('notificaciones:user-abc', 'push', vi.fn());
      expect(mockSupabase.channel).toHaveBeenCalledWith('notificaciones:user-abc');
    });
  });
});
