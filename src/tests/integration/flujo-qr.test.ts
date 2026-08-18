/**
 * Integration Test: Flujo QR
 * escanear → ver menú → personalizar → confirmar → rastrear
 *
 * Simula el flujo de un cliente que escanea un QR de mesa,
 * ve el menú, crea un pedido con personalizaciones y lo rastrea.
 *
 * Requirements: 8.1, 7.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { IProductoRepository, IPedidoRepository, IClienteRepository, IInventarioRepository } from '@/domain/ports/repositories';
import type { IEntregaRepository, EntregaData } from '@/domain/ports/repositories/IEntregaRepository';
import type { INotificacionService, IGeolocalizacionService } from '@/domain/ports/services';
import type { Producto, Pedido, Cliente, ArticuloInventario, EstadoPedido } from '@/shared/domain-types';
import type { FiltroProducto, FiltroCliente, Paginacion, PedidoPaginado, ResultadoEnvio, Coordenadas } from '@/shared/types';

import { CrearPedido } from '@/application/use-cases/pedidos/CrearPedido';
import { ConfirmarPedido } from '@/application/use-cases/pedidos/ConfirmarPedido';
import { ActualizarEstadoPedido } from '@/application/use-cases/pedidos/ActualizarEstadoPedido';
import { AceptarEntrega } from '@/application/use-cases/entregas/AceptarEntrega';
import { ActualizarUbicacion } from '@/application/use-cases/entregas/ActualizarUbicacion';

// ============================================================
// In-memory mock implementations
// ============================================================

class MockProductoRepo implements IProductoRepository {
  private store: Map<string, Producto> = new Map();

  seed(productos: Producto[]) {
    productos.forEach((p) => this.store.set(p.id, p));
  }

  async crear(producto: Producto): Promise<Producto> {
    this.store.set(producto.id, producto);
    return producto;
  }

  async actualizar(id: string, datos: Partial<Producto>): Promise<Producto> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Producto ${id} no encontrado`);
    const updated = { ...existing, ...datos };
    this.store.set(id, updated);
    return updated;
  }

  async desactivar(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (existing) this.store.set(id, { ...existing, activo: false });
  }

  async obtenerPorId(id: string): Promise<Producto | null> {
    return this.store.get(id) ?? null;
  }

  async listarActivos(filtros?: FiltroProducto): Promise<Producto[]> {
    let productos = Array.from(this.store.values()).filter((p) => p.activo);
    if (filtros?.categoria) {
      productos = productos.filter((p) => p.categoria === filtros.categoria);
    }
    return productos;
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
    return Array.from(this.store.values()).filter((p) => p.creadoEn >= inicio && p.creadoEn <= fin);
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
  private productoMap: Map<string, string[]> = new Map();

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

class MockGeoService implements IGeolocalizacionService {
  private ubicaciones: Map<string, Coordenadas> = new Map();
  actualizaciones: Array<{ repartidorId: string; lat: number; lng: number }> = [];

  async actualizarUbicacion(repartidorId: string, lat: number, lng: number): Promise<void> {
    this.ubicaciones.set(repartidorId, { lat, lng });
    this.actualizaciones.push({ repartidorId, lat, lng });
  }

  async obtenerUbicacion(repartidorId: string): Promise<Coordenadas | null> {
    return this.ubicaciones.get(repartidorId) ?? null;
  }

  async calcularTiempoEstimado(origen: Coordenadas, destino: Coordenadas): Promise<number> {
    return 12;
  }
}

// ============================================================
// QR Validation Logic (simulated — this would live in the API route)
// ============================================================

interface QrMesa {
  codigo: string;
  mesaZona: string;
  activo: boolean;
}

class QrValidator {
  private qrStore: Map<string, QrMesa> = new Map();

  registrar(qr: QrMesa) {
    this.qrStore.set(qr.codigo, qr);
  }

  validar(codigo: string): { valido: boolean; mesaZona?: string; error?: string } {
    const qr = this.qrStore.get(codigo);
    if (!qr) {
      return { valido: false, error: 'Código QR no reconocido. Solicite asistencia al personal.' };
    }
    if (!qr.activo) {
      return { valido: false, error: 'Este código QR ya no está activo.' };
    }
    return { valido: true, mesaZona: qr.mesaZona };
  }
}

// ============================================================
// Tests
// ============================================================

describe('Flujo QR: Escanear → Ver Menú → Personalizar → Confirmar → Rastrear', () => {
  let productoRepo: MockProductoRepo;
  let pedidoRepo: MockPedidoRepo;
  let clienteRepo: MockClienteRepo;
  let inventarioRepo: MockInventarioRepo;
  let entregaRepo: MockEntregaRepo;
  let notificacionService: MockNotificacionService;
  let geoService: MockGeoService;
  let qrValidator: QrValidator;

  beforeEach(() => {
    productoRepo = new MockProductoRepo();
    pedidoRepo = new MockPedidoRepo();
    clienteRepo = new MockClienteRepo();
    inventarioRepo = new MockInventarioRepo();
    entregaRepo = new MockEntregaRepo();
    notificacionService = new MockNotificacionService();
    geoService = new MockGeoService();
    qrValidator = new QrValidator();

    // Seed productos en el menú
    productoRepo.seed([
      {
        id: 'prod-alitas-bbq',
        nombre: 'Alitas BBQ',
        descripcion: '10 alitas en salsa BBQ',
        categoria: 'alitas',
        precio: 180,
        disponible: true,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      {
        id: 'prod-alitas-buffalo',
        nombre: 'Alitas Buffalo',
        descripcion: '10 alitas en salsa Buffalo',
        categoria: 'alitas',
        precio: 180,
        disponible: true,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      {
        id: 'prod-hamburguesa',
        nombre: 'Hamburguesa Clásica',
        descripcion: 'Hamburguesa con queso',
        categoria: 'hamburguesas',
        precio: 120,
        disponible: true,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      {
        id: 'prod-refresco',
        nombre: 'Refresco 600ml',
        descripcion: 'Refresco de cola',
        categoria: 'bebidas',
        precio: 35,
        disponible: true,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
    ]);

    // Seed inventario
    inventarioRepo.addArticuloConProducto(
      { id: 'art-1', nombre: 'Pollo', cantidad: 200, unidad: 'piezas', nivelMinimo: 20, productoIds: ['prod-alitas-bbq'], creadoEn: new Date(), actualizadoEn: new Date() },
      'prod-alitas-bbq'
    );
    inventarioRepo.addArticuloConProducto(
      { id: 'art-2', nombre: 'Pollo', cantidad: 200, unidad: 'piezas', nivelMinimo: 20, productoIds: ['prod-alitas-buffalo'], creadoEn: new Date(), actualizadoEn: new Date() },
      'prod-alitas-buffalo'
    );
    inventarioRepo.addArticuloConProducto(
      { id: 'art-3', nombre: 'Carne', cantidad: 100, unidad: 'piezas', nivelMinimo: 10, productoIds: ['prod-hamburguesa'], creadoEn: new Date(), actualizadoEn: new Date() },
      'prod-hamburguesa'
    );
    inventarioRepo.addArticuloConProducto(
      { id: 'art-4', nombre: 'Refresco', cantidad: 50, unidad: 'piezas', nivelMinimo: 5, productoIds: ['prod-refresco'], creadoEn: new Date(), actualizadoEn: new Date() },
      'prod-refresco'
    );

    // Registrar QR para mesas
    qrValidator.registrar({ codigo: 'QR-MESA-5', mesaZona: 'Mesa 5 - Interior', activo: true });
    qrValidator.registrar({ codigo: 'QR-MESA-T3', mesaZona: 'Terraza 3', activo: true });
    qrValidator.registrar({ codigo: 'QR-INACTIVO', mesaZona: 'Mesa obsoleta', activo: false });
  });

  it('debe completar el flujo QR: escanear, ver menú, pedir, confirmar, rastrear', async () => {
    // === PASO 1: Escanear QR y validar ===
    const resultadoQr = qrValidator.validar('QR-MESA-5');
    expect(resultadoQr.valido).toBe(true);
    expect(resultadoQr.mesaZona).toBe('Mesa 5 - Interior');

    // === PASO 2: Ver menú por categorías ===
    const menuAlitas = await productoRepo.listarPorCategoria('alitas');
    expect(menuAlitas.length).toBe(2);

    const menuHamburguesas = await productoRepo.listarPorCategoria('hamburguesas');
    expect(menuHamburguesas.length).toBe(1);

    const menuBebidas = await productoRepo.listarPorCategoria('bebidas');
    expect(menuBebidas.length).toBe(1);

    // Todos los productos activos
    const menuCompleto = await productoRepo.listarActivos();
    expect(menuCompleto.length).toBe(4);

    // === PASO 3: Crear pedido con personalización y mesa ===
    const crearPedido = new CrearPedido(
      pedidoRepo,
      clienteRepo,
      inventarioRepo,
      productoRepo,
      notificacionService
    );

    const pedido = await crearPedido.ejecutar({
      nombre: 'Ana Martínez',
      telefono: '5544556677',
      modalidad: 'local' as any,
      mesaZona: resultadoQr.mesaZona, // Asociar mesa del QR
      items: [
        { productoId: 'prod-alitas-bbq', cantidad: 1, personalizaciones: [{ nombre: 'extra picante', opcion: 'extra picante' }, { nombre: 'sin apio', opcion: 'sin apio' }] },
        { productoId: 'prod-refresco', cantidad: 2 },
      ],
      observaciones: 'Pedido desde QR Mesa 5',
    });

    expect(pedido).toBeDefined();
    expect(pedido.items.length).toBe(2);

    // Verificar que la mesa fue asociada al pedido
    const pedidoEnRepo = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoEnRepo!.mesaZona).toBe('Mesa 5 - Interior');

    // === PASO 4: Verificar notificación al vendedor incluye mesa ===
    const notificacionNuevoPedido = notificacionService.notificaciones.find(
      (n) => n.tipo === 'nuevo_pedido'
    );
    expect(notificacionNuevoPedido).toBeDefined();

    // La notificación contiene el pedido con mesaZona
    const pedidoNotificado = notificacionNuevoPedido!.data as Pedido;
    expect(pedidoNotificado.mesaZona).toBe('Mesa 5 - Interior');

    // === PASO 5: Confirmar pedido ===
    const confirmarPedido = new ConfirmarPedido(
      pedidoRepo,
      inventarioRepo,
      notificacionService
    );

    await confirmarPedido.ejecutar(pedido.id);

    const pedidoConfirmado = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoConfirmado!.estado).toBe('en_preparacion');

    // === PASO 6: Rastrear cambios de estado ===
    const actualizarEstado = new ActualizarEstadoPedido(pedidoRepo, notificacionService);

    await actualizarEstado.ejecutar(pedido.id, 'EMPACADO' as any);
    let pedidoActualizado = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoActualizado!.estado).toBe('empacado');

    // Para modalidad local, pasamos por LISTO_PARA_SERVIR antes de SERVIDO
    await actualizarEstado.ejecutar(pedido.id, 'LISTO_PARA_SERVIR' as any);
    pedidoActualizado = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoActualizado!.estado).toBe('listo_para_servir');

    await actualizarEstado.ejecutar(pedido.id, 'SERVIDO' as any);
    pedidoActualizado = await pedidoRepo.obtenerPorId(pedido.id);
    expect(pedidoActualizado!.estado).toBe('servido');

    // Verificar que se emitieron notificaciones por cada cambio de estado
    const cambiosEstado = notificacionService.notificaciones.filter(
      (n) => n.tipo === 'cambio_estado'
    );
    expect(cambiosEstado.length).toBeGreaterThanOrEqual(4); // en_preparacion, empacado, listo_para_servir, servido
  });

  it('debe rechazar QR inválido con mensaje de error', () => {
    const resultadoInvalido = qrValidator.validar('CODIGO-FALSO');
    expect(resultadoInvalido.valido).toBe(false);
    expect(resultadoInvalido.error).toContain('no reconocido');
  });

  it('debe rechazar QR inactivo', () => {
    const resultadoInactivo = qrValidator.validar('QR-INACTIVO');
    expect(resultadoInactivo.valido).toBe(false);
    expect(resultadoInactivo.error).toContain('no está activo');
  });

  it('debe rastrear ubicación GPS para pedidos a domicilio desde QR', async () => {
    // Validar QR de terraza
    const resultadoQr = qrValidator.validar('QR-MESA-T3');
    expect(resultadoQr.valido).toBe(true);

    // Crear pedido a domicilio (cliente decide pedir para llevar)
    const crearPedido = new CrearPedido(
      pedidoRepo,
      clienteRepo,
      inventarioRepo,
      productoRepo,
      notificacionService
    );

    const pedido = await crearPedido.ejecutar({
      nombre: 'Carlos Ramírez',
      telefono: '5533221100',
      modalidad: 'domicilio' as any,
      mesaZona: resultadoQr.mesaZona,
      items: [{ productoId: 'prod-hamburguesa', cantidad: 2 }],
    });

    // Confirmar y preparar el pedido
    const confirmarPedido = new ConfirmarPedido(pedidoRepo, inventarioRepo, notificacionService);
    await confirmarPedido.ejecutar(pedido.id);

    // Avanzar a empacado
    const actualizarEstado = new ActualizarEstadoPedido(pedidoRepo, notificacionService);
    await actualizarEstado.ejecutar(pedido.id, 'EMPACADO' as any);

    // Repartidor acepta entrega
    const entregaId = 'entrega-qr-001';
    const repartidorId = 'repartidor-gps';

    entregaRepo.addEntrega({
      id: entregaId,
      pedidoId: pedido.id,
      repartidorId,
      estado: 'PENDIENTE',
      creadoEn: new Date(),
    });

    const aceptarEntrega = new AceptarEntrega(entregaRepo, pedidoRepo, geoService);
    await aceptarEntrega.ejecutar(entregaId);

    // Simular actualizaciones GPS periódicas
    const actualizarUbicacion = new ActualizarUbicacion(geoService, notificacionService);

    await actualizarUbicacion.ejecutar(repartidorId, 19.4326, -99.1332);
    await actualizarUbicacion.ejecutar(repartidorId, 19.4330, -99.1335);
    await actualizarUbicacion.ejecutar(repartidorId, 19.4335, -99.1340);

    // Verificar que las ubicaciones fueron actualizadas
    expect(geoService.actualizaciones.length).toBeGreaterThanOrEqual(3);

    // Verificar última ubicación conocida
    const ultimaUbicacion = await geoService.obtenerUbicacion(repartidorId);
    expect(ultimaUbicacion).not.toBeNull();
    expect(ultimaUbicacion!.lat).toBe(19.4335);
    expect(ultimaUbicacion!.lng).toBe(-99.1340);
  });
});
