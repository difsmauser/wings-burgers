/**
 * Contenedor de Inyección de Dependencias (DI Container).
 *
 * Factory/service-locator simple que instancia todos los adaptadores
 * y los inyecta en los casos de uso correspondientes.
 *
 * Solo este módulo conoce las implementaciones concretas de los adaptadores.
 * Las capas de dominio y aplicación solo dependen de interfaces (puertos).
 *
 * Requirements: 16.1, 16.2, 16.3, 16.6
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Adaptadores de persistencia
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';
import { SupabaseProductoRepo } from '@/adapters/driven/persistence/supabase/SupabaseProductoRepo';
import { SupabasePedidoRepo } from '@/adapters/driven/persistence/supabase/SupabasePedidoRepo';
import { SupabaseClienteRepo } from '@/adapters/driven/persistence/supabase/SupabaseClienteRepo';
import { SupabaseInventarioRepo } from '@/adapters/driven/persistence/supabase/SupabaseInventarioRepo';
import { SupabaseGastoRepo } from '@/adapters/driven/persistence/supabase/SupabaseGastoRepo';

// Adaptadores de servicios externos
import { MercadoPagoAdapter } from '@/adapters/driven/payment/MercadoPagoAdapter';
import { WhatsAppAdapter } from '@/adapters/driven/messaging/WhatsAppAdapter';
import { SupabaseStorageAdapter } from '@/adapters/driven/storage/SupabaseStorageAdapter';
import { SupabaseRealtimeAdapter } from '@/adapters/driven/notification/SupabaseRealtimeAdapter';
import { BrowserGeoAdapter } from '@/adapters/driven/geolocation/BrowserGeoAdapter';

// Puertos (tipos)
import type { IProductoRepository, IPedidoRepository, IClienteRepository, IInventarioRepository, IGastoRepository } from '@/domain/ports/repositories';
import type { IEntregaRepository, EntregaData } from '@/domain/ports/repositories/IEntregaRepository';
import type { IPagoGateway, IMensajeriaService, INotificacionService, IStorageService, IGeolocalizacionService } from '@/domain/ports/services';

// Casos de uso
import { CrearProducto, EditarProducto, EliminarProducto } from '@/application/use-cases/productos';
import { CrearPedido, ActualizarEstadoPedido, AgregarProductoAPedido, ConfirmarPedido } from '@/application/use-cases/pedidos';
import { RegistrarArticulo, ActualizarCantidad, VerificarDisponibilidad } from '@/application/use-cases/inventario';
import { RegistrarGasto, ConsultarGastos } from '@/application/use-cases/gastos';
import { GenerarCorte } from '@/application/use-cases/cortes';
import { IniciarPagoMercadoPago, ConfirmarPago, VerificarComprobante } from '@/application/use-cases/pagos';
import { AceptarEntrega, ActualizarUbicacion, CompletarEntrega, MarcarEntregaFallida } from '@/application/use-cases/entregas';
import { NotificarNuevoPedido, NotificarCambioEstado, EnviarCuentaCliente, NotificarInventarioBajo } from '@/application/use-cases/notificaciones';

// ============================================================
// Implementación simple de IEntregaRepository con Supabase
// (No existía como archivo separado, se incluye aquí por completitud)
// ============================================================
class SupabaseEntregaRepo implements IEntregaRepository {
  constructor(private readonly client: SupabaseClient) {}

  async obtenerPorId(id: string): Promise<EntregaData | null> {
    const { data, error } = await this.client
      .from('entrega')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Error obteniendo entrega: ${error.message}`);
    }

    return this.toDomain(data);
  }

  async contarActivasPorRepartidor(repartidorId: string): Promise<number> {
    const { count, error } = await this.client
      .from('entrega')
      .select('*', { count: 'exact', head: true })
      .eq('repartidor_id', repartidorId)
      .eq('estado', 'en_camino');

    if (error) {
      throw new Error(`Error contando entregas activas: ${error.message}`);
    }

    return count ?? 0;
  }

  async actualizar(entrega: EntregaData): Promise<void> {
    const { error } = await this.client
      .from('entrega')
      .update({
        estado: entrega.estado,
        motivo_no_entrega: entrega.motivoNoEntrega ?? null,
        aceptada_en: entrega.aceptadaEn?.toISOString() ?? null,
        completada_en: entrega.completadaEn?.toISOString() ?? null,
      })
      .eq('id', entrega.id);

    if (error) {
      throw new Error(`Error actualizando entrega: ${error.message}`);
    }
  }

  async listarPendientes(): Promise<EntregaData[]> {
    const { data, error } = await this.client
      .from('entrega')
      .select()
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: true });

    if (error) {
      throw new Error(`Error listando entregas pendientes: ${error.message}`);
    }

    return (data ?? []).map(this.toDomain);
  }

  private toDomain(record: Record<string, unknown>): EntregaData {
    return {
      id: record.id as string,
      pedidoId: record.pedido_id as string,
      repartidorId: record.repartidor_id as string,
      estado: record.estado as string,
      motivoNoEntrega: record.motivo_no_entrega as string | null,
      aceptadaEn: record.aceptada_en ? new Date(record.aceptada_en as string) : null,
      completadaEn: record.completada_en ? new Date(record.completada_en as string) : null,
      creadoEn: new Date(record.creado_en as string),
    };
  }
}

// ============================================================
// Container Class
// ============================================================

/**
 * Contenedor de dependencias del sistema.
 * Instancia lazily los adaptadores y casos de uso para cada request.
 */
