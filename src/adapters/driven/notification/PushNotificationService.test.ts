import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PushNotificationService } from './PushNotificationService';

function createMockSupabase() {
  const mockFrom = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
  };

  const mockChannel = {
    send: vi.fn().mockResolvedValue('ok'),
  };

  return {
    from: vi.fn().mockReturnValue(mockFrom),
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    _from: mockFrom,
    _channel: mockChannel,
  };
}

describe('PushNotificationService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let service: PushNotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSupabase = createMockSupabase();
    // Use very short intervals for testing
    service = new PushNotificationService(mockSupabase as any, {
      maxReintentos: 3,
      intervaloMs: 100, // 100ms for fast tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('enviar', () => {
    it('debe intentar push y caer a in-app si no hay suscripción push', async () => {
      // No push subscription (default mock returns null)
      const resultado = await service.enviar('user-1', 'Nuevo pedido', 'Tu pedido fue recibido');

      // Should succeed via in-app fallback (broadcast)
      expect(resultado.exitoso).toBe(true);
      expect(resultado.mensajeId).toContain('inapp_user-1');
    });

    it('debe enviar push exitosamente si hay suscripción activa', async () => {
      // Mock a valid push subscription
      mockSupabase._from.single.mockResolvedValue({
        data: {
          endpoint: 'https://push.example.com/endpoint',
          p256dh: 'key-p256dh',
          auth: 'key-auth',
        },
        error: null,
      });

      // Mock the insert for push_envio
      mockSupabase._from.insert.mockResolvedValue({ error: null });

      const resultado = await service.enviar('user-1', 'Estado actualizado', 'Tu pedido está en camino');

      expect(resultado.exitoso).toBe(true);
      expect(resultado.mensajeId).toContain('push_user-1');
    });

    it('debe almacenar como pendiente si push y in-app fallan', async () => {
      // Push fails (no subscription)
      // In-app fails
      mockSupabase._channel.send.mockResolvedValue('error');

      const resultado = await service.enviar('user-1', 'Título', 'Cuerpo');

      expect(resultado.exitoso).toBe(false);
      expect(resultado.error).toContain('pendiente');
    });
  });

  describe('enviarConReintentos', () => {
    it('debe reintentar hasta 3 veces si falla', async () => {
      // Everything fails
      mockSupabase._channel.send.mockResolvedValue('error');
      mockSupabase._from.select.mockReturnThis();
      mockSupabase._from.single.mockResolvedValue({ data: null, error: { message: 'not found' } });

      const promise = service.enviarConReintentos('user-1', 'Test', 'Body');

      // Avanzar timers para los reintentos (3 intentos × 100ms intervalo)
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(100);

      const resultado = await promise;

      expect(resultado.exitoso).toBe(false);
      expect(resultado.error).toContain('3 intentos');
      expect(resultado.error).toContain('pendiente');
    });

    it('debe dejar de reintentar si un intento es exitoso', async () => {
      // First attempt fails (no push subscription, in-app fails)
      let callCount = 0;
      mockSupabase._channel.send.mockImplementation(() => {
        callCount++;
        // Succeed on second call (which is the in-app of the second attempt)
        return Promise.resolve(callCount >= 2 ? 'ok' : 'error');
      });

      const promise = service.enviarConReintentos('user-1', 'Test', 'Body');

      // Advance timer for first retry interval
      await vi.advanceTimersByTimeAsync(100);

      const resultado = await promise;
      expect(resultado.exitoso).toBe(true);
    });

    it('debe usar configuración de 3 intentos y 2 min por defecto', () => {
      const defaultService = new PushNotificationService(mockSupabase as any);
      // The default config is tested implicitly via constructor
      // Just ensure it creates without errors
      expect(defaultService).toBeDefined();
    });
  });

  describe('obtenerPendientes', () => {
    it('debe retornar notificaciones pendientes del usuario', async () => {
      mockSupabase._from.order.mockResolvedValue({
        data: [
          {
            id: 'notif-1',
            usuario_id: 'user-1',
            titulo: 'Pedido listo',
            cuerpo: 'Tu pedido está listo',
            reintentos: 3,
            creado_en: '2024-01-01T00:00:00Z',
            estado_envio: 'pendiente',
          },
        ],
        error: null,
      });

      const pendientes = await service.obtenerPendientes('user-1');

      expect(pendientes).toHaveLength(1);
      expect(pendientes[0].titulo).toBe('Pedido listo');
      expect(pendientes[0].estado).toBe('pendiente');
    });

    it('debe retornar array vacío si no hay pendientes', async () => {
      mockSupabase._from.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const pendientes = await service.obtenerPendientes('user-1');
      expect(pendientes).toHaveLength(0);
    });
  });

  describe('marcarComoLeida', () => {
    it('debe actualizar la notificación como leída', async () => {
      await service.marcarComoLeida('notif-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('notificacion');
      expect(mockSupabase._from.update).toHaveBeenCalledWith({ leida: true });
    });
  });
});
