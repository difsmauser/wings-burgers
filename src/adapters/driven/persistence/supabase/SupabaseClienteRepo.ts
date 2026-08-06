import { SupabaseClient } from '@supabase/supabase-js';
import { IClienteRepository } from '@/domain/ports/repositories';
import { Cliente } from '@/shared/domain-types';
import { FiltroCliente } from '@/shared/types';
import { ServicioExternoError } from '@/shared/errors';

/**
 * Registro de cliente tal como se almacena en la tabla `cliente` de Supabase.
 */
interface ClienteRecord {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  creado_en: string;
}

/**
 * Implementación del repositorio de Cliente usando Supabase.
 * Adaptador driven que implementa el puerto IClienteRepository.
 */
export class SupabaseClienteRepo implements IClienteRepository {
  constructor(private readonly client: SupabaseClient) {}

  async crear(cliente: Cliente): Promise<Cliente> {
    const record = this.toDb(cliente);
    const { data, error } = await this.client
      .from('cliente')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return this.toDomain(data);
  }

  async obtenerPorTelefono(telefono: string): Promise<Cliente | null> {
    const { data, error } = await this.client
      .from('cliente')
      .select()
      .eq('telefono', telefono)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ServicioExternoError('Supabase', error.message);
    }

    return this.toDomain(data);
  }

  async obtenerPorId(id: string): Promise<Cliente | null> {
    const { data, error } = await this.client
      .from('cliente')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new ServicioExternoError('Supabase', error.message);
    }

    return this.toDomain(data);
  }

  async listar(filtros: FiltroCliente): Promise<Cliente[]> {
    let query = this.client.from('cliente').select();

    if (filtros.nombre) {
      query = query.ilike('nombre', `%${filtros.nombre}%`);
    }

    query = query.order('creado_en', { ascending: false });

    // Aplicar paginación si se provee
    if (filtros.paginacion) {
      const from = (filtros.paginacion.pagina - 1) * filtros.paginacion.porPagina;
      const to = from + filtros.paginacion.porPagina - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return (data ?? []).map((record: ClienteRecord) => this.toDomain(record));
  }

  private toDomain(record: ClienteRecord): Cliente {
    return {
      id: record.id,
      nombre: record.nombre,
      telefono: record.telefono,
      direccion: record.direccion ?? undefined,
      correo: record.email ?? undefined,
      creadoEn: new Date(record.creado_en),
      actualizadoEn: new Date(record.creado_en), // cliente no tiene actualizado_en en DB
    };
  }

  private toDb(cliente: Cliente): Omit<ClienteRecord, 'creado_en'> {
    return {
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.correo ?? null,
      direccion: cliente.direccion ?? null,
    };
  }
}
