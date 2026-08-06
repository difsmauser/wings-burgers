'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// === Types ===

type MetodoPago = 'mercadopago' | 'transferencia' | null;
type EstadoPago = 'seleccion' | 'procesando' | 'exito' | 'fallido' | 'pendiente' | 'cancelado';

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

const MAX_REINTENTOS_MP = 3;
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
      const cart = localStorage.getItem('carrito');
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
 * Shows MercadoPago and Bank Transfer options within 3 seconds (Req 13.1).
 * Touch targets minimum 44px (Req 18.2).
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
        onClick={() => onSelect('mercadopago')}
        className="
          w-full flex items-center gap-4 p-4 sm:p-5
          min-h-[44px] rounded-xl border-2 border-wood-200
          bg-white hover:border-brand-400 hover:bg-brand-50
          transition-all duration-200 motion-reduce:transition-none
          focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
          group
        "
        aria-label="Pagar con MercadoPago"
      >
        <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-200 motion-reduce:transition-none" aria-hidden="true">
          💳
        </span>
        <div className="text-left">
          <span className="block text-lg font-semibold text-wood-800">
            MercadoPago
          </span>
          <span className="block text-sm text-wood-500">
            Pago seguro con tarjeta o saldo
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
 * MercadoPago payment flow component.
 * Initiates payment via POST /api/pagos/mercadopago and redirects (Req 13.2).
 * Handles failure with retry up to 3 attempts (Req 13.6).
 */
function MercadoPagoFlow({
  pedidoId,
  onBack,
}: {
  pedidoId: string;
  onBack: () => void;
}) {
  const [estado, setEstado] = useState<'idle' | 'loading' | 'error'>('idle');
  const [intentos, setIntentos] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const iniciarPago = useCallback(async () => {
    if (intentos >= MAX_REINTENTOS_MP) return;

    setEstado('loading');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/pagos/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.error?.message || 'Error al procesar el pago'
        );
      }

      const { data } = await res.json();
      // Redirect to MercadoPago checkout URL
      if (data?.initPoint || data?.checkoutUrl || data?.url) {
        window.location.href = data.initPoint || data.checkoutUrl || data.url;
      } else {
        throw new Error('No se recibió URL de pago');
      }
    } catch (err) {
      const newIntentos = intentos + 1;
      setIntentos(newIntentos);
      setEstado('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'Error desconocido'
      );
    }
  }, [pedidoId, intentos]);

  // Auto-initiate on mount
  useEffect(() => {
    if (estado === 'idle') {
      iniciarPago();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 min-h-[44px] px-3 py-2 text-sm font-medium text-wood-600 hover:text-brand-600 transition-colors"
        aria-label="Volver a selección de método de pago"
      >
        ← Cambiar método
      </button>

      {estado === 'loading' && (
        <div className="text-center py-12">
          <div className="inline-block w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" aria-hidden="true" />
          <p className="mt-4 text-wood-600 font-medium">
            Conectando con MercadoPago...
          </p>
          <p className="text-sm text-wood-400 mt-1">
            Serás redirigido en unos momentos
          </p>
        </div>
      )}

      {estado === 'error' && (
        <div className="bg-fire-50 border border-fire-200 rounded-xl p-4 sm:p-6" role="alert">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-fire-800">
                Error en el pago
              </h3>
              <p className="text-sm text-fire-700 mt-1">
                {errorMsg}
              </p>
              <p className="text-xs text-fire-600 mt-2">
                Intento {intentos} de {MAX_REINTENTOS_MP}
              </p>
            </div>
          </div>

          {intentos < MAX_REINTENTOS_MP ? (
            <button
              onClick={iniciarPago}
              className="
                mt-4 w-full min-h-[44px] px-4 py-3 rounded-lg
                bg-brand-500 hover:bg-brand-600 text-white font-medium
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
              "
            >
              Reintentar pago
            </button>
          ) : (
            <div className="mt-4 p-3 bg-fire-100 rounded-lg">
              <p className="text-sm text-fire-800 font-medium">
                Se agotaron los intentos disponibles.
              </p>
              <p className="text-xs text-fire-700 mt-1">
                Puedes intentar con transferencia bancaria o contactar al restaurante.
              </p>
              <button
                onClick={onBack}
                className="
                  mt-3 w-full min-h-[44px] px-4 py-3 rounded-lg
                  bg-wood-100 hover:bg-wood-200 text-wood-800 font-medium
                  border border-wood-300
                  transition-colors duration-150 motion-reduce:transition-none
                  focus:outline-none focus:ring-2 focus:ring-wood-300 focus:ring-offset-2
                "
              >
                Elegir otro método de pago
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Bank Transfer payment flow component.
 * Shows bank details and file upload for proof (Req 13.3, 13.9).
 * Validates file format (JPG, PNG, PDF) and size (max 5MB) before upload.
 * Shows 24h cancellation notice (Req 13.8).
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
      // Reset file input
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

      {/* 24h Cancellation Notice (Req 13.8) */}
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

      {/* File Upload Section (Req 13.3, 13.9) */}
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
 * Individual bank detail row component.
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
 * Shows current payment state: pending, paid, rejected, cancelled.
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
    fallido: {
      icon: '❌',
      title: 'Pago fallido',
      desc: 'No pudimos procesar tu pago. Intenta de nuevo.',
      color: 'bg-fire-50 border-fire-200 text-fire-800',
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
 * Shows payment options (MercadoPago and Bank Transfer) within 3 seconds (Req 13.1).
 * MercadoPago: redirects to checkout, handles failure with 3 retries (Req 13.2, 13.6).
 * Bank Transfer: shows bank details, validates and uploads proof file (Req 13.3, 13.9).
 * Shows 24h cancellation notice for transfers (Req 13.8).
 * Responsive design with 44px touch targets and warm color palette (Req 18.2).
 */
export default function PagoPage() {
  const pedidoId = usePedidoId();
  const [metodo, setMetodo] = useState<MetodoPago>(null);
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('seleccion');

  // Check URL for MercadoPago return status (success/failure/pending)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') || params.get('collection_status');

    if (status === 'approved') {
      setEstadoPago('exito');
    } else if (status === 'rejected' || status === 'failure') {
      setEstadoPago('fallido');
      setMetodo('mercadopago');
    } else if (status === 'pending' || status === 'in_process') {
      setEstadoPago('pendiente');
    }
  }, []);

  // If no pedidoId found, show error
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
            href="/menu"
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
  if (estadoPago !== 'seleccion' && estadoPago !== 'fallido') {
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

      {/* Failed status notice from MercadoPago return */}
      {estadoPago === 'fallido' && metodo === 'mercadopago' && (
        <div className="mb-6">
          <EstadoPagoDisplay estado="fallido" />
        </div>
      )}

      {/* Payment Method Selection or Flow */}
      {!metodo && (
        <MetodoSelector onSelect={setMetodo} />
      )}

      {metodo === 'mercadopago' && (
        <MercadoPagoFlow
          pedidoId={pedidoId}
          onBack={() => {
            setMetodo(null);
            setEstadoPago('seleccion');
          }}
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
