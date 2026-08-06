import { SupabaseClient } from '@supabase/supabase-js';
import { IProductoRepository } from '@/domain/ports/repositories';
import { Producto, Categoria } from '@/shared/domain-types';
import { FiltroProducto } from '@/shared/types';
import { ServicioExternoError } from '@/shared/errors';
import { ProductoMapper } from '../mappers/ProductoMapper';

/**
 * Implementación del repositorio de Producto usando Supabase.
 * Adaptador driven que implementa el puerto IProductoRepository.
 */
export class SupabaseProductoRepo implements IProductoRepository {
  constructor(private readonly client: SupabaseClient) {}

  async crear(producto: Producto): Promise<Producto> {
    const record = ProductoMapper.toDb(producto);
    const { data, error } = await this.client
      .from('producto')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return ProductoMapper.toDomain(data);
  }

  async actualizar(id: string, datos: Partial<Producto>): Promise<Producto> {
    const partialRecord = ProductoMapper.toPartialDb(datos);
    const { data, error } = await this.client
      .from('producto')
      .update(partialRecord)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return ProductoMapper.toDomain(data);
  }

  async desactivar(id: string): Promise<void> {
    const { error } = await this.client
      .from('producto')
      .update({ activo: false })
      .eq('id', id);

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }
  }

  async obtenerPorId(id: string): Promise<Producto | null> {
    const { data, error } = await this.client
      .from('producto')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw new ServicioExternoError('Supabase', error.message);
    }

    return ProductoMapper.toDomain(data);
  }

  async listarActivos(filtros?: FiltroProducto): Promise<Producto[]> {
    let query = this.client
      .from('producto')
      .select()
      .eq('activo', true);

    if (filtros?.nombre) {
      query = query.ilike('nombre', `%${filtros.nombre}%`);
    }
    if (filtros?.categoria) {
      query = query.eq('categoria', filtros.categoria);
    }
    if (filtros?.precioMin !== undefined) {
      query = query.gte('precio', filtros.precioMin);
    }
    if (filtros?.precioMax !== undefined) {
      query = query.lte('precio', filtros.precioMax);
    }

    query = query.order('nombre', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return (data ?? []).map(ProductoMapper.toDomain);
  }

  async listarPorCategoria(categoria: Categoria): Promise<Producto[]> {
    const { data, error } = await this.client
      .from('producto')
      .select()
      .eq('categoria', categoria)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return (data ?? []).map(ProductoMapper.toDomain);
  }
}
