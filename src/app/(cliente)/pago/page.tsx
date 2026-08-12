'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQrMesa } from '../_context/QrMesaContext';

// === Types ===

type MetodoPago = 'efectivo' | 'transferencia' | null;
type EstadoPago = 'seleccion' | 'procesando' | 'exito' | 'pendiente' | 'cancelado';

interface DatosBancarios {
  banco: string;
  titular: string;
  cuenta: string;
  clabe: string;
}

const DATOS_BANCARIOS: DatosBancarios = {
  banco: 'BBVA México',
  titular: 'Wings & Burgers SA de CV',
  cuenta: '0123456789',
  clabe: '012345678901234567',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const FORMATOS_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];
const FORMATOS_LABEL = 'JPG, PNG o PDF';

/**
 * Helper to get pedidoId from URL search params or localStorage.
 */
function usePedidoId(): string | null {
  const [pedidoId, setPedidoId] = useState<string | null>(null);

  useEffect(() => {
    // Try URL params first
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('pedidoId');
    if (idFromUrl) {
      setPedidoId(idFromUrl);
      return;
    }
    // Fallback: localStorage cart state
    try {
      const cart = localStorage.getItem('wings-burgers-carrito');
      if (cart) {
        const parsed = JSON.parse(cart);
        if (parsed?.pedidoId) {
          setPedidoId(parsed.pedidoId);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  return pedidoId;
}

/**
 * Payment method selection component.
 * Shows Efectivo and Transferencia options.
 * Touch targets minimum 44px.
 */
function MetodoSelector({
  onSelect,
}: {
  onSelect: (metodo: MetodoPago) => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl sm:text-2xl font-bold text-wood-800 text-center mb-6">
        Selecciona tu método de pago
      </h2>

      <button
        onClick={() => onSelect('efectivo')}
        className="
          w-full flex items-center gap-4 p-4 sm:p-5
          min-h-[44px] rounded-xl border-2 border-wood-200
          bg-white hover:border-brand-400 hover:bg-brand-50
          transition-all duration-200 motion-reduce:transition-none
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          group
        "
        aria-label="Pagar en efectivo"
      >
        <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-200 motion-reduce:transition-none" aria-hidden="true">
          💵
        </span>
        <div className="text-left">
          <span className="block text-lg font-semibold text-wood-800">
            Efectivo
          </span>
          <span className="block text-sm text-wood-500">
            Paga al recibir o en caja
          </span>
        </div>
      </button>

      <button
        onClick={() => onSelect('transferencia')}
        className="
          w-full flex items-center gap-4 p-4 sm:p-5
          min-h-[44px] rounded-xl border-2 border-wood-200
          bg-white hover:border-brand-400 hover:bg-brand-50
          transition-all duration-200 motion-reduce:transition-none
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          group
        "
        aria-label="Pagar con transferencia bancaria"
      >
        <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-200 motion-reduce:transition-none" aria-hidden="true">
          🏦
        </span>
        <div className="text-left">
          <span className="block text-lg font-semibold text-wood-800">
            Transferencia Bancaria
          </span>
          <span className="block text-sm text-wood-500">
            Transfiere y sube tu comprobante
          </span>
        </div>
      </button>
    </div>
  );
}

/**
 * Efectivo (cash) payment flow component.
 * Shows confirmation that payment will be collected in person.
 */
function EfectivoFlow({
  onBack,
  onConfirm,
}: {
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <span className="text-5xl block mb-4" aria-hidden="true">✅</span>
        <h3 className="text-xl font-bold text-wood-800 mb-2">
          Pago en efectivo registrado
        </h3>
        <p className="text-sm text-wood-600">
          Tu pedido está en proceso. Tendrás que pagar al momento de recibirlo o en caja.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 text-sm font-medium text-wood-600 hover:text-brand-600 transition-colors"
        aria-label="Volver a selección de método de pago"
      >
        ← Cambiar método
      </button>

      <div className="bg-white rounded-xl border border-wood-200 p-4 sm:p-6 shadow-sm text-center">
        <span className="text-5xl block mb-4" aria-hidden="true">💵</span>
        <h3 className="text-lg font-bold text-wood-800 mb-3">
          Pago en efectivo
        </h3>
        <p className="text-sm text-wood-600 mb-2">
          Pagarás al momento de recibir tu pedido o directamente en caja.
        </p>
        <p className="text-xs text-wood-500">
          Asegúrate de tener el monto exacto o cambio disponible.
        </p>
      </div>

      <button
        onClick={() => {
          setConfirmed(true);
          onConfirm();
        }}
        className="
          w-full min-h-[44px] px-4 py-4 rounded-xl
          bg-brand-500 hover:bg-brand-600 text-white font-bold text-base
          shadow-lg transition-all duration-200 motion-reduce:transition-none
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          active:scale-[0.98]
        "
      >
        Confirmar pago en efectivo
      </button>
    </div>
  );
}

/**
 * Bank Transfer payment flow component.
 * Shows bank details and file upload for proof of payment.
 * Validates file format (JPG, PNG, PDF) and size (max 5MB) before upload.
 */
function TransferenciaFlow({
  pedidoId,
  onBack,
  onSuccess,
}: {
  pedidoId: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validarArchivo = (file: File): string | null => {
    if (!FORMATOS_PERMITIDOS.includes(file.type)) {
      return `Formato no permitido. Solo se aceptan: ${FORMATOS_LABEL}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo excede el tamaño máximo de 5MB';
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validarArchivo(file);
    if (validationError) {
      setError(validationError);
      setArchivo(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setArchivo(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!archivo) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pedidoId', pedidoId);
      formData.append('archivo', archivo);

      const res = await fetch('/api/pagos/comprobante', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.error?.message || 'Error al subir el comprobante'
        );
      }

      setUploaded(true);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error desconocido al subir'
      );
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <div className="text-center py-8 animate-fade-in">
        <span className="text-5xl block mb-4" aria-hidden="true">✅</span>
        <h3 className="text-xl font-bold text-wood-800 mb-2">
          Comprobante enviado
        </h3>
        <p className="text-sm text-wood-600">
          Tu comprobante será verificado por el equipo. Te notificaremos
          cuando tu pago sea confirmado.
        </p>
        <div className="mt-4 p-3 bg-golden-50 border border-golden-200 rounded-lg">
          <p className="text-xs text-golden-800">
            Estado: <span className="font-semibold">Pendiente de verificación</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 text-sm font-medium text-wood-600 hover:text-brand-600 transition-colors"
        aria-label="Volver a selección de método de pago"
      >
        ← Cambiar método
      </button>

      {/* Bank Details Section */}
      <div className="bg-white rounded-xl border border-wood-200 p-4 sm:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-wood-800 mb-4 flex items-center gap-2">
          <span aria-hidden="true">🏦</span>
          Datos para transferencia
        </h3>

        <div className="space-y-3">
          <DatoBancario label="Banco" valor={DATOS_BANCARIOS.banco} />
          <DatoBancario label="Titular" valor={DATOS_BANCARIOS.titular} />
          <DatoBancario label="Número de cuenta" valor={DATOS_BANCARIOS.cuenta} />
          <DatoBancario label="CLABE interbancaria" valor={DATOS_BANCARIOS.clabe} />
        </div>
      </div>

      {/* 24h Cancellation Notice */}
      <div className="bg-golden-50 border border-golden-200 rounded-xl p-4" role="alert">
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden="true">⏰</span>
          <div>
            <p className="text-sm font-medium text-golden-800">
              Tienes 24 horas para subir tu comprobante
            </p>
            <p className="text-xs text-golden-700 mt-1">
              Si no subes el comprobante dentro de las próximas 24 horas,
              tu pedido será cancelado automáticamente.
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-xl border border-wood-200 p-4 sm:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-wood-800 mb-4 flex items-center gap-2">
          <span aria-hidden="true">📎</span>
          Subir comprobante
        </h3>

        <p className="text-sm text-wood-500 mb-4">
          Formatos aceptados: {FORMATOS_LABEL}. Tamaño máximo: 5MB.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileChange}
          className="hidden"
          id="comprobante-input"
          aria-label="Seleccionar archivo de comprobante"
        />

        {!archivo ? (
          <label
            htmlFor="comprobante-input"
            className="
              flex flex-col items-center justify-center
              min-h-[120px] p-6 rounded-xl
              border-2 border-dashed border-wood-300
              bg-wood-50 hover:bg-brand-50 hover:border-brand-400
              cursor-pointer transition-colors duration-200
              motion-reduce:transition-none
            "
          >
            <span className="text-3xl mb-2" aria-hidden="true">📄</span>
            <span className="text-sm font-medium text-wood-700">
              Toca para seleccionar archivo
            </span>
            <span className="text-xs text-wood-500 mt-1">
              {FORMATOS_LABEL} - máx. 5MB
            </span>
          </label>
        ) : (
          <div className="space-y-3">
            {/* File Preview */}
            <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg border border-brand-200">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Vista previa del comprobante"
                  className="w-12 h-12 rounded object-cover"
                />
              ) : (
                <span className="text-2xl" aria-hidden="true">📄</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-wood-800 truncate">
                  {archivo.name}
                </p>
                <p className="text-xs text-wood-500">
                  {(archivo.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => {
                  setArchivo(null);
                  setPreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-fire-500 hover:text-fire-700"
                aria-label="Eliminar archivo seleccionado"
              >
                ✕
              </button>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="
                w-full min-h-[44px] px-4 py-3 rounded-lg
                bg-brand-500 hover:bg-brand-600 text-white font-medium
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Subiendo...
                </span>
              ) : (
                'Enviar comprobante'
              )}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-fire-50 border border-fire-200 rounded-lg" role="alert">
            <p className="text-sm text-fire-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual bank detail row component with copy button.
 */
function DatoBancario({ label, valor }: { label: string; valor: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing if clipboard not available
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-wood-100 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-wood-500">{label}</p>
        <p className="text-sm font-medium text-wood-800 truncate">{valor}</p>
      </div>
      <button
        onClick={handleCopy}
        className="
          min-w-[44px] min-h-[44px] flex items-center justify-center
          text-sm text-wood-500 hover:text-brand-600
          transition-colors duration-150
        "
        aria-label={`Copiar ${label}`}
      >
        {copied ? '✓' : '📋'}
      </button>
    </div>
  );
}

/**
 * Payment status display component.
 */
function EstadoPagoDisplay({ estado }: { estado: EstadoPago }) {
  const config: Record<EstadoPago, { icon: string; title: string; desc: string; color: string }> = {
    seleccion: { icon: '💳', title: '', desc: '', color: '' },
    procesando: {
      icon: '⏳',
      title: 'Procesando pago',
      desc: 'Estamos verificando tu pago...',
      color: 'bg-golden-50 border-golden-200 text-golden-800',
    },
    exito: {
      icon: '✅',
      title: 'Pago confirmado',
      desc: '¡Tu pago fue recibido exitosamente! Tu pedido está en proceso.',
      color: 'bg-green-50 border-green-200 text-green-800',
    },
    pendiente: {
      icon: '🕐',
      title: 'Pendiente de verificación',
      desc: 'Tu comprobante está siendo revisado. Te notificaremos cuando sea aprobado.',
      color: 'bg-golden-50 border-golden-200 text-golden-800',
    },
    cancelado: {
      icon: '🚫',
      title: 'Pedido cancelado',
      desc: 'El pedido fue cancelado por no recibir el pago a tiempo.',
      color: 'bg-wood-50 border-wood-200 text-wood-800',
    },
  };

  const c = config[estado];
  if (!c.title) return null;

  return (
    <div className={`p-4 sm:p-6 rounded-xl border ${c.color} animate-fade-in`} role="status">
      <div className="text-center">
        <span className="text-4xl block mb-3" aria-hidden="true">{c.icon}</span>
        <h3 className="text-lg font-bold mb-1">{c.title}</h3>
        <p className="text-sm">{c.desc}</p>
      </div>
    </div>
  );
}

/**
 * Pago page for the cliente module.
 *
 * Shows two payment options: Efectivo (cash) and Transferencia (bank transfer).
 * Efectivo: confirms cash payment on pickup/delivery.
 * Transferencia: shows bank details and allows uploading proof of payment.
 * Responsive design with 44px touch targets.
 */
export default function PagoPage() {
  const pedidoId = usePedidoId();
  const { qrMesa } = useQrMesa();
  const menuHref = qrMesa ? `/menu?qr=${qrMesa.codigo}` : '/menu';
  const [metodo, setMetodo] = useState<MetodoPago>(null);
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('seleccion');

  // If no pedidoId found, show message
  if (!pedidoId) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-12">
          <span className="text-5xl block mb-4" aria-hidden="true">🛒</span>
          <h2 className="text-xl font-bold text-wood-800 mb-2">
            No hay pedido activo
          </h2>
          <p className="text-sm text-wood-600">
            Agrega productos a tu carrito para continuar con el pago.
          </p>
          <a
            href={menuHref}
            className="
              inline-flex items-center justify-center mt-6
              min-h-[44px] px-6 py-3 rounded-lg
              bg-brand-500 hover:bg-brand-600 text-white font-medium
              transition-colors duration-150 motion-reduce:transition-none
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
            "
          >
            Ir al menú
          </a>
        </div>
      </div>
    );
  }

  // Show payment status if not in selection mode
  if (estadoPago !== 'seleccion') {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <EstadoPagoDisplay estado={estadoPago} />
        {estadoPago === 'exito' && (
          <div className="mt-6 text-center">
            <a
              href="/rastreo"
              className="
                inline-flex items-center justify-center
                min-h-[44px] px-6 py-3 rounded-lg
                bg-brand-500 hover:bg-brand-600 text-white font-medium
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
              "
            >
              Rastrear mi pedido
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <span className="text-4xl block mb-2" aria-hidden="true">💳</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-wood-800">
          Pago
        </h1>
      </div>

      {/* Payment Method Selection or Flow */}
      {!metodo && (
        <MetodoSelector onSelect={setMetodo} />
      )}

      {metodo === 'efectivo' && (
        <EfectivoFlow
          onBack={() => setMetodo(null)}
          onConfirm={() => setEstadoPago('exito')}
        />
      )}

      {metodo === 'transferencia' && (
        <TransferenciaFlow
          pedidoId={pedidoId}
          onBack={() => setMetodo(null)}
          onSuccess={() => setEstadoPago('pendiente')}
        />
      )}
    </div>
  );
}
