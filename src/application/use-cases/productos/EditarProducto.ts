import { Producto } from '@/domain/entities';
import { Precio, Categoria } from '@/domain/value-objects';
import type { IProductoRepository } from '@/domain/ports/repositories';
import type { IStorageService } from '@/domain/ports/services';
import type { Producto as ProductoData } from '@/shared/domain-types';
import { ValidacionError, RecursoNoEncontradoError } from '@/shared/errors';
import { validarImagenEstricto } from '@/shared/validators';
import type { EditarProductoDTO } from '@/application/dtos/ProductoDTO';

/**
 * Caso de uso: Editar un producto existente.
 * Actualiza campos proporcionados, maneja cambio/eliminación de imagen y persiste cambios.
 */
export class EditarProducto {
  constructor(
    private readonly productoRepo: IProductoRepository,
    private readonly storageService: IStorageService
  ) {}

  async ejecutar(id: string, input: EditarProductoDTO): Promise<Producto> {
    // 1. Obtener producto existente
    const productoExistente = await this.productoRepo.obtenerPorId(id);
    if (!productoExistente) {
      throw new RecursoNoEncontradoError('Producto', id);
    }

    // 2. Validar campos si se proporcionan
    const errores: string[] = [];

    if (input.nombre !== undefined) {
      if (!input.nombre || input.nombre.trim().length === 0) {
        errores.push('nombre');
      } else if (input.nombre.trim().length > 100) {
        errores.push('nombre');
      }
    }

    if (input.descripcion !== undefined && input.descripcion.length > 500) {
      errores.push('descripcion');
    }

    if (input.categoria !== undefined && !Object.values(Categoria).includes(input.categoria)) {
      errores.push('categoria');
    }

    if (errores.length > 0) {
      throw new ValidacionError(
        `Datos inválidos para editar producto: ${errores.join(', ')}`,
        errores
      );
    }

    // 3. Manejar cambio de imagen
    let imagenUrl: string | undefined = undefined;

    if (input.eliminarImagen && productoExistente.imagen) {
      await this.storageService.eliminarImagen(productoExistente.imagen);
      imagenUrl = undefined;
    } else if (input.imagen) {
      validarImagenEstricto({
        nombre: input.imagen.nombre,
        tipo: input.imagen.tipo,
        tamano: input.imagen.tamano,
      });

      // Eliminar imagen anterior si existe
      if (productoExistente.imagen) {
        await this.storageService.eliminarImagen(productoExistente.imagen);
      }

      const ruta = `productos/${Date.now()}-${input.imagen.nombre}`;
      imagenUrl = await this.storageService.subirImagen(input.imagen.archivo, ruta);
    }

    // 4. Construir datos de actualización para persistencia
    const datosActualizacion: Partial<ProductoData> = {};

    if (input.nombre !== undefined) {
      datosActualizacion.nombre = input.nombre.trim();
    }

    if (input.descripcion !== undefined) {
      datosActualizacion.descripcion = input.descripcion.trim();
    }

    if (input.categoria !== undefined) {
      datosActualizacion.categoria = input.categoria.toLowerCase() as ProductoData['categoria'];
    }

    if (input.precio !== undefined) {
      Precio.crear(input.precio); // Validar que el precio es válido
      datosActualizacion.precio = input.precio;
    }

    if (imagenUrl !== undefined) {
      datosActualizacion.imagen = imagenUrl;
    } else if (input.eliminarImagen) {
      datosActualizacion.imagen = undefined;
    }

    datosActualizacion.actualizadoEn = new Date();

    // 5. Persistir cambios
    const productoActualizado = await this.productoRepo.actualizar(id, datosActualizacion);

    // 6. Reconstruir entidad de dominio desde datos persistidos
    const entidad = Producto.crear({
      id: productoActualizado.id,
      nombre: productoActualizado.nombre,
      descripcion: productoActualizado.descripcion,
      categoria: productoActualizado.categoria.toUpperCase() as Categoria,
      precio: Precio.crear(productoActualizado.precio),
      imagenUrl: productoActualizado.imagen ?? null,
      activo: productoActualizado.activo,
      opcionesPersonalizacion: [],
      creadoEn: productoActualizado.creadoEn,
      actualizadoEn: productoActualizado.actualizadoEn,
    });

    return entidad;
  }
}
