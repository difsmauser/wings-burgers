import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrearPedido } from '@/application/use-cases/pedidos/CrearPedido';
import { ActualizarEstadoPedido } from '@/application/use-cases/pedidos/ActualizarEstadoPedido';
import { AceptarEntrega } from '@/application/use-cases/entregas/AceptarEntrega';
import { GenerarCorte } from '@/application/use-cases/cortes/GenerarCorte';
import { EnviarCuentaCliente } from '@/application/use-cases/notificaciones/EnviarCuentaCliente';
import { EstadoPedido, ModalidadServicio, EstadoEntrega } from '@/domain/value-objects';
import { ValidacionError, TransicionEstadoInvalidaError, LimiteEntregasExcedidoError } from '@/shared/errors';

/**
 * Unit tests para casos de uso principales.
 * Validates: Requirements 7.5, 5.5, 9.5, 14.7
 */

// ============================================================
// 1. CrearPedido: pedido sin modalidad debe rechazarse (Req 7.5)
// ============================================================
describe('CrearPedido', () => {
  let pedidoRepo: any;
  let clienteRepo: any;
  let inventarioRepo: any;
  let productoRepo: any;
  let notificacionService: any;
  let useCase: CrearPedido;

  beforeEach(() => {
    pedidoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorNumero: vi.fn(),
      listarPorEstado: vi.fn(),
      listarPorCliente: vi.fn(),
      listarPorPeriodo: vi.fn(),
      contarPorPeriodo: vi.fn(),
    };
    clienteRepo = {
      crear: vi.fn(),
      obtenerPorTelefono: vi.fn(),
      obtenerPorId: vi.fn(),
      listar: vi.fn(),
    };
    inventarioRepo = {
      registrar: vi.fn(),
      actualizar: vi.fn(),
      obtenerPorId: vi.fn(),
      listarBajoMinimo: vi.fn(),
      obtenerArticulosPorProducto: vi.fn(),
      registrarMovimiento: vi.fn(),
    };
    productoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(),
      desactivar: vi.fn(),
      obtenerPorId: vi.fn(),
      listarActivos: vi.fn(),
      listarPorCategoria: vi.fn(),
    };
    notificacionService = {
      notificarNuevoPedido: vi.fn(),
      notificarCambioEstado: vi.fn(),
      notificarInventarioBajo: vi.fn(),
      notificarRepartidorDisponible: vi.fn(),
      enviarPush: vi.fn(),
    };

    useCase = new CrearPedido(
      pedidoRepo,
      clienteRepo,
      inventarioRepo,
      productoRepo,
      notificacionService
    );
  });

  it('debe rechazar pedido sin modalidad con ValidacionError mencionando "modalidad"', async () => {
    const input = {
      nombre: 'Juan Pérez',
      telefono: '5512345678',
      modalidad: undefined as any, // sin modalidad
    };

    await expect(useCase.ejecutar(input)).rejects.toThrow(ValidacionError);

    try {
      await useCase.ejecutar(input);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidacionError);
      const validacionError = error as ValidacionError;
      expect(validacionError.message).toContain('modalidad');
    }
  });
});

