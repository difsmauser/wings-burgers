import { ArchivoInvalidoError } from '@/shared/errors';

/**
 * Representa un archivo para validación.
 */
export interface ArchivoInfo {
  nombre: string;
  tipo: string;
  tamano: number;
}

/**
 * Resultado de la validación de un archivo.
 */
export interface ResultadoValidacionArchivo {
  valido: boolean;
  error?: string;
}

/** Formatos válidos para imágenes de productos */
export const FORMATOS_IMAGEN_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Formatos válidos para comprobantes de pago */
export const FORMATOS_COMPROBANTE_VALIDOS = ['image/jpeg', 'image/png', 'application/pdf'] as const;

/** Tamaño máximo de archivo: 5MB */
export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

/**
 * Valida un archivo de imagen de producto.
 * Acepta JPG, PNG, WebP con tamaño máximo de 5MB.
 */
export function validarImagen(archivo: ArchivoInfo): ResultadoValidacionArchivo {
  if (archivo.tamano > TAMANO_MAXIMO_BYTES) {
    return {
      valido: false,
      error: `El archivo excede el tamaño máximo de 5MB (tamaño: ${(archivo.tamano / (1024 * 1024)).toFixed(2)}MB)`,
    };
  }

  if (!FORMATOS_IMAGEN_VALIDOS.includes(archivo.tipo as typeof FORMATOS_IMAGEN_VALIDOS[number])) {
    return {
      valido: false,
      error: `Formato no válido: ${archivo.tipo}. Formatos aceptados: JPG, PNG, WebP`,
    };
  }

  return { valido: true };
}

/**
 * Valida un archivo de comprobante de pago.
 * Acepta JPG, PNG, PDF con tamaño máximo de 5MB.
 */
export function validarComprobante(archivo: ArchivoInfo): ResultadoValidacionArchivo {
  if (archivo.tamano > TAMANO_MAXIMO_BYTES) {
    return {
      valido: false,
      error: `El archivo excede el tamaño máximo de 5MB (tamaño: ${(archivo.tamano / (1024 * 1024)).toFixed(2)}MB)`,
    };
  }

  if (!FORMATOS_COMPROBANTE_VALIDOS.includes(archivo.tipo as typeof FORMATOS_COMPROBANTE_VALIDOS[number])) {
    return {
      valido: false,
      error: `Formato no válido: ${archivo.tipo}. Formatos aceptados: JPG, PNG, PDF`,
    };
  }

  return { valido: true };
}

/**
 * Valida un archivo de imagen y lanza ArchivoInvalidoError si no es válido.
 */
export function validarImagenEstricto(archivo: ArchivoInfo): void {
  const resultado = validarImagen(archivo);
  if (!resultado.valido) {
    throw new ArchivoInvalidoError(resultado.error!);
  }
}

/**
 * Valida un archivo de comprobante y lanza ArchivoInvalidoError si no es válido.
 */
export function validarComprobanteEstricto(archivo: ArchivoInfo): void {
  const resultado = validarComprobante(archivo);
  if (!resultado.valido) {
    throw new ArchivoInvalidoError(resultado.error!);
  }
}
