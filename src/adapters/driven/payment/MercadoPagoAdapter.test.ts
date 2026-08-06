import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MercadoPagoAdapter } from './MercadoPagoAdapter';
import { ServicioExternoError } from '@/shared/errors/ServicioExternoError';
import { PagoFallidoError } from '@/shared/errors/PagoFallidoError';
import type { Pedido } from '@/shared/domain-types';

const mockPedido: Pedido = {
  id: 'pedido-123',
  numero: 'P001',
  clienteId: 'cliente-1',
  items: [
    {
      productoId: 'prod-1',
      nombre: 'Alitas BBQ',
      cantidad: 2,
      precioUnitario: 150.0,
    },
    {
      productoId: 'prod-2',
      nombre: 'Hamburguesa Clásica',
      cantidad: 1,
      precioUnitario: 120.0,
    },
  ],
  estado: 'recibido',
  modalidad: 'domicilio',
  total: 420.0,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
};

describe('MercadoPagoAdapter', () => {
  let adapter: MercadoPagoAdapter;
  const originalFetch = global.fetch;

  beforeEach(() => {
    adapter = new MercadoPagoAdapter({
      accessToken: 'TEST-access-token-123',
      successUrl: 'https://mitienda.com/pago/exitoso',
      failureUrl: 'https://mitienda.com/pago/fallido',
      pendingUrl: 'https://mitienda.com/pago/pendiente',
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw ServicioExternoError when access token is missing', () => {
      const originalEnv = process.env.MERCADOPAGO_ACCESS_TOKEN;
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;

      expect(
        () => new MercadoPagoAdapter({ accessToken: '' })
      ).toThrow(ServicioExternoError);

      process.env.MERCADOPAGO_ACCESS_TOKEN = originalEnv;
    });

    it('should create adapter with valid access token', () => {
      expect(adapter).toBeInstanceOf(MercadoPagoAdapter);
    });
  });

  describe('crearPreferencia', () => {
    it('should create a preference and return PreferenciaPago', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'pref-abc123',
          init_point: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref-abc123',
          expiration_date_to: '2025-01-15T23:59:59.000-04:00',
        }),
      });

      const resultado = await adapter.crearPreferencia(mockPedido);

      expect(resultado.id).toBe('pref-abc123');
      expect(resultado.urlPago).toBe(
        'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref-abc123'
      );
      expect(resultado.monto).toBe(420.0);
      expect(resultado.urlRetorno).toBe('https://mitienda.com/pago/exitoso');
      expect(resultado.expiracion).toBeInstanceOf(Date);

      // Verify correct API call
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/checkout/preferences',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer TEST-access-token-123',
          }),
        })
      );

      // Verify request body contains items
      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.items).toHaveLength(2);
      expect(body.items[0].title).toBe('Alitas BBQ');
      expect(body.items[0].quantity).toBe(2);
      expect(body.items[0].unit_price).toBe(150.0);
      expect(body.back_urls.success).toBe('https://mitienda.com/pago/exitoso');
      expect(body.back_urls.failure).toBe('https://mitienda.com/pago/fallido');
      expect(body.back_urls.pending).toBe('https://mitienda.com/pago/pendiente');
      expect(body.auto_return).toBe('approved');
      expect(body.external_reference).toBe('pedido-123');
    });

    it('should throw ServicioExternoError on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      await expect(adapter.crearPreferencia(mockPedido)).rejects.toThrow(ServicioExternoError);
    });

    it('should throw ServicioExternoError on non-OK response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"message":"invalid items"}',
      });

      await expect(adapter.crearPreferencia(mockPedido)).rejects.toThrow(ServicioExternoError);
    });
  });

  describe('verificarPago', () => {
    it('should return mapped payment status for approved payment', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 12345,
          status: 'approved',
          status_detail: 'accredited',
        }),
      });

      const estado = await adapter.verificarPago('12345');

      expect(estado).toBe('aprobado');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/v1/payments/12345',
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer TEST-access-token-123' },
        })
      );
    });

    it('should return rechazado for rejected payments', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'rejected' }),
      });

      const estado = await adapter.verificarPago('12345');
      expect(estado).toBe('rechazado');
    });

    it('should return pendiente for pending payments', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'pending' }),
      });

      const estado = await adapter.verificarPago('12345');
      expect(estado).toBe('pendiente');
    });

    it('should return en_proceso for in_process payments', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'in_process' }),
      });

      const estado = await adapter.verificarPago('12345');
      expect(estado).toBe('en_proceso');
    });

    it('should return cancelado for cancelled/refunded payments', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'cancelled' }),
      });

      const estado = await adapter.verificarPago('12345');
      expect(estado).toBe('cancelado');
    });

    it('should throw PagoFallidoError on 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(adapter.verificarPago('99999')).rejects.toThrow(PagoFallidoError);
    });

    it('should throw ServicioExternoError on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      await expect(adapter.verificarPago('12345')).rejects.toThrow(ServicioExternoError);
    });

    it('should default to pendiente for unknown status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'unknown_status' }),
      });

      const estado = await adapter.verificarPago('12345');
      expect(estado).toBe('pendiente');
    });
  });

  describe('procesarWebhook', () => {
    it('should process valid payment webhook notification', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 67890,
          status: 'approved',
          external_reference: 'pedido-456',
          transaction_amount: 350.0,
          date_approved: '2025-01-10T14:30:00.000-04:00',
        }),
      });

      const notificacion = await adapter.procesarWebhook({
        type: 'payment',
        data: { id: '67890' },
      });

      expect(notificacion.pagoId).toBe('67890');
      expect(notificacion.pedidoId).toBe('pedido-456');
      expect(notificacion.estado).toBe('aprobado');
      expect(notificacion.monto).toBe(350.0);
      expect(notificacion.fecha).toBeInstanceOf(Date);
    });

    it('should throw PagoFallidoError for null payload', async () => {
      await expect(adapter.procesarWebhook(null)).rejects.toThrow(PagoFallidoError);
    });

    it('should throw PagoFallidoError for non-payment type', async () => {
      await expect(
        adapter.procesarWebhook({ type: 'merchant_order', data: { id: '123' } })
      ).rejects.toThrow(PagoFallidoError);
    });

    it('should throw PagoFallidoError for missing data.id', async () => {
      await expect(
        adapter.procesarWebhook({ type: 'payment', data: {} })
      ).rejects.toThrow(PagoFallidoError);
    });

    it('should throw ServicioExternoError when payment query fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(
        adapter.procesarWebhook({ type: 'payment', data: { id: '12345' } })
      ).rejects.toThrow(ServicioExternoError);
    });

    it('should throw ServicioExternoError on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('DNS resolution failed'));

      await expect(
        adapter.procesarWebhook({ type: 'payment', data: { id: '12345' } })
      ).rejects.toThrow(ServicioExternoError);
    });
  });
});