// ============================================================
// 2. ActualizarEstadoPedido: transiciones válidas e inválidas
// ============================================================
describe('ActualizarEstadoPedido', () => {
  let pedidoRepo: any;
  let notificacionService: any;
  let useCase: ActualizarEstadoPedido;

  beforeEach(() => {
    pedidoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorNumero: vi.fn(),
      listarPorEstado: vi.fn(),
      listarPorCliente: vi.fn(),
      listarPorPeriodo: vi.fn(),
      contarPorPeriodo: vi.fn(),
    };
    notificacionService = {
      notificarNuevoPedido: vi.fn(),
      notificarCambioEstado: vi.fn(),
      notificarInventarioBajo: vi.fn(),
      notificarRepartidorDisponible: vi.fn(),
      enviarPush: vi.fn(),
    };

    useCase = new ActualizarEstadoPedido(pedidoRepo, notificacionService);
  });

  it('debe permitir transición válida RECIBIDO → EN_PREPARACION', async () => {
    const pedidoData = {
      id: 'pedido-1',
      numero: 'PED-20240101-0001',
      clienteId: 'cliente-1',
      estado: 'recibido',
      modalidad: 'local',
      items: [],
      total: 100,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    pedidoRepo.obtenerPorId.mockResolvedValue(pedidoData);
    pedidoRepo.actualizar.mockResolvedValue({ ...pedidoData, estado: 'en_preparacion' });
    notificacionService.notificarCambioEstado.mockResolvedValue(undefined);

    await expect(
      useCase.ejecutar('pedido-1', EstadoPedido.EN_PREPARACION)
    ).resolves.not.toThrow();

    expect(pedidoRepo.actualizar).toHaveBeenCalledWith('pedido-1', expect.objectContaining({
      estado: 'en_preparacion',
    }));
  });

  it('debe rechazar transición inválida RECIBIDO → EMPACADO con TransicionEstadoInvalidaError', async () => {
    const pedidoData = {
      id: 'pedido-1',
      numero: 'PED-20240101-0001',
      clienteId: 'cliente-1',
      estado: 'recibido',
      modalidad: 'local',
      items: [],
      total: 100,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    pedidoRepo.obtenerPorId.mockResolvedValue(pedidoData);

    await expect(
      useCase.ejecutar('pedido-1', EstadoPedido.EMPACADO)
    ).rejects.toThrow(TransicionEstadoInvalidaError);
  });
});

// ============================================================
// 3. AceptarEntrega: límite de 3 entregas concurrentes (Req 14.7)
// ============================================================
describe('AceptarEntrega', () => {
  let entregaRepo: any;
  let pedidoRepo: any;
  let geoService: any;
  let useCase: AceptarEntrega;

  beforeEach(() => {
    entregaRepo = {
      obtenerPorId: vi.fn(),
      contarActivasPorRepartidor: vi.fn(),
      actualizar: vi.fn(),
      listarPendientes: vi.fn(),
    };
    pedidoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorNumero: vi.fn(),
      listarPorEstado: vi.fn(),
      listarPorCliente: vi.fn(),
      listarPorPeriodo: vi.fn(),
      contarPorPeriodo: vi.fn(),
    };
    geoService = {
      actualizarUbicacion: vi.fn(),
      obtenerUbicacion: vi.fn(),
      calcularTiempoEstimado: vi.fn(),
    };

    useCase = new AceptarEntrega(entregaRepo, pedidoRepo, geoService);
  });

  it('debe rechazar aceptar entrega cuando repartidor tiene 3 entregas activas', async () => {
    const entregaData = {
      id: 'entrega-1',
      pedidoId: 'pedido-1',
      repartidorId: 'repartidor-1',
      estado: EstadoEntrega.PENDIENTE,
      motivoNoEntrega: null,
      aceptadaEn: null,
      completadaEn: null,
      creadoEn: new Date(),
    };

    entregaRepo.obtenerPorId.mockResolvedValue(entregaData);
    entregaRepo.contarActivasPorRepartidor.mockResolvedValue(3); // Ya tiene 3 activas

    await expect(useCase.ejecutar('entrega-1')).rejects.toThrow(LimiteEntregasExcedidoError);
  });

  it('debe permitir aceptar entrega cuando repartidor tiene menos de 3 activas', async () => {
    const entregaData = {
      id: 'entrega-2',
      pedidoId: 'pedido-2',
      repartidorId: 'repartidor-2',
      estado: EstadoEntrega.PENDIENTE,
      motivoNoEntrega: null,
      aceptadaEn: null,
      completadaEn: null,
      creadoEn: new Date(),
    };

    entregaRepo.obtenerPorId.mockResolvedValue(entregaData);
    entregaRepo.contarActivasPorRepartidor.mockResolvedValue(2); // Solo 2 activas
    entregaRepo.actualizar.mockResolvedValue(undefined);
    pedidoRepo.actualizar.mockResolvedValue({});
    geoService.actualizarUbicacion.mockResolvedValue(undefined);

    await expect(useCase.ejecutar('entrega-2')).resolves.not.toThrow();

    expect(entregaRepo.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'entrega-2',
        estado: EstadoEntrega.EN_CAMINO,
      })
    );
  });
});

