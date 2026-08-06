import { describe, it, expect, beforeEach } from 'vitest';
import {
  getQrStore,
  registrarQrEnStore,
  buscarQrPorCodigo,
  desactivarQr,
  type QrMesaRecord,
} from './qr-store';

describe('qr-store', () => {
  beforeEach(() => {
    // Clear the store before each test
    const store = getQrStore();
    store.length = 0;
  });

  describe('registrarQrEnStore', () => {
    it('agrega un registro al store', () => {
      const record: QrMesaRecord = {
        id: 'test-id-1',
        codigo: 'ABC12345',
        mesaZona: 'Mesa 1',
        activo: true,
      };

      registrarQrEnStore(record);

      const store = getQrStore();
      expect(store).toHaveLength(1);
      expect(store[0]).toEqual(record);
    });

    it('permite registrar múltiples QRs', () => {
      registrarQrEnStore({ id: '1', codigo: 'QR001', mesaZona: 'Mesa 1', activo: true });
      registrarQrEnStore({ id: '2', codigo: 'QR002', mesaZona: 'Mesa 2', activo: true });
      registrarQrEnStore({ id: '3', codigo: 'QR003', mesaZona: 'Terraza', activo: true });

      expect(getQrStore()).toHaveLength(3);
    });
  });

  describe('buscarQrPorCodigo', () => {
    it('encuentra un QR existente por su código', () => {
      registrarQrEnStore({ id: '1', codigo: 'VALID123', mesaZona: 'Mesa 5', activo: true });

      const result = buscarQrPorCodigo('VALID123');
      expect(result).toBeDefined();
      expect(result?.mesaZona).toBe('Mesa 5');
    });

    it('retorna undefined para código inexistente', () => {
      registrarQrEnStore({ id: '1', codigo: 'VALID123', mesaZona: 'Mesa 5', activo: true });

      const result = buscarQrPorCodigo('INVALID_CODE');
      expect(result).toBeUndefined();
    });

    it('retorna QR incluso si está inactivo', () => {
      registrarQrEnStore({ id: '1', codigo: 'INACTIVE1', mesaZona: 'Mesa 3', activo: false });

      const result = buscarQrPorCodigo('INACTIVE1');
      expect(result).toBeDefined();
      expect(result?.activo).toBe(false);
    });
  });

  describe('desactivarQr', () => {
    it('desactiva un QR por su ID', () => {
      registrarQrEnStore({ id: 'qr-to-deactivate', codigo: 'CODE123', mesaZona: 'Mesa 1', activo: true });

      desactivarQr('qr-to-deactivate');

      const result = buscarQrPorCodigo('CODE123');
      expect(result?.activo).toBe(false);
    });

    it('no hace nada si el ID no existe', () => {
      registrarQrEnStore({ id: '1', codigo: 'CODE123', mesaZona: 'Mesa 1', activo: true });

      desactivarQr('nonexistent-id');

      const result = buscarQrPorCodigo('CODE123');
      expect(result?.activo).toBe(true);
    });
  });
});
