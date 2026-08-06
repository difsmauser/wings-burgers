import { SupabaseClient } from '@supabase/supabase-js';
import { IInventarioRepository } from '@/domain/ports/repositories';
import { ArticuloInventario } from '@/shared/domain-types';
import { TipoMovimiento, MovimientoInventario } from '@/shared/types';
import { ServicioExternoError } from '@/shared/errors';

/**
 * Registro de artículo de inventario tal como se almacena en la tabla `articulo_inventario`.
 */
interface ArticuloInventarioRecord {
  id: string;
  nombre: string;
  cantidad: number;
  unidad_medida: string;
  nivel_minimo: number;
  actualizado_en: string;
}

/**
 * Registro de movimiento de inventario tal como se almacena en la tabla `movimiento_inventario`.
 */
interface MovimientoInventarioRecord {
  id?: string;
  articulo_id: string;
  tipo_movimiento: string;
  cantidad_anterior: number;
  cantidad_nueva: number;
  admin_id: string | null;
  fecha?: string;
}

/**
 * Implementación del repositorio de Inventario usando Supabase.
 * Adaptador driven que implementa el puerto IInventarioRepository.
 */
export class SupabaseInventarioRepo implements IInventarioRepository {
  constructor(private readonly client: SupabaseClient) {}

  async registrar(articulo: ArticuloInventario): Promise<ArticuloInventario> {
    const record = this.toDb(articulo);
    const { data, error } = await this.client
      .from('articulo_inventario')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return this.toDomain(data);
  }

  async actualizar(
    id: string,
    cantidad: number,
    tipoMovimiento: TipoMovimiento,
    adminId: string
  ): Promise<ArticuloInventario> {
    // Obtener artículo actual para registrar la cantidad anterior
    const articuloActual = await this.obtenerPorId(id);
    if (!articuloActual) {
      throw new ServicioExternoError('Supabase', `Artículo de inventario con id ${id} no encontrado`);
    }

    // Actualizar la cantidad
    const { data, error } = await this.client
      .from('articulo_inventario')
      .update({ cantidad })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    // Registrar el movimiento
    await this.registrarMovimiento({
      articuloId: id,
      cantidadAnterior: articuloActual.cantidad,
      cantidadNueva: cantidad,
      tipoMovimiento,
      adminId,
      fecha: new Date(),
    });

    return this.toDomain(data);
  }

  async obtenerPorId(id: string): Promise<ArticuloInventario | null> {
    const { data, error } = await this.client
      .from('articulo_inventario')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ServicioExternoError('Supabase', error.message);
    }

    return this.toDomain(data);
  }

  async listarBajoMinimo(): Promise<ArticuloInventario[]> {
    // Supabase no soporta filtros de columna-a-columna directamente en la API,
    // usamos un enfoque con RPC o filtramos client-side para simplicidad.
    const { data, error } = await this.client
      .from('articulo_inventario')
      .select();

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return (data ?? [])
      .filter((record: ArticuloInventarioRecord) => record.cantidad <= record.nivel_minimo)
      .map((record: ArticuloInventarioRecord) => this.toDomain(record));
  }

  async obtenerArticulosPorProducto(productoId: string): Promise<ArticuloInventario[]> {
    // Join a través de la tabla producto_inventario
    const { data, error } = await this.client
      .from('producto_inventario')
      .select('articulo_id, articulo_inventario(*)')
      .eq('producto_id', productoId);

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    const rows = data ?? [];
    const articulos: ArticuloInventario[] = [];

    for (const row of rows) {
      const record = (row as Record<string, unknown>).articulo_inventario as ArticuloInventarioRecord | null;
      if (record) {
        articulos.push(this.toDomain(record));
      }
    }

    return articulos;
  }

  async registrarMovimiento(movimiento: MovimientoInventario): Promise<void> {
    const record: MovimientoInventarioRecord = {
      articulo_id: movimiento.articuloId,
      tipo_movimiento: movimiento.tipoMovimiento,
      cantidad_anterior: movimiento.cantidadAnterior,
      cantidad_nueva: movimiento.cantidadNueva,
      admin_id: movimiento.adminId || null,
    };

    const { error } = await this.client
      .from('movimiento_inventario')
      .insert(record);

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }
  }

  private toDomain(record: ArticuloInventarioRecord): ArticuloInventario {
    return {
      id: record.id,
      nombre: record.nombre,
      cantidad: record.cantidad,
      unidad: record.unidad_medida,
      nivelMinimo: record.nivel_minimo,
      productoIds: [], // Se resuelve en la capa de aplicación si es necesario
      creadoEn: new Date(record.actualizado_en), // No hay creado_en en la tabla
      actualizadoEn: new Date(record.actualizado_en),
    };
  }

  private toDb(articulo: ArticuloInventario): Omit<ArticuloInventarioRecord, 'actualizado_en'> {
    return {
      id: articulo.id,
      nombre: articulo.nombre,
      cantidad: articulo.cantidad,
      unidad_medida: articulo.unidad,
      nivel_minimo: articulo.nivelMinimo,
    };
  }
}
