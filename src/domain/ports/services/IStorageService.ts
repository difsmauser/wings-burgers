/**
 * Puerto de servicio para almacenamiento de archivos (imágenes).
 * Define las operaciones disponibles para gestionar archivos en el storage.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IStorageService {
  /**
   * Sube una imagen al almacenamiento.
   * Valida formato (JPG, PNG, WebP) y tamaño (máximo 5MB).
   * @param archivo - Archivo a subir
   * @param ruta - Ruta de destino en el storage
   * @returns URL pública de la imagen subida
   */
  subirImagen(archivo: File, ruta: string): Promise<string>;

  /**
   * Elimina una imagen del almacenamiento.
   * @param ruta - Ruta de la imagen a eliminar
   */
  eliminarImagen(ruta: string): Promise<void>;

  /**
   * Obtiene la URL pública de acceso a una imagen almacenada.
   * @param ruta - Ruta de la imagen en el storage
   * @returns URL pública de la imagen
   */
  obtenerUrlPublica(ruta: string): string;
}
