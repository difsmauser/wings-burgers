import { Producto } from '@/domain/entities';
import { Precio, Categoria } from '@/domain/value-objects';
import type { IProductoRepository } from '@/domain/ports/repositories';
import type { IStorageService } from '@/domain/ports/services';
import type { Producto as ProductoData } from '@/shared/domain-types';
import { ValidacionError } from '@/shared/errors';
import { validarImagenEstricto } from '@/shared/validators';
import type { CrearProductoDTO } from '@/application/dtos/ProductoDTO';

/**
 * Caso de uso: Crear un nuevo producto en el catálogo.
 * Valida campos obligatorios, sube imagen si se provee, crea la entidad y la persiste.
 */
export class CrearProducto {
  constructor(
    private readonly productoRepo: IProductoRepository,
    private readonly storageService: IStorageService
  ) {}

  async ejecutar(input: CrearProductoDTO): Promise<Producto> {
    // 1. Validar campos obligatorios
    const errores: string[] = [];

    if (!input.nombre || input.nombre.trim().length === 0) {
      errores.push('nombre');
    } else if (input.nombre.trim().length > 100) {
      errores.push('nombre');
    }

    if (input.descripcion && input.descripcion.length > 500) {
      errores.push('descripcion');
    }

    if (!input.categoria || !Object.values(Categoria).includes(input.categoria)) {
      errores.push('categoria');
    }

    if (input.precio === undefined || input.precio === null) {
      errores.push('precio');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Datos inválidos para crear producto: ${errores.join(', ')}`,
        errores
      );
    }

    // 2. Validar y crear value object Precio (puede lanzar PrecioFueraDeRangoError o PrecioDecimalesInvalidosError)
    const precio = Precio.crear(input.precio);

    // 3. Validar y subir imagen si se provee
    let imagenUrl: string | null = null;
    if (input.imagen) {
      validarImagenEstricto({
        nombre: input.imagen.nombre,
        tipo: input.imagen.tipo,
        tamano: input.imagen.tamano,
      });

      const ruta = `productos/${Date.now()}-${input.imagen.nombre}`;
      imagenUrl = await this.storageService.subirImagen(input.imagen.archivo, ruta);
    }

    // 4. Crear entidad Producto (validación de dominio)
    const producto = Producto.crear({
      id: crypto.randomUUID(),
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim(),
      categoria: input.categoria,
      precio,
      imagenUrl,
      activo: true,
      opcionesPersonalizacion: input.opcionesPersonalizacion ?? [],
    });

    // 5. Mapear a formato de persistencia y guardar
    const productoData: ProductoData = {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoria: producto.categoria.toLowerCase() as ProductoData['categoria'],
      precio: producto.precio.valor,
      imagen: producto.imagenUrl ?? undefined,
      disponible: true,
      activo: producto.activo,
      creadoEn: producto.creadoEn,
      actualizadoEn: producto.actualizadoEn,
    };

    await this.productoRepo.crear(productoData);

    return producto;
  }
}
