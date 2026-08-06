import { SupabaseClient } from '@supabase/supabase-js';
import { IGastoRepository } from '@/domain/ports/repositories';
import { Gasto } from '@/shared/domain-types';
import { FiltroGasto, ResumenGastoCategoria } from '@/shared/types';
import { ServicioExternoError } from '@/shared/errors';

/**
 * Registro de gasto tal como se almacena en la tabla `gasto` de Supabase.
 */
interface GastoRecord {
  id: string;
  monto: number;
  concepto: string;
  categoria: string;
  fecha: string;
  admin_id: string | null;
  creado_en: string;
}

/**
 * Implementación del repositorio de Gasto usando Supabase.
 * Adaptador driven que implementa el puerto IGastoRepository.
 */
export class SupabaseGastoRepo implements IGastoRepository {
  constructor(private readonly client: SupabaseClient) {}

  async registrar(gasto: Gasto): Promise<Gasto> {
    const record = this.toDb(gasto);
    const { data, error } = await this.client
      .from('gasto')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return this.toDomain(data);
  }

  async consultar(filtros: FiltroGasto): Promise<Gasto[]> {
    let query = this.client.from('gasto').select();

    if (filtros.categoria) {
      query = query.eq('categoria', filtros.categoria);
    }
    if (filtros.fechaInicio) {
      query = query.gte('fecha', filtros.fechaInicio.toISOString().split('T')[0]);
    }
    if (filtros.fechaFin) {
      query = query.lte('fecha', filtros.fechaFin.toISOString().split('T')[0]);
    }
    if (filtros.montoMin !== undefined) {
      query = query.gte('monto', filtros.montoMin);
    }
    if (filtros.montoMax !== undefined) {
      query = query.lte('monto', filtros.montoMax);
    }

    query = query.order('fecha', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    return (data ?? []).map((record: GastoRecord) => this.toDomain(record));
  }

  async sumarPorCategoria(inicio: Date, fin: Date): Promise<ResumenGastoCategoria[]> {
    const fechaInicio = inicio.toISOString().split('T')[0];
    const fechaFin = fin.toISOString().split('T')[0];

    // Obtener todos los gastos del período y agrupar client-side
    // (Supabase REST API no soporta GROUP BY nativamente)
    const { data, error } = await this.client
      .from('gasto')
      .select('categoria, monto')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    const agrupado = new Map<string, { total: number; cantidad: number }>();

    for (const row of data ?? []) {
      const existing = agrupado.get(row.categoria);
      if (existing) {
        existing.total += row.monto;
        existing.cantidad += 1;
      } else {
        agrupado.set(row.categoria, { total: row.monto, cantidad: 1 });
      }
    }

    const resultado: ResumenGastoCategoria[] = [];
    for (const [categoria, { total, cantidad }] of agrupado) {
      resultado.push({
        categoria,
        total: Math.round(total * 100) / 100,
        cantidad,
      });
    }

    return resultado;
  }

  async totalPorPeriodo(inicio: Date, fin: Date): Promise<number> {
    const fechaInicio = inicio.toISOString().split('T')[0];
    const fechaFin = fin.toISOString().split('T')[0];

    const { data, error } = await this.client
      .from('gasto')
      .select('monto')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (error) {
      throw new ServicioExternoError('Supabase', error.message);
    }

    const total = (data ?? []).reduce(
      (sum: number, row: { monto: number }) => sum + row.monto,
      0
    );

    return Math.round(total * 100) / 100;
  }

  private toDomain(record: GastoRecord): Gasto {
    return {
      id: record.id,
      monto: record.monto,
      concepto: record.concepto,
      categoria: record.categoria,
      fecha: new Date(record.fecha),
      creadoEn: new Date(record.creado_en),
    };
  }

  private toDb(gasto: Gasto): Omit<GastoRecord, 'creado_en'> {
    return {
      id: gasto.id,
      monto: gasto.monto,
      concepto: gasto.concepto,
      categoria: gasto.categoria,
      fecha: gasto.fecha.toISOString().split('T')[0],
      admin_id: null,
    };
  }
}
