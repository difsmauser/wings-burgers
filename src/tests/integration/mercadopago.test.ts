import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MercadoPagoAdapter } from '@/adapters/driven/payment/MercadoPagoAdapter';
import { PagoFallidoError } from '@/shared/errors/PagoFallidoError';
import { ServicioExternoError } from '@/shared/errors/ServicioExternoError';
import type { Pedido } from '@/shared/domain-types';

describe('MercadoPagoAdapter - Integration Tests', () => {
  let adapter: MercadoPagoAdapter;
  const mockFetch = vi.fn();

  const pedidoMock: Pedido = {
    id: 'pedido-123',
    numero: 'P-001',
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

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    adapter = new MercadoPagoAdapter({
      accessToken: 'TEST-access-token-123',
      successUrl: '/pago/exitoso',
      failureUrl: '/pago/fallido',
      pendingUrl: '/pago/pendiente',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('crearPreferencia', () => {
    it('debe retornar una preferencia con URL de pago al crear exitosamente', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'pref-abc-123',
          init_point: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref-abc-123',
          expiration_date_to: '2024-12-31T23:59:59.000Z',
        }),
      });

      const resultado = await adapter.crearPreferencia(pedidoMock);

      expect(resultado.id).toBe('pref-abc-123');
      expect(resultado.urlPago).toBe(
        'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref-abc-123'
      );
      expect(resultado.monto).toBe(420.0);
      expect(resultado.urlRetorno).toBe('/pago/exitoso');
      expect(resultado.expiracion).toBeInstanceOf(Date);

      // Verificar que fetch fue llamado correctamente
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/checkout/preferences',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer TEST-access-token-123',
          }),
        })
      );

      // Verificar body enviado
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.items).toHaveLength(2);
      expect(callBody.items[0].title).toBe('Alitas BBQ');
      expect(callBody.items[0].quantity).toBe(2);
      expect(callBody.items[0].unit_price).toBe(150.0);
      expect(callBody.external_reference).toBe('pedido-123');
    });

    it('debe lanzar ServicioExternoError cuando la API responde con error HTTP', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request: invalid access token',
      });

      await expect(adapter.crearPreferencia(pedidoMock)).rejects.toThrow(ServicioExternoError);
    });

    it('debe lanzar ServicioExternoError cuando hay error de conexión', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(adapter.crearPreferencia(pedidoMock)).rejects.toThrow(ServicioExternoError);
    });
  });

  describe('procesarWebhook', () => {
    it('debe procesar webhook de pago aprobado y retornar NotificacionPago', async () => {
      const webhookPayload = {
        type: 'payment',
        data: { id: '12345' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 12345,
          status: 'approved',
          external_reference: 'pedido-123',
          transaction_amount: 420.0,
          date_approved: '2024-06-15T14:30:00.000Z',
        }),
      });

      const resultado = await adapter.procesarWebhook(webhookPayload);

      expect(resultado.pagoId).toBe('12345');
      expect(resultado.pedidoId).toBe('pedido-123');
      expect(resultado.estado).toBe('aprobado');
      expect(resultado.monto).toBe(420.0);
      expect(resultado.fecha).toBeInstanceOf(Date);
    });

    it('debe mapear estado "rejected" a "rechazado"', async () => {
      const webhookPayload = {
        type: 'payment',
        data: { id: '67890' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 67890,
          status: 'rejected',
          external_reference: 'pedido-456',
          transaction_amount: 250.0,
          date_created: '2024-06-15T14:30:00.000Z',
        }),
      });

      const resultado = await adapter.procesarWebhook(webhookPayload);
      expect(resultado.estado).toBe('rechazado');
    });

    it('debe lanzar PagoFallidoError cuando el payload es inválido', async () => {
      await expect(adapter.procesarWebhook(null)).rejects.toThrow(PagoFallidoError);
      await expect(adapter.procesarWebhook({})).rejects.toThrow(PagoFallidoError);
      await expect(
        adapter.procesarWebhook({ type: 'merchant_order', data: { id: '1' } })
      ).rejects.toThrow(PagoFallidoError);
    });

    it('debe lanzar ServicioExternoError cuando falla la consulta al API de pagos', async () => {
      const webhookPayload = {
        type: 'payment',
        data: { id: '99999' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(adapter.procesarWebhook(webhookPayload)).rejects.toThrow(ServicioExternoError);
    });
  });

  describe('verificarPago', () => {
    it('debe retornar estado aprobado para pago exitoso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 12345,
          status: 'approved',
        }),
      });

      const estado = await adapter.verificarPago('12345');
      expect(estado).toBe('aprobado');
    });

    it('debe lanzar PagoFallidoError cuando el pago no existe (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(adapter.verificarPago('inexistente')).rejects.toThrow(PagoFallidoError);
    });
  });
});
