/**
 * Shared in-memory QR store for development.
 * Will be replaced by Supabase persistence in task 17.1 wiring.
 *
 * This module provides a shared store between the QR generation (/api/qr)
 * and QR validation (/api/qr/[codigo]) routes so that generated QR codes
 * can be validated within the same server process.
 *
 * Requirements: 8.1, 8.3
 */

export interface QrMesaRecord {
  id: string;
  codigo: string;
  mesaZona: string;
  activo: boolean;
}

/**
 * In-memory QR store shared across API routes within the same server process.
 */
const qrStore: QrMesaRecord[] = [];

/**
 * Get the QR store (returns the shared reference).
 */
export function getQrStore(): QrMesaRecord[] {
  return qrStore;
}

/**
 * Register a new QR code in the store.
 */
export function registrarQrEnStore(record: QrMesaRecord): void {
  qrStore.push(record);
}

/**
 * Find a QR code by its unique code string.
 */
export function buscarQrPorCodigo(codigo: string): QrMesaRecord | undefined {
  return qrStore.find((r) => r.codigo === codigo);
}

/**
 * Deactivate a QR code by its ID.
 */
export function desactivarQr(id: string): void {
  const record = qrStore.find((r) => r.id === id);
  if (record) {
    record.activo = false;
  }
}
