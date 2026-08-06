'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * QR Mesa/Zona context for tracking QR-based access to the menu.
 * When a client scans a QR code, the mesa/zona information is stored here
 * and used when creating the order to associate it with a specific table.
 *
 * Requirements: 8.1, 8.2, 8.3
 */

interface QrMesaInfo {
  codigo: string;
  mesaZona: string;
}

interface QrMesaContextValue {
  /** The validated QR mesa info, null if not accessed via QR */
  qrMesa: QrMesaInfo | null;
  /** Whether the order originated from a QR scan */
  esOrdenQr: boolean;
  /** Set the QR mesa info after validation */
  setQrMesa: (info: QrMesaInfo | null) => void;
}

const QrMesaContext = createContext<QrMesaContextValue | null>(null);

export function QrMesaProvider({ children }: { children: ReactNode }) {
  const [qrMesa, setQrMesa] = useState<QrMesaInfo | null>(null);

  const value: QrMesaContextValue = {
    qrMesa,
    esOrdenQr: qrMesa !== null,
    setQrMesa,
  };

  return (
    <QrMesaContext.Provider value={value}>
      {children}
    </QrMesaContext.Provider>
  );
}

/**
 * Hook to access the QR mesa context.
 * Must be used within a QrMesaProvider.
 */
export function useQrMesa(): QrMesaContextValue {
  const context = useContext(QrMesaContext);
  if (!context) {
    throw new Error('useQrMesa debe usarse dentro de un QrMesaProvider');
  }
  return context;
}
