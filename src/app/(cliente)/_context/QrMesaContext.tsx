'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * QR Mesa/Zona context for tracking QR-based access to the menu.
 * When a client scans a QR code, the mesa/zona information is stored here
 * and used when creating the order to associate it with a specific table.
 *
 * Requirements: 8.1, 8.2, 8.3
 */

const STORAGE_KEY = 'alaburguer-qr-mesa';

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
  const [qrMesa, setQrMesaState] = useState<QrMesaInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setQrMesaState(JSON.parse(stored));
      }
    } catch { /* ignore parse errors */ }
    setHydrated(true);
  }, []);

  // Persist to localStorage when setting
  const setQrMesa = (info: QrMesaInfo | null) => {
    setQrMesaState(info);
    try {
      if (info) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore storage errors */ }
  };

  const value: QrMesaContextValue = {
    qrMesa,
    esOrdenQr: qrMesa !== null,
    setQrMesa,
  };

  if (!hydrated) return null;

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
