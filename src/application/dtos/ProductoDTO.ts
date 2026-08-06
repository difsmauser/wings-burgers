import type { ArchivoInfo } from '@/shared/validators';
import type { Categoria } from '@/domain/value-objects';
import type { OpcionPersonalizacion } from '@/domain/entities';

/**
 * DTO para la creación de un nuevo producto.
 */
export interface CrearProductoDTO {
  nombre: string;
  descripcion?: string;
  categoria: Categoria;
  precio: number;
  imagen?: ArchivoInfo & { archivo: File };
  opcionesPersonalizacion?: OpcionPersonalizacion[];
}

/**
 * DTO para la edición de un producto existente.
 */
export interface EditarProductoDTO {
  nombre?: string;
  descripcion?: string;
  categoria?: Categoria;
  precio?: number;
  imagen?: ArchivoInfo & { archivo: File };
  eliminarImagen?: boolean;
  opcionesPersonalizacion?: OpcionPersonalizacion[];
}