class Container {
  private _supabase: SupabaseClient | null = null;

  // ---- Supabase Server Client (singleton per container) ----
  private get supabase(): SupabaseClient {
    if (!this._supabase) {
      this._supabase = createServerClient();
    }
    return this._supabase;
  }

  // ============================================================
  // Repositorios
  // ============================================================

  getProductoRepository(): IProductoRepository {
    return new SupabaseProductoRepo(this.supabase);
  }

  getPedidoRepository(): IPedidoRepository {
    return new SupabasePedidoRepo(this.supabase);
  }

  getClienteRepository(): IClienteRepository {
    return new SupabaseClienteRepo(this.supabase);
  }

  getInventarioRepository(): IInventarioRepository {
    return new SupabaseInventarioRepo(this.supabase);
  }

  getGastoRepository(): IGastoRepository {
    return new SupabaseGastoRepo(this.supabase);
  }

  getEntregaRepository(): IEntregaRepository {
    return new SupabaseEntregaRepo(this.supabase);
  }

  // ============================================================
  // Servicios (Adaptadores de salida)
  // ============================================================

  getPagoGateway(): IPagoGateway {
    return new MercadoPagoAdapter();
  }

  getMensajeriaService(): IMensajeriaService {
    return new WhatsAppAdapter();
  }

  getNotificacionService(): INotificacionService {
    return new SupabaseRealtimeAdapter(this.supabase);
  }

  getStorageService(): IStorageService {
    return new SupabaseStorageAdapter(this.supabase);
  }

  getGeolocalizacionService(): IGeolocalizacionService {
    return new BrowserGeoAdapter(this.supabase);
  }

  // ============================================================
  // Casos de Uso - Productos
  // ============================================================

  getCrearProducto(): CrearProducto {
    return new CrearProducto(
      this.getProductoRepository(),
      this.getStorageService()
    );
  }

  getEditarProducto(): EditarProducto {
    return new EditarProducto(
      this.getProductoRepository(),
      this.getStorageService()
    );
  }

  getEliminarProducto(): EliminarProducto {
    return new EliminarProducto(this.getProductoRepository());
  }

  // ============================================================
  // Casos de Uso - Pedidos
  // ============================================================

  getCrearPedido(): CrearPedido {
    return new CrearPedido(
      this.getPedidoRepository(),
      this.getClienteRepository(),
      this.getInventarioRepository(),
      this.getProductoRepository(),
      this.getNotificacionService()
    );
  }

  getActualizarEstadoPedido(): ActualizarEstadoPedido {
    return new ActualizarEstadoPedido(
      this.getPedidoRepository(),
      this.getNotificacionService()
    );
  }

  getAgregarProductoAPedido(): AgregarProductoAPedido {
    return new AgregarProductoAPedido(
      this.getPedidoRepository(),
      this.getProductoRepository()
    );
  }

