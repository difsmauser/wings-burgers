import { SupabaseClient } from '@supabase/supabase-js';
import { IStorageService } from '@/domain/ports/services/IStorageService';
import { ArchivoInvalidoError } from '@/shared/errors';
import { ServicioExternoError } from '@/shared/errors';

/** Formatos permitidos para imágenes de productos */
const FORMATOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];

/** Formatos permitidos para comprobantes de pago */
const FORMATOS_COMPROBANTE = ['image/jpeg', 'image/png', 'application/pdf'];

/** Tamaño máximo de archivo: 5MB */
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

/** Bucket para imágenes de productos */
const BUCKET_PRODUCTOS = 'productos';

/** Bucket para comprobantes de transferencia */
const BUCKET_COMPROBANTES = 'comprobantes';

/**
 * Adaptador de almacenamiento usando Supabase Storage.
 * Implementa IStorageService para subir, eliminar y obtener URLs de archivos.
 */
export class SupabaseStorageAdapter implements IStorageService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Sube una imagen al storage de Supabase.
   * Valida formato y tamaño antes de subir.
   * @param archivo - Archivo a subir
   * @param ruta - Ruta de destino (ej: "productos/imagen-123.jpg" o "comprobantes/comp-456.pdf")
   * @returns URL pública del archivo subido
   */
  async subirImagen(archivo: File, ruta: string): Promise<string> {
    this.validarArchivo(archivo, ruta);

    const bucket = this.determinarBucket(ruta);

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(ruta, archivo, {
        cacheControl: '3600',
        upsert: true,
        contentType: archivo.type,
      });

    if (error) {
      throw new ServicioExternoError('Supabase Storage', error.message);
    }

    return this.obtenerUrlPublica(ruta);
  }

  /**
   * Elimina una imagen del storage de Supabase.
   * @param ruta - Ruta del archivo a eliminar
   */
  async eliminarImagen(ruta: string): Promise<void> {
    const bucket = this.determinarBucket(ruta);

    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([ruta]);

    if (error) {
      throw new ServicioExternoError('Supabase Storage', error.message);
    }
  }

  /**
   * Obtiene la URL pública (CDN) de un archivo almacenado.
   * @param ruta - Ruta del archivo en el storage
   * @returns URL pública accesible
   */
  obtenerUrlPublica(ruta: string): string {
    const bucket = this.determinarBucket(ruta);

    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(ruta);

    return data.publicUrl;
  }

  /**
   * Valida el archivo según formato y tamaño.
   * Para imágenes de productos acepta: JPG, PNG, WebP.
   * Para comprobantes acepta: JPG, PNG, PDF.
   * Tamaño máximo: 5MB.
   */
  private validarArchivo(archivo: File, ruta: string): void {
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      throw new ArchivoInvalidoError(
        `El archivo excede el tamaño máximo de 5MB (tamaño: ${(archivo.size / (1024 * 1024)).toFixed(2)}MB)`
      );
    }

    const formatosPermitidos = this.esComprobante(ruta)
      ? FORMATOS_COMPROBANTE
      : FORMATOS_IMAGEN;

    if (!formatosPermitidos.includes(archivo.type)) {
      const extensiones = this.esComprobante(ruta)
        ? 'JPG, PNG o PDF'
        : 'JPG, PNG o WebP';
      throw new ArchivoInvalidoError(
        `Formato no válido "${archivo.type}". Formatos aceptados: ${extensiones}`
      );
    }
  }

  /**
   * Determina el bucket basándose en la ruta del archivo.
   */
  private determinarBucket(ruta: string): string {
    return this.esComprobante(ruta) ? BUCKET_COMPROBANTES : BUCKET_PRODUCTOS;
  }

  /**
   * Verifica si la ruta corresponde a un comprobante de pago.
   */
  private esComprobante(ruta: string): boolean {
    return ruta.startsWith('comprobantes');
  }
}
