import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealtimeChannelManager } from '@/adapters/driven/notification/RealtimeChannelManager';

/**
 * Tests for the useRealtimeChannel hook's underlying logic.
 * Since this is a React hook and we don't have @testing-library/react,
 * we test the core RealtimeChannelManager integration which the hook wraps.
 *
 * The hook delegates all subscription/reconnection logic to RealtimeChannelManager.
 * These tests verify the contract the hook depends on.
 */

function createMockChannel(overrides = {}) {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation((cb) => {
      if (cb) cb('SUBSCRIBED');
      return channel;
    }),
    send: vi.fn().mockResolvedValue('ok'),
    unsubscribe: vi.fn(),
    ...overrides,
  };
  return channel;
}

function createMockSupabase() {
  return {
    channel: vi.fn(() => createMockChannel()),
    removeChannel: vi.fn(),
  };
}

describe('useRealtimeChannel - underlying RealtimeChannelManager integration', () => {
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

  describe('suscripción a canales del sistema', () => {
    it('debe suscribirse al canal pedidos:vendedor', () => {
      const callback = vi.fn();
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('pedidos:vendedor');
      expect(manager.getCanalesActivos()).toContain('pedidos:vendedor');
    });

    it('debe suscribirse al canal pedido:estado:{id}', () => {
      const callback = vi.fn();
      manager.suscribir('pedido:estado:abc123', 'cambio_estado', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('pedido:estado:abc123');
      expect(manager.getCanalesActivos()).toContain('pedido:estado:abc123');
    });

    it('debe suscribirse al canal ubicacion:{id}', () => {
      const callback = vi.fn();
      manager.suscribir('ubicacion:pedido-xyz', 'ubicacion_actualizada', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('ubicacion:pedido-xyz');
      expect(manager.getCanalesActivos()).toContain('ubicacion:pedido-xyz');
    });

    it('debe suscribirse al canal inventario:alertas', () => {
      const callback = vi.fn();
      manager.suscribir('inventario:alertas', 'inventario_bajo', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('inventario:alertas');
      expect(manager.getCanalesActivos()).toContain('inventario:alertas');
    });

    it('debe suscribirse al canal notificaciones:{userId}', () => {
      const callback = vi.fn();
      manager.suscribir('notificaciones:user-abc', 'push', callback);

      expect(mockSupabase.channel).toHaveBeenCalledWith('notificaciones:user-abc');
      expect(manager.getCanalesActivos()).toContain('notificaciones:user-abc');
    });
  });

  describe('cleanup on unmount (desuscribirTodos)', () => {
    it('debe limpiar todos los canales al desuscribir todos', () => {
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());
      manager.suscribir('inventario:alertas', 'inventario_bajo', vi.fn());

      expect(manager.getCanalesActivos()).toHaveLength(2);

      manager.desuscribirTodos();

      expect(manager.getCanalesActivos()).toHaveLength(0);
    });

    it('debe llamar removeChannel por cada canal limpiado', () => {
      manager.suscribir('pedidos:vendedor', 'nuevo_pedido', vi.fn());
      manager.suscribir('inventario:alertas', 'inventario_bajo', vi.fn());

      manager.desuscribirTodos();

      expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
    });
  });

  describe('reconexión automática (max 5 reintentos, 10s intervalo)', () => {
    it('debe configurar con max 5 reintentos', () => {
      const onFalloDefinitivo = vi.fn();
      const subscribeCallbacks: Array<(status: string) => void> = [];
      let channelCount = 0;

      manager = new RealtimeChannelManager(mockSupabase as any, {
        maxReintentos: 5,
        intervaloMs: 10_000,
        onFalloDefinitivo,
      });

      mockSupabase.channel.mockImplementation(() => {
        const ch = createMockChannel({
          subscribe: vi.fn((cb) => {
            channelCount++;
            subscribeCallbacks.push(cb);
            if (channelCount === 1) {
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

      // Trigger disconnect
      subscribeCallbacks[0]('CHANNEL_ERROR');

      // Exhaust all 5 retry attempts
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(10_000);
      }

      expect(onFalloDefinitivo).toHaveBeenCalledWith('pedidos:vendedor');
    });

    it('debe usar intervalo de 10 segundos entre reintentos', () => {
      let subscribeCallback: ((status: string) => void) | null = null;

      mockSupabase.channel.mockImplementation(() => {
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

      // Trigger disconnect
      subscribeCallback!('CHANNEL_ERROR');

      // At 5s, shouldn't have reconnected yet
      vi.advanceTimersByTime(5_000);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1);

      // At 10s, should attempt reconnection
      vi.advanceTimersByTime(5_000);
      expect(mockSupabase.channel).toHaveBeenCalledTimes(2);
    });

    it('debe notificar reconexión exitosa y resetear reintentos', () => {
      const onReconectado = vi.fn();
      let subscribeCallback: ((status: string) => void) | null = null;

      manager = new RealtimeChannelManager(mockSupabase as any, {
        maxReintentos: 5,
        intervaloMs: 10_000,
        onReconectado,
      });

      mockSupabase.channel.mockImplementation(() => {
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

      // Simulate disconnect
      subscribeCallback!('CHANNEL_ERROR');
      vi.advanceTimersByTime(10_000);

      // The new channel subscribes successfully
      subscribeCallback!('SUBSCRIBED');

      expect(onReconectado).toHaveBeenCalledWith('pedidos:vendedor');
      expect(manager.getEstadoCanal('pedidos:vendedor')?.reintentos).toBe(0);
    });

    it('debe notificar desconexión cuando canal pierde conexión', () => {
      const onDesconectado = vi.fn();
      let subscribeCallback: ((status: string) => void) | null = null;

      manager = new RealtimeChannelManager(mockSupabase as any, {
        maxReintentos: 5,
        intervaloMs: 10_000,
        onDesconectado,
      });

      mockSupabase.channel.mockImplementation(() => {
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

      // Simulate disconnect
      subscribeCallback!('TIMED_OUT');

      expect(onDesconectado).toHaveBeenCalledWith('pedidos:vendedor');
    });
  });

  describe('manejo de errores', () => {
    it('debe manejar CHANNEL_ERROR', () => {
      let subscribeCallback: ((status: string) => void) | null = null;
      const onDesconectado = vi.fn();

      manager = new RealtimeChannelManager(mockSupabase as any, {
        maxReintentos: 5,
        intervaloMs: 10_000,
        onDesconectado,
      });

      mockSupabase.channel.mockImplementation(() => {
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

      expect(onDesconectado).toHaveBeenCalled();
      expect(manager.getEstadoCanal('pedidos:vendedor')?.activo).toBe(false);
    });

    it('debe manejar TIMED_OUT', () => {
      let subscribeCallback: ((status: string) => void) | null = null;
      const onDesconectado = vi.fn();

      manager = new RealtimeChannelManager(mockSupabase as any, {
        maxReintentos: 5,
        intervaloMs: 10_000,
        onDesconectado,
      });

      mockSupabase.channel.mockImplementation(() => {
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
      subscribeCallback!('TIMED_OUT');

      expect(onDesconectado).toHaveBeenCalled();
    });

    it('debe manejar CLOSED', () => {
      let subscribeCallback: ((status: string) => void) | null = null;
      const onDesconectado = vi.fn();

      manager = new RealtimeChannelManager(mockSupabase as any, {
        maxReintentos: 5,
        intervaloMs: 10_000,
        onDesconectado,
      });

      mockSupabase.channel.mockImplementation(() => {
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
      subscribeCallback!('CLOSED');

      expect(onDesconectado).toHaveBeenCalled();
    });
  });
});
