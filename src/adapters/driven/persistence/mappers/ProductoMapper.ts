import { Producto, Categoria } from '@/shared/domain-types';

/**
 * Registro de producto tal como se almacena en la tabla `producto` de Supabase.
 */
export interface ProductoRecord {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  precio: number;
  imagen_url: string | null;
  activo: boolean;
  opciones_personalizacion: unknown;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Mapper para transformar entre la entidad de dominio Producto
 * y el registro de la tabla `producto` en la base de datos.
 */
export class ProductoMapper {
  /**
   * Transforma un registro de DB a una entidad de dominio Producto.
   */
  static toDomain(record: ProductoRecord): Producto {
    return {
      id: record.id,
      nombre: record.nombre,
      descripcion: record.descripcion ?? '',
      categoria: record.categoria as Categoria,
      precio: record.precio,
      imagen: record.imagen_url ?? undefined,
      disponible: record.activo,
      activo: record.activo,
      creadoEn: new Date(record.creado_en),
      actualizadoEn: new Date(record.actualizado_en),
    };
  }

  /**
   * Transforma una entidad de dominio Producto a un registro de DB
   * para inserciones.
   */
  static toDb(producto: Producto): Omit<ProductoRecord, 'creado_en' | 'actualizado_en'> {
    return {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion || null,
      categoria: producto.categoria,
      precio: producto.precio,
      imagen_url: producto.imagen ?? null,
      activo: producto.activo,
      opciones_personalizacion: [],
    };
  }

  /**
   * Transforma campos parciales de Producto a campos parciales del registro DB.
   */
  static toPartialDb(datos: Partial<Producto>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (datos.nombre !== undefined) result.nombre = datos.nombre;
    if (datos.descripcion !== undefined) result.descripcion = datos.descripcion || null;
    if (datos.categoria !== undefined) result.categoria = datos.categoria;
    if (datos.precio !== undefined) result.precio = datos.precio;
    if (datos.imagen !== undefined) result.imagen_url = datos.imagen ?? null;
    if (datos.activo !== undefined) result.activo = datos.activo;
    if (datos.disponible !== undefined) result.activo = datos.disponible;

    return result;
  }
}
