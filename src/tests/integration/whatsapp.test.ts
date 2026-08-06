import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppAdapter } from '@/adapters/driven/messaging/WhatsAppAdapter';
import { ServicioExternoError } from '@/shared/errors/ServicioExternoError';

describe('WhatsAppAdapter - Integration Tests', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  describe('enviarWhatsApp - envío exitoso', () => {
    it('debe enviar mensaje exitosamente y retornar ResultadoEnvio con exitoso=true', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wamid.HBgNNTI1NTU1MDAwMDAwMBUCA' }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new WhatsAppAdapter({
        token: 'test-whatsapp-token',
        phoneNumberId: '123456789',
        businessAccountId: 'biz-account-1',
        maxReintentos: 3,
        timeoutMs: 30_000,
      });

      const resultado = await adapter.enviarWhatsApp('5512345678', 'Tu pedido está listo');

      expect(resultado.exitoso).toBe(true);
      expect(resultado.mensajeId).toBe('wamid.HBgNNTI1NTU1MDAwMDAwMBUCA');
      expect(resultado.fecha).toBeInstanceOf(Date);

      // Verificar que envió al endpoint correcto con formato internacional
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/123456789/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-whatsapp-token',
            'Content-Type': 'application/json',
          }),
        })
      );

      // Verificar body con teléfono formateado (52 + 10 dígitos)
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.to).toBe('525512345678');
      expect(callBody.type).toBe('text');
      expect(callBody.text.body).toBe('Tu pedido está listo');
    });

    it('debe formatear correctamente teléfonos que ya tienen código de país', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wamid.123' }],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new WhatsAppAdapter({
        token: 'test-whatsapp-token',
        phoneNumberId: '123456789',
        businessAccountId: 'biz-account-1',
      });

      await adapter.enviarWhatsApp('525512345678', 'Mensaje');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.to).toBe('525512345678');
    });
  });

  describe('enviarWhatsApp - reintentos en fallo de red', () => {
    it('debe reintentar hasta 3 veces y lanzar ServicioExternoError si todos fallan', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('ECONNRESET'));
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new WhatsAppAdapter({
        token: 'test-whatsapp-token',
        phoneNumberId: '123456789',
        businessAccountId: 'biz-account-1',
        maxReintentos: 3,
        timeoutMs: 30_000,
      });

      await expect(
        adapter.enviarWhatsApp('5512345678', 'Mensaje')
      ).rejects.toThrow(ServicioExternoError);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('debe tener éxito en el segundo intento después de un fallo', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            messages: [{ id: 'wamid.retry-success' }],
          }),
        });
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new WhatsAppAdapter({
        token: 'test-whatsapp-token',
        phoneNumberId: '123456789',
        businessAccountId: 'biz-account-1',
        maxReintentos: 3,
        timeoutMs: 30_000,
      });

      const resultado = await adapter.enviarWhatsApp('5512345678', 'Mensaje reintentado');

      expect(resultado.exitoso).toBe(true);
      expect(resultado.mensajeId).toBe('wamid.retry-success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('enviarWhatsApp - timeout handling', () => {
    it('debe lanzar error cuando la petición es abortada por timeout', async () => {
      // Simular que fetch rechaza con AbortError (timeout triggered)
      const mockFetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new WhatsAppAdapter({
        token: 'test-whatsapp-token',
        phoneNumberId: '123456789',
        businessAccountId: 'biz-account-1',
        maxReintentos: 3,
        timeoutMs: 100, // Timeout muy corto para test
      });

      await expect(
        adapter.enviarWhatsApp('5512345678', 'Mensaje que expira')
      ).rejects.toThrow(ServicioExternoError);

      // Verifica que intentó las 3 veces
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('enviarWhatsApp - error HTTP del API', () => {
    it('debe reintentar cuando el API responde con error HTTP', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            messages: [{ id: 'wamid.recovered' }],
          }),
        });
      vi.stubGlobal('fetch', mockFetch);

      const adapter = new WhatsAppAdapter({
        token: 'test-whatsapp-token',
        phoneNumberId: '123456789',
        businessAccountId: 'biz-account-1',
        maxReintentos: 3,
        timeoutMs: 30_000,
      });

      const resultado = await adapter.enviarWhatsApp('5512345678', 'Mensaje');

      expect(resultado.exitoso).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('enviarEmail', () => {
    it('debe retornar exitoso=false indicando que no está implementado', async () => {
      const adapter = new WhatsAppAdapter({
        token: 'test-whatsapp-token',
        phoneNumberId: '123456789',
        businessAccountId: 'biz-account-1',
      });

      const resultado = await adapter.enviarEmail(
        'test@example.com',
        'Asunto',
        'Contenido'
      );

      expect(resultado.exitoso).toBe(false);
      expect(resultado.error).toContain('email no está implementado');
    });
  });
});
