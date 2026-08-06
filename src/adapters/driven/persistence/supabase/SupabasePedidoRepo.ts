import { SupabaseClient } from '@supabase/supabase-js';
import { IPedidoRepository } from '@/domain/ports/repositories';
import { Pedido, EstadoPedido } from '@/shared/domain-types';
import { Paginacion, PedidoPaginado } from '@/shared/types';
import { ServicioExternoError } from '@/shared/errors';
import { PedidoMapper } from '../mappers/PedidoMapper';

/**
 * Implementación del repositorio de Pedido usando Supabase.
 * Adaptador driven que implementa el puerto IPedidoRepository.
 */
export class SupabasePedidoRepo implements IPedidoRepository {
  constructor(private readonly client: SupabaseClient) {}

  async crear(pedido: Pedido): Promise<Pedido> {
    const pedidoRecord = PedidoMapper.toDb(pedido);

    // Insertar el pedido principal
    const { data: pedidoData, error: pedidoError } = await this.client
      .from('pedido')
      .insert(pedidoRecord)
      .select()
      .single();

    if (pedidoError) {
      throw new ServicioExternoError('Supabase', pedidoError.message);
    }

    // Insertar los detalles del pedido
    if (pedido.items.length > 0) {
      const detalles = PedidoMapper.itemsToDb(pedido.id, pedido.items);
      const { error: detalleError } = await this.client
        .from('pedido_detalle')
        .insert(detalles);

      if (detalleError) {
        throw new ServicioExternoError('Supabase', detalleError.message);
      }
    }

    // Recuperar el pedido con sus detalles
    return this.obtenerPorIdOrThrow(pedidoData.id);
  }

  async actualizar(id: string, datos: Partial<Pedido>): Promise<Pedido> {
    const partialRecord = PedidoMapper.toPartialDb(datos);

    const { error } = await this.client
      .from('pedido')
      .update(partialRecord)
      .eq('id', id);

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    // Si hay items actualizados, reemplazar los detalles
    if (datos.items) {
      // Eliminar detalles existentes
      const { error: deleteError } = await this.client
        .from('pedido_detalle')
        .delete()
        .eq('pedido_id', id);

      if (deleteError) {
        throw new ServicioExternoError('Supabase', deleteError.message);
      }

      // Insertar nuevos detalles
      if (datos.items.length > 0) {
        const detalles = PedidoMapper.itemsToDb(id, datos.items);
        const { error: insertError } = await this.client
          .from('pedido_detalle')
          .insert(detalles);

        if (insertError) {
          throw new ServicioExternoError('Supabase', insertError.message);
        }
      }
    }

    return this.obtenerPorIdOrThrow(id);
  }

  async obtenerPorId(id: string): Promise<Pedido | null> {
    const { data, error } = await this.client
      .from('pedido')
      .select('*, pedido_detalle(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ServicioExternoError('Supabase', error.message);
    }

    return PedidoMapper.toDomain(data);
  }

  async obtenerPorNumero(numero: string): Promise<Pedido | null> {
    const { data, error } = await this.client
      .from('pedido')
      .select('*, pedido_detalle(*)')
      .eq('numero', numero)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ServicioExternoError('Supabase', error.message);
    }

    return PedidoMapper.toDomain(data);
  }

  async listarPorEstado(estado: EstadoPedido): Promise<Pedido[]> {
    const { data, error } = await this.client
      .from('pedido')
      .select('*, pedido_detalle(*)')
      .eq('estado', estado)
      .order('creado_en', { ascending: false });

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return (data ?? []).map(PedidoMapper.toDomain);
  }

  async listarPorCliente(clienteId: string, paginacion: Paginacion): Promise<PedidoPaginado> {
    const from = (paginacion.pagina - 1) * paginacion.porPagina;
    const to = from + paginacion.porPagina - 1;

    const { data, error, count } = await this.client
      .from('pedido')
      .select('*, pedido_detalle(*)', { count: 'exact' })
      .eq('cliente_id', clienteId)
      .order('creado_en', { ascending: false })
      .range(from, to);

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    const total = count ?? 0;
    return {
      datos: (data ?? []).map(PedidoMapper.toDomain),
      total,
      pagina: paginacion.pagina,
      porPagina: paginacion.porPagina,
      totalPaginas: Math.ceil(total / paginacion.porPagina),
    };
  }

  async listarPorPeriodo(inicio: Date, fin: Date): Promise<Pedido[]> {
    const { data, error } = await this.client
      .from('pedido')
      .select('*, pedido_detalle(*)')
      .gte('creado_en', inicio.toISOString())
      .lte('creado_en', fin.toISOString())
      .order('creado_en', { ascending: false });

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return (data ?? []).map(PedidoMapper.toDomain);
  }

  async contarPorPeriodo(inicio: Date, fin: Date): Promise<number> {
    const { count, error } = await this.client
      .from('pedido')
      .select('*', { count: 'exact', head: true })
      .gte('creado_en', inicio.toISOString())
      .lte('creado_en', fin.toISOString());

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return count ?? 0;
  }

  /**
   * Obtiene un pedido por ID o lanza error si no existe.
   * Uso interno para retornar el pedido después de crear/actualizar.
   */
  private async obtenerPorIdOrThrow(id: string): Promise<Pedido> {
    const pedido = await this.obtenerPorId(id);
    if (!pedido) {
      throw new ServicioExternoError('Supabase', `Pedido con id ${id} no encontrado después de operación`);
    }
    return pedido;
  }
}
