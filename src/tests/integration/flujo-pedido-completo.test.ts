/**
 * Integration Test: Flujo completo de pedido
 * crear producto → agregar a pedido → confirmar → pagar → entregar
 *
 * Usa mocks in-memory de los repositorios para validar la orquestación
 * de casos de uso sin depender de infraestructura real.
 *
 * Requirements: 7.1, 13.1, 5.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { IProductoRepository, IPedidoRepository, IClienteRepository, IInventarioRepository, IGastoRepository } from '@/domain/ports/repositories';
import type { IEntregaRepository, EntregaData } from '@/domain/ports/repositories/IEntregaRepository';
import type { IPagoGateway, INotificacionService, IStorageService, IGeolocalizacionService } from '@/domain/ports/services';
import type { Producto, Pedido, Cliente, ArticuloInventario, Gasto, EstadoPedido } from '@/shared/domain-types';
import type { FiltroProducto, FiltroGasto, FiltroCliente, Paginacion, PedidoPaginado, PreferenciaPago, NotificacionPago, ResultadoEnvio, Coordenadas, ResumenGastoCategoria } from '@/shared/types';

import { Categoria } from '@/domain/value-objects';
import { CrearProducto } from '@/application/use-cases/productos/CrearProducto';
import { CrearPedido } from '@/application/use-cases/pedidos/CrearPedido';
import { ConfirmarPedido } from '@/application/use-cases/pedidos/ConfirmarPedido';
import { ActualizarEstadoPedido } from '@/application/use-cases/pedidos/ActualizarEstadoPedido';
import { IniciarPagoMercadoPago } from '@/application/use-cases/pagos/IniciarPagoMercadoPago';
import { ConfirmarPago } from '@/application/use-cases/pagos/ConfirmarPago';
import { AceptarEntrega } from '@/application/use-cases/entregas/AceptarEntrega';
import { CompletarEntrega } from '@/application/use-cases/entregas/CompletarEntrega';

// ============================================================
// In-memory mock implementations
// ============================================================

class MockProductoRepo implements IProductoRepository {
  private store: Map<string, Producto> = new Map();

  async crear(producto: Producto): Promise<Producto> {
    this.store.set(producto.id, producto);
    return producto;
  }

  async actualizar(id: string, datos: Partial<Producto>): Promise<Producto> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Producto ${id} no encontrado`);
    const updated = { ...existing, ...datos, actualizadoEn: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async desactivar(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (existing) {
      this.store.set(id, { ...existing, activo: false });
    }
  }

  async obtenerPorId(id: string): Promise<Producto | null> {
    return this.store.get(id) ?? null;
  }

  async listarActivos(filtros?: FiltroProducto): Promise<Producto[]> {
    return Array.from(this.store.values()).filter((p) => p.activo);
  }

  async listarPorCategoria(categoria: string): Promise<Producto[]> {
    return Array.from(this.store.values()).filter((p) => p.categoria === categoria && p.activo);
  }
}

class MockPedidoRepo implements IPedidoRepository {
  private store: Map<string, Pedido> = new Map();

  async crear(pedido: Pedido): Promise<Pedido> {
    this.store.set(pedido.id, pedido);
    return pedido;
  }

  async actualizar(id: string, datos: Partial<Pedido>): Promise<Pedido> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Pedido ${id} no encontrado`);
    const updated = { ...existing, ...datos, actualizadoEn: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async obtenerPorId(id: string): Promise<Pedido | null> {
    return this.store.get(id) ?? null;
  }

  async obtenerPorNumero(numero: string): Promise<Pedido | null> {
    return Array.from(this.store.values()).find((p) => p.numero === numero) ?? null;
  }

  async listarPorEstado(estado: EstadoPedido): Promise<Pedido[]> {
    return Array.from(this.store.values()).filter((p) => p.estado === estado);
  }

  async listarPorCliente(clienteId: string, paginacion: Paginacion): Promise<PedidoPaginado> {
    const datos = Array.from(this.store.values()).filter((p) => p.clienteId === clienteId);
    return { datos, total: datos.length, pagina: 1, porPagina: 50, totalPaginas: 1 };
  }

  async listarPorPeriodo(inicio: Date, fin: Date): Promise<Pedido[]> {
    return Array.from(this.store.values()).filter(
      (p) => p.creadoEn >= inicio && p.creadoEn <= fin
    );
  }

  async contarPorPeriodo(inicio: Date, fin: Date): Promise<number> {
    return (await this.listarPorPeriodo(inicio, fin)).length;
  }
}

class MockClienteRepo implements IClienteRepository {
  private store: Map<string, Cliente> = new Map();

  async crear(cliente: Cliente): Promise<Cliente> {
    this.store.set(cliente.id, cliente);
    return cliente;
  }

  async obtenerPorTelefono(telefono: string): Promise<Cliente | null> {
    return Array.from(this.store.values()).find((c) => c.telefono === telefono) ?? null;
  }

  async obtenerPorId(id: string): Promise<Cliente | null> {
    return this.store.get(id) ?? null;
  }

  async listar(filtros: FiltroCliente): Promise<Cliente[]> {
    return Array.from(this.store.values());
  }
}

class MockInventarioRepo implements IInventarioRepository {
  private store: Map<string, ArticuloInventario> = new Map();
  private productoMap: Map<string, string[]> = new Map(); // productoId -> articuloIds

  addArticuloConProducto(articulo: ArticuloInventario, productoId: string) {
    this.store.set(articulo.id, articulo);
    const existing = this.productoMap.get(productoId) ?? [];
    existing.push(articulo.id);
    this.productoMap.set(productoId, existing);
  }

  async registrar(articulo: ArticuloInventario): Promise<ArticuloInventario> {
    this.store.set(articulo.id, articulo);
    return articulo;
  }

  async actualizar(id: string, cantidad: number, tipoMovimiento: string, adminId: string): Promise<ArticuloInventario> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Artículo ${id} no encontrado`);
    const updated = { ...existing, cantidad, actualizadoEn: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async obtenerPorId(id: string): Promise<ArticuloInventario | null> {
    return this.store.get(id) ?? null;
  }

  async listarBajoMinimo(): Promise<ArticuloInventario[]> {
    return Array.from(this.store.values()).filter((a) => a.cantidad <= a.nivelMinimo);
  }

  async obtenerArticulosPorProducto(productoId: string): Promise<ArticuloInventario[]> {
    const articuloIds = this.productoMap.get(productoId) ?? [];
    return articuloIds.map((id) => this.store.get(id)!).filter(Boolean);
  }

  async registrarMovimiento(): Promise<void> {}

  getArticulo(id: string): ArticuloInventario | undefined {
    return this.store.get(id);
  }
}

class MockEntregaRepo implements IEntregaRepository {
  private store: Map<string, EntregaData> = new Map();

  addEntrega(entrega: EntregaData) {
    this.store.set(entrega.id, entrega);
  }

  async obtenerPorId(id: string): Promise<EntregaData | null> {
    return this.store.get(id) ?? null;
  }

  async contarActivasPorRepartidor(repartidorId: string): Promise<number> {
    return Array.from(this.store.values()).filter(
      (e) => e.repartidorId === repartidorId && e.estado === 'EN_CAMINO'
    ).length;
  }

  async actualizar(entrega: EntregaData): Promise<void> {
    this.store.set(entrega.id, entrega);
  }

  async listarPendientes(): Promise<EntregaData[]> {
    return Array.from(this.store.values()).filter((e) => e.estado === 'PENDIENTE');
  }

  getEntrega(id: string): EntregaData | undefined {
    return this.store.get(id);
  }
}

class MockNotificacionService implements INotificacionService {
  notificaciones: Array<{ tipo: string; data: unknown }> = [];

  async notificarNuevoPedido(pedido: Pedido): Promise<void> {
    this.notificaciones.push({ tipo: 'nuevo_pedido', data: pedido });
  }

  async notificarCambioEstado(pedidoId: string, nuevoEstado: EstadoPedido): Promise<void> {
    this.notificaciones.push({ tipo: 'cambio_estado', data: { pedidoId, nuevoEstado } });
  }

  async notificarInventarioBajo(articulo: ArticuloInventario): Promise<void> {
    this.notificaciones.push({ tipo: 'inventario_bajo', data: articulo });
  }

  async notificarRepartidorDisponible(pedidoId: string): Promise<void> {
    this.notificaciones.push({ tipo: 'repartidor_disponible', data: pedidoId });
  }

  async enviarPush(usuarioId: string, titulo: string, cuerpo: string): Promise<ResultadoEnvio> {
    this.notificaciones.push({ tipo: 'push', data: { usuarioId, titulo, cuerpo } });
    return { exitoso: true, fecha: new Date() };
  }
}

class MockPagoGateway implements IPagoGateway {
  private pagosAprobados: Set<string> = new Set();

  aprobarPago(pedidoId: string) {
    this.pagosAprobados.add(pedidoId);
  }

  async crearPreferencia(pedido: Pedido): Promise<PreferenciaPago> {
    return {
      id: `pref-${pedido.id}`,
      urlPago: `https://mercadopago.com/pay/${pedido.id}`,
      urlRetorno: '/pago/exitoso',
      monto: pedido.total,
      expiracion: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async verificarPago(pagoId: string): Promise<import('@/shared/types').EstadoPago> {
    return 'aprobado';
  }

  async procesarWebhook(payload: unknown): Promise<NotificacionPago> {
    const data = payload as { pedidoId: string; pagoId: string };
    return {
      pagoId: data.pagoId,
      pedidoId: data.pedidoId,
      estado: 'aprobado',
      monto: 300,
      fecha: new Date(),
    };
  }
}

class MockStorageService implements IStorageService {
  async subirImagen(archivo: File, ruta: string): Promise<string> {
    return `https://storage.test.com/${ruta}`;
  }

  async eliminarImagen(ruta: string): Promise<void> {}

  obtenerUrlPublica(ruta: string): string {
    return `https://storage.test.com/${ruta}`;
  }
}

class MockGeoService implements IGeolocalizacionService {
  private ubicaciones: Map<string, Coordenadas> = new Map();

  async actualizarUbicacion(repartidorId: string, lat: number, lng: number): Promise<void> {
    this.ubicaciones.set(repartidorId, { lat, lng });
  }

  async obtenerUbicacion(repartidorId: string): Promise<Coordenadas | null> {
    return this.ubicaciones.get(repartidorId) ?? null;
  }

  async calcularTiempoEstimado(origen: Coordenadas, destino: Coordenadas): Promise<number> {
    return 15; // 15 minutos estimado
  }
}

// ============================================================
// Tests
// ============================================================

describe('Flujo Pedido Completo: Crear → Confirmar → Pagar → Entregar', () => {
  let productoRepo: MockProductoRepo;
  let pedidoRepo: MockPedidoRepo;
  let clienteRepo: MockClienteRepo;
  let inventarioRepo: MockInventarioRepo;
  let entregaRepo: MockEntregaRepo;
  let notificacionService: MockNotificacionService;
  let pagoGateway: MockPagoGateway;
  let storageService: MockStorageService;
  let geoService: MockGeoService;

  beforeEach(() => {
    productoRepo = new MockProductoRepo();
    pedidoRepo = new MockPedidoRepo();
    clienteRepo = new MockClienteRepo();
    inventarioRepo = new MockInventarioRepo();
    entregaRepo = new MockEntregaRepo();
    notificacionService = new MockNotificacionService();
    pagoGateway = new MockPagoGateway();
    storageService = new MockStorageService();
    geoService = new MockGeoService();
  });

  it('debe completar el ciclo de vida de un pedido a domicilio', async () => {
    // === PASO 1: Crear producto ===
    const crearProducto = new CrearProducto(productoRepo, storageService);

    const producto = await crearProducto.ejecutar({
      nombre: 'Alitas BBQ',
      descripcion: 'Alitas bañadas en salsa BBQ',
      categoria: Categoria.ALITAS,
      precio: 150.0,
      opcionesPersonalizacion: [],
    });

    expect(producto).toBeDefined();
    expect(producto.nombre).toBe('Alitas BBQ');

    // Verificar que el producto fue persistido
    const productoPersistido = await productoRepo.obtenerPorId(producto.id);
    expect(productoPersistido).not.toBeNull();
    expect(productoPersistido!.activo).toBe(true);

    // Configurar inventario para el producto
    inventarioRepo.addArticuloConProducto(
      {
        id: 'art-alitas',
        nombre: 'Alitas de pollo',
        cantidad: 100,
        unidad: 'piezas',
        nivelMinimo: 10,
        productoIds: [producto.id],
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      producto.id
    );

    // === PASO 2: Crear pedido con el producto ===
    const crearPedido = new CrearPedido(
      pedidoRepo,
      clienteRepo,
      inventarioRepo,
      productoRepo,
      notificacionService
    );

    const pedido = await crearPedido.ejecutar({
      nombre: 'Juan Pérez',
      telefono: '5512345678',
      modalidad: 'domicilio' as any,
      items: [
        { productoId: producto.id, cantidad: 2 },
      ],
      observaciones: 'Sin cebolla por favor',
    });

    expect(pedido).toBeDefined();
    expect(pedido.numero).toMatch(/^PED-\d{8}-\d{4}$/);
    expect(pedido.items.length).toBe(1);
    expect(pedido.total.valor).toBe(300); // 150 * 2 = 300 (sin IVA)

    // Verificar que el cliente fue creado
    const clienteCreado = await clienteRepo.obtenerPorTelefono('5512345678');
    expect(clienteCreado).not.toBeNull();
    expect(clienteCreado!.nombre).toBe('Juan Pérez');

    // Verificar que el inventario fue decrementado
    const articuloDespues = inventarioRepo.getArticulo('art-alitas');
    expect(articuloDespues!.cantidad).toBe(98); // 100 - 2

    // Verificar notificación al vendedor
    expect(notificacionService.notificaciones.length).toBeGreaterThan(0);
    expect(notificacionService.notificaciones[0].tipo).toBe('nuevo_pedido');

    // === PASO 3: Confirmar pedido ===
    const confirmarPedido = new ConfirmarPedido(
      pedidoRepo,
      inventarioRepo,
      notificacionService
    );

    // Necesitamos que el pedido tenga items en el repo para que ConfirmarPedido funcione
    const pedidoEnRepo = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoEnRepo).not.toBeNull();
    expect(pedidoEnRepo!.estado).toBe('recibido');

    await confirmarPedido.ejecutar(pedido.id);

    // Verificar cambio de estado a en_preparacion
    const pedidoConfirmado = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoConfirmado!.estado).toBe('en_preparacion');

    // === PASO 4: Iniciar pago con MercadoPago ===
    const iniciarPago = new IniciarPagoMercadoPago(pedidoRepo, pagoGateway);

    const preferencia = await iniciarPago.ejecutar(pedido.id);
    expect(preferencia.urlPago).toContain(pedido.id);
    expect(preferencia.monto).toBeGreaterThan(0);

    // === PASO 5: Confirmar pago via webhook ===
    const confirmarPagoUC = new ConfirmarPago(pedidoRepo, pagoGateway, notificacionService);

    await confirmarPagoUC.ejecutar({
      pedidoId: pedido.id,
      pagoId: 'pago-123',
    });

    // Verificar que el estado de pago se actualizó
    const pedidoPagado = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoPagado!.estado).toBe('pagado');

    // === PASO 6: Actualizar estado a empacado ===
    const actualizarEstado = new ActualizarEstadoPedido(pedidoRepo, notificacionService);

    // Primero volver a en_preparacion para la transición
    await pedidoRepo.actualizar(pedido.id, { estado: 'en_preparacion' as EstadoPedido });
    await actualizarEstado.ejecutar(pedido.id, 'EMPACADO' as any);

    const pedidoEmpacado = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoEmpacado!.estado).toBe('empacado');

    // === PASO 7: Asignar entrega (repartidor acepta) ===
    const entregaId = 'entrega-001';
    const repartidorId = 'repartidor-001';

    entregaRepo.addEntrega({
      id: entregaId,
      pedidoId: pedido.id,
      repartidorId,
      estado: 'PENDIENTE',
      creadoEn: new Date(),
    });

    const aceptarEntrega = new AceptarEntrega(entregaRepo, pedidoRepo, geoService);
    await aceptarEntrega.ejecutar(entregaId);

    // Verificar que la entrega fue aceptada
    const entregaAceptada = entregaRepo.getEntrega(entregaId);
    expect(entregaAceptada!.estado).toBe('EN_CAMINO');
    expect(entregaAceptada!.aceptadaEn).toBeInstanceOf(Date);

    // Verificar que el pedido pasó a en_camino
    const pedidoEnCamino = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoEnCamino!.estado).toBe('en_camino');

    // === PASO 8: Completar entrega ===
    const completarEntrega = new CompletarEntrega(entregaRepo, pedidoRepo, geoService);
    await completarEntrega.ejecutar(entregaId);

    // Verificar estado final: entregado
    const pedidoFinal = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoFinal!.estado).toBe('entregado');

    const entregaFinal = entregaRepo.getEntrega(entregaId);
    expect(entregaFinal!.estado).toBe('ENTREGADO');
    expect(entregaFinal!.completadaEn).toBeInstanceOf(Date);

    // === Verificar que las notificaciones se emitieron correctamente ===
    const tiposNotificacion = notificacionService.notificaciones.map((n) => n.tipo);
    expect(tiposNotificacion).toContain('nuevo_pedido');
    expect(tiposNotificacion).toContain('cambio_estado');
  });

  it('debe crear cliente una sola vez para pedidos del mismo teléfono', async () => {
    // Configurar producto y inventario
    await productoRepo.crear({
      id: 'prod-burger',
      nombre: 'Hamburguesa',
      descripcion: 'Hamburguesa clásica',
      categoria: 'hamburguesas',
      precio: 120,
      disponible: true,
      activo: true,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    });

    inventarioRepo.addArticuloConProducto(
      {
        id: 'art-carne',
        nombre: 'Carne molida',
        cantidad: 50,
        unidad: 'piezas',
        nivelMinimo: 5,
        productoIds: ['prod-burger'],
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      'prod-burger'
    );

    const crearPedido = new CrearPedido(
      pedidoRepo,
      clienteRepo,
      inventarioRepo,
      productoRepo,
      notificacionService
    );

    // Primer pedido
    await crearPedido.ejecutar({
      nombre: 'María García',
      telefono: '5598765432',
      modalidad: 'local' as any,
      items: [{ productoId: 'prod-burger', cantidad: 1 }],
    });

    // Segundo pedido con el mismo teléfono
    await crearPedido.ejecutar({
      nombre: 'María García',
      telefono: '5598765432',
      modalidad: 'domicilio' as any,
      items: [{ productoId: 'prod-burger', cantidad: 1 }],
    });

    // Verificar que solo hay un cliente con ese teléfono
    const cliente = await clienteRepo.obtenerPorTelefono('5598765432');
    expect(cliente).not.toBeNull();

    // Verificar que hay dos pedidos
    const pedidos = await pedidoRepo.listarPorCliente(cliente!.id, { pagina: 1, porPagina: 50 });
    expect(pedidos.datos.length).toBe(2);
  });

  it('debe rechazar pedido si producto no tiene inventario suficiente', async () => {
    await productoRepo.crear({
      id: 'prod-low',
      nombre: 'Bebida Especial',
      descripcion: 'Bebida limitada',
      categoria: 'bebidas',
      precio: 50,
      disponible: true,
      activo: true,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    });

    inventarioRepo.addArticuloConProducto(
      {
        id: 'art-bebida',
        nombre: 'Ingrediente especial',
        cantidad: 1, // Solo hay 1 disponible
        unidad: 'litros',
        nivelMinimo: 2,
        productoIds: ['prod-low'],
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      'prod-low'
    );

    const crearPedido = new CrearPedido(
      pedidoRepo,
      clienteRepo,
      inventarioRepo,
      productoRepo,
      notificacionService
    );

    // Intentar pedir más de lo disponible
    await expect(
      crearPedido.ejecutar({
        nombre: 'Pedro López',
        telefono: '5511112222',
        modalidad: 'local' as any,
        items: [{ productoId: 'prod-low', cantidad: 5 }],
      })
    ).rejects.toThrow();
  });
});