  getConfirmarPedido(): ConfirmarPedido {
    return new ConfirmarPedido(
      this.getPedidoRepository(),
      this.getInventarioRepository(),
      this.getNotificacionService()
    );
  }

  // ============================================================
  // Casos de Uso - Inventario
  // ============================================================

  getRegistrarArticulo(): RegistrarArticulo {
    return new RegistrarArticulo(this.getInventarioRepository());
  }

  getActualizarCantidad(): ActualizarCantidad {
    return new ActualizarCantidad(
      this.getInventarioRepository(),
      this.getNotificacionService()
    );
  }

  getVerificarDisponibilidad(): VerificarDisponibilidad {
    return new VerificarDisponibilidad(
      this.getInventarioRepository(),
      this.getProductoRepository()
    );
  }

  // ============================================================
  // Casos de Uso - Gastos
  // ============================================================

  getRegistrarGasto(): RegistrarGasto {
    return new RegistrarGasto(this.getGastoRepository());
  }

  getConsultarGastos(): ConsultarGastos {
    return new ConsultarGastos(this.getGastoRepository());
  }

  // ============================================================
  // Casos de Uso - Cortes
  // ============================================================

  getGenerarCorte(): GenerarCorte {
    return new GenerarCorte(
      this.getPedidoRepository(),
      this.getGastoRepository()
    );
  }

  // ============================================================
  // Casos de Uso - Pagos
  // ============================================================

  getIniciarPagoMercadoPago(): IniciarPagoMercadoPago {
    return new IniciarPagoMercadoPago(
      this.getPedidoRepository(),
      this.getPagoGateway()
    );
  }

  getConfirmarPago(): ConfirmarPago {
    return new ConfirmarPago(
      this.getPedidoRepository(),
      this.getPagoGateway(),
      this.getNotificacionService()
    );
  }

  getVerificarComprobante(): VerificarComprobante {
    return new VerificarComprobante(
      this.getPedidoRepository(),
      this.getNotificacionService()
    );
  }

  // ============================================================
  // Casos de Uso - Entregas
  // ============================================================

  getAceptarEntrega(): AceptarEntrega {
    return new AceptarEntrega(
      this.getEntregaRepository(),
      this.getPedidoRepository(),
      this.getGeolocalizacionService()
    );
  }

  getActualizarUbicacion(): ActualizarUbicacion {
    return new ActualizarUbicacion(
      this.getGeolocalizacionService(),
      this.getNotificacionService()
    );
  }

  getCompletarEntrega(): CompletarEntrega {
    return new CompletarEntrega(
      this.getEntregaRepository(),
      this.getPedidoRepository(),
      this.getGeolocalizacionService()
    );
  }

  getMarcarEntregaFallida(): MarcarEntregaFallida {
    return new MarcarEntregaFallida(
      this.getEntregaRepository(),
      this.getPedidoRepository(),
      this.getGeolocalizacionService()
    );
  }

  // ============================================================
  // Casos de Uso - Notificaciones
  // ============================================================

  getNotificarNuevoPedido(): NotificarNuevoPedido {
    return new NotificarNuevoPedido(this.getNotificacionService());
  }

  getNotificarCambioEstado(): NotificarCambioEstado {
    return new NotificarCambioEstado(this.getNotificacionService());
  }

  getEnviarCuentaCliente(): EnviarCuentaCliente {
    return new EnviarCuentaCliente(
      this.getPedidoRepository(),
      this.getClienteRepository(),
      this.getMensajeriaService(),
      this.getNotificacionService()
    );
  }

  getNotificarInventarioBajo(): NotificarInventarioBajo {
    return new NotificarInventarioBajo(this.getNotificacionService());
  }
}

// ============================================================
// Export singleton factory
// ============================================================

/**
 * Obtiene una instancia del contenedor de dependencias.
 * Se crea una nueva instancia por cada invocación para asegurar
 * que cada request tenga su propio cliente Supabase server-side.
 *
 * Uso en API Routes:
 * ```ts
 * import { getContainer } from '@/shared/container';
 * const container = getContainer();
 * const crearProducto = container.getCrearProducto();
 * ```
 */
export function getContainer(): Container {
  return new Container();
}

export type { Container };