// ============================================================
// 4. GenerarCorte: período sin movimientos retorna ceros (Req 5.5)
// ============================================================
describe('GenerarCorte', () => {
  let pedidoRepo: any;
  let gastoRepo: any;
  let useCase: GenerarCorte;

  beforeEach(() => {
    pedidoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorNumero: vi.fn(),
      listarPorEstado: vi.fn(),
      listarPorCliente: vi.fn(),
      listarPorPeriodo: vi.fn(),
      contarPorPeriodo: vi.fn(),
    };
    gastoRepo = {
      registrar: vi.fn(),
      consultar: vi.fn(),
      sumarPorCategoria: vi.fn(),
      totalPorPeriodo: vi.fn(),
    };

    useCase = new GenerarCorte(pedidoRepo, gastoRepo);
  });

  it('debe retornar valores en cero cuando no hay movimientos en el período', async () => {
    // Período sin pedidos ni gastos
    pedidoRepo.listarPorPeriodo.mockResolvedValue([]);
    gastoRepo.consultar.mockResolvedValue([]);

    const fecha = new Date(2024, 0, 15); // 15 enero 2024
    const resultado = await useCase.ejecutar('diario', fecha);

    expect(resultado.totalVentas).toBe(0);
    expect(resultado.totalGastos).toBe(0);
    expect(resultado.gananciaNeta).toBe(0);
    expect(resultado.numeroPedidos).toBe(0);
    expect(resultado.ticketPromedio).toBe(0);
    expect(resultado.top5Productos).toEqual([]);
  });
});

// ============================================================
// 5. EnviarCuentaCliente: cliente sin dato de contacto (Req 9.5)
// ============================================================
describe('EnviarCuentaCliente', () => {
  let pedidoRepo: any;
  let clienteRepo: any;
  let mensajeriaService: any;
  let notificacionService: any;
  let useCase: EnviarCuentaCliente;

  beforeEach(() => {
    pedidoRepo = {
      crear: vi.fn(),
      actualizar: vi.fn(),
      obtenerPorId: vi.fn(),
      obtenerPorNumero: vi.fn(),
      listarPorEstado: vi.fn(),
      listarPorCliente: vi.fn(),
      listarPorPeriodo: vi.fn(),
      contarPorPeriodo: vi.fn(),
    };
    clienteRepo = {
      crear: vi.fn(),
      obtenerPorTelefono: vi.fn(),
      obtenerPorId: vi.fn(),
      listar: vi.fn(),
    };
    mensajeriaService = {
      enviarWhatsApp: vi.fn(),
      enviarEmail: vi.fn(),
    };
    notificacionService = {
      notificarNuevoPedido: vi.fn(),
      notificarCambioEstado: vi.fn(),
      notificarInventarioBajo: vi.fn(),
      notificarRepartidorDisponible: vi.fn(),
      enviarPush: vi.fn(),
    };

    useCase = new EnviarCuentaCliente(
      pedidoRepo,
      clienteRepo,
      mensajeriaService,
      notificacionService
    );
  });

  it('debe lanzar ValidacionError mencionando "telefono" cuando cliente no tiene teléfono para whatsapp', async () => {
    const pedido = {
      id: 'pedido-1',
      numero: 'PED-20240101-0001',
      clienteId: 'cliente-1',
      items: [{ productoId: 'p1', nombre: 'Alitas BBQ', cantidad: 2, precioUnitario: 89.00 }],
      estado: 'recibido' as const,
      modalidad: 'local' as const,
      total: 178.00,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const clienteSinTelefono = {
      id: 'cliente-1',
      nombre: 'María López',
      telefono: '', // sin teléfono
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    pedidoRepo.obtenerPorId.mockResolvedValue(pedido);
    clienteRepo.obtenerPorId.mockResolvedValue(clienteSinTelefono);

    await expect(useCase.ejecutar('pedido-1', 'whatsapp')).rejects.toThrow(ValidacionError);

    try {
      await useCase.ejecutar('pedido-1', 'whatsapp');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidacionError);
      expect((error as ValidacionError).message.toLowerCase()).toContain('teléfono');
    }
  });

  it('debe lanzar ValidacionError mencionando "correo" cuando cliente no tiene email para email', async () => {
    const pedido = {
      id: 'pedido-2',
      numero: 'PED-20240101-0002',
      clienteId: 'cliente-2',
      items: [{ productoId: 'p1', nombre: 'Hamburguesa', cantidad: 1, precioUnitario: 120.00 }],
      estado: 'recibido' as const,
      modalidad: 'domicilio' as const,
      total: 120.00,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const clienteSinCorreo = {
      id: 'cliente-2',
      nombre: 'Carlos García',
      telefono: '5598765432',
      // correo: undefined - no tiene correo
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    pedidoRepo.obtenerPorId.mockResolvedValue(pedido);
    clienteRepo.obtenerPorId.mockResolvedValue(clienteSinCorreo);

    await expect(useCase.ejecutar('pedido-2', 'email')).rejects.toThrow(ValidacionError);

    try {
      await useCase.ejecutar('pedido-2', 'email');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidacionError);
      expect((error as ValidacionError).message.toLowerCase()).toContain('correo');
    }
  });
});
