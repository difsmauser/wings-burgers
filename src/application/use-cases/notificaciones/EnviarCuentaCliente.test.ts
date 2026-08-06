import { describe, it, expect, vi } from 'vitest';
import { EnviarCuentaCliente } from './EnviarCuentaCliente';
import type { IPedidoRepository, IClienteRepository } from '@/domain/ports/repositories';
import type { IMensajeriaService, INotificacionService } from '@/domain/ports/services';
import type { Pedido, Cliente } from '@/shared/domain-types';
import { RecursoNoEncontradoError, ValidacionError } from '@/shared/errors';

function crearPedidoMock(): Pedido {
  return {
    id: 'pedido-001',
    numero: 'P-001',
    clienteId: 'cliente-001',
    items: [
      { productoId: 'prod-1', nombre: 'Alitas BBQ', cantidad: 2, precioUnitario: 89.99 },
      { productoId: 'prod-2', nombre: 'Hamburguesa Clásica', cantidad: 1, precioUnitario: 75.00 },
    ],
    estado: 'servido',
    modalidad: 'local',
    total: 254.98,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

function crearClienteMock(): Cliente {
  return {
    id: 'cliente-001',
    nombre: 'Juan Pérez',
    telefono: '5512345678',
    correo: 'juan@email.com',
    direccion: 'Calle 123',
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  };
}

function crearMockPedidoRepo(pedido: Pedido | null = crearPedidoMock()): IPedidoRepository {
  return {
    crear: vi.fn(),
    actualizar: vi.fn(),
    obtenerPorId: vi.fn().mockResolvedValue(pedido),
    obtenerPorNumero: vi.fn(),
    listarPorEstado: vi.fn(),
    listarPorCliente: vi.fn(),
    listarPorPeriodo: vi.fn(),
    contarPorPeriodo: vi.fn(),
  };
}

function crearMockClienteRepo(cliente: Cliente | null = crearClienteMock()): IClienteRepository {
  return {
    crear: vi.fn(),
    obtenerPorTelefono: vi.fn(),
    obtenerPorId: vi.fn().mockResolvedValue(cliente),
    listar: vi.fn(),
  };
}

function crearMockMensajeriaService(): IMensajeriaService {
  return {
    enviarWhatsApp: vi.fn().mockResolvedValue({ exitoso: true, fecha: new Date() }),
    enviarEmail: vi.fn().mockResolvedValue({ exitoso: true, fecha: new Date() }),
  };
}

function crearMockNotificacionService(): INotificacionService {
  return {
    notificarNuevoPedido: vi.fn().mockResolvedValue(undefined),
    notificarCambioEstado: vi.fn().mockResolvedValue(undefined),
    notificarInventarioBajo: vi.fn().mockResolvedValue(undefined),
    notificarRepartidorDisponible: vi.fn().mockResolvedValue(undefined),
    enviarPush: vi.fn().mockResolvedValue({ exitoso: true, fecha: new Date() }),
  };
}

describe('EnviarCuentaCliente', () => {
  it('debe enviar cuenta por WhatsApp al teléfono del cliente', async () => {
    const pedidoRepo = crearMockPedidoRepo();
    const clienteRepo = crearMockClienteRepo();
    const mensajeriaService = crearMockMensajeriaService();
    const notificacionService = crearMockNotificacionService();
    const useCase = new EnviarCuentaCliente(pedidoRepo, clienteRepo, mensajeriaService, notificacionService);

    await useCase.ejecutar('pedido-001', 'whatsapp');

    expect(mensajeriaService.enviarWhatsApp).toHaveBeenCalledTimes(1);
    expect(mensajeriaService.enviarWhatsApp).toHaveBeenCalledWith(
      '5512345678',
      expect.stringContaining('Pedido #P-001')
    );
  });

  it('debe enviar cuenta por email al correo del cliente', async () => {
    const pedidoRepo = crearMockPedidoRepo();
    const clienteRepo = crearMockClienteRepo();
    const mensajeriaService = crearMockMensajeriaService();
    const notificacionService = crearMockNotificacionService();
    const useCase = new EnviarCuentaCliente(pedidoRepo, clienteRepo, mensajeriaService, notificacionService);

    await useCase.ejecutar('pedido-001', 'email');

    expect(mensajeriaService.enviarEmail).toHaveBeenCalledTimes(1);
    expect(mensajeriaService.enviarEmail).toHaveBeenCalledWith(
      'juan@email.com',
      expect.stringContaining('Pedido #P-001'),
      expect.stringContaining('Total: $254.98')
    );
  });

  it('debe enviar cuenta por app usando notificación push', async () => {
    const pedidoRepo = crearMockPedidoRepo();
    const clienteRepo = crearMockClienteRepo();
    const mensajeriaService = crearMockMensajeriaService();
    const notificacionService = crearMockNotificacionService();
    const useCase = new EnviarCuentaCliente(pedidoRepo, clienteRepo, mensajeriaService, notificacionService);

    await useCase.ejecutar('pedido-001', 'app');

    expect(notificacionService.enviarPush).toHaveBeenCalledTimes(1);
    expect(notificacionService.enviarPush).toHaveBeenCalledWith(
      'cliente-001',
      expect.stringContaining('Pedido #P-001'),
      expect.stringContaining('Total: $254.98')
    );
  });

  it('debe incluir items, subtotal y total en el resumen', async () => {
    const pedidoRepo = crearMockPedidoRepo();
    const clienteRepo = crearMockClienteRepo();
    const mensajeriaService = crearMockMensajeriaService();
    const notificacionService = crearMockNotificacionService();
    const useCase = new EnviarCuentaCliente(pedidoRepo, clienteRepo, mensajeriaService, notificacionService);

    await useCase.ejecutar('pedido-001', 'whatsapp');

    const mensajeEnviado = vi.mocked(mensajeriaService.enviarWhatsApp).mock.calls[0][1];
    expect(mensajeEnviado).toContain('Alitas BBQ');
    expect(mensajeEnviado).toContain('Hamburguesa Clásica');
    expect(mensajeEnviado).toContain('Subtotal:');
    expect(mensajeEnviado).toContain('Total:');
    expect(mensajeEnviado).toContain('Juan Pérez');
  });

  it('debe lanzar RecursoNoEncontradoError si el pedido no existe', async () => {
    const pedidoRepo = crearMockPedidoRepo(null);
    const clienteRepo = crearMockClienteRepo();
    const mensajeriaService = crearMockMensajeriaService();
    const notificacionService = crearMockNotificacionService();
    const useCase = new EnviarCuentaCliente(pedidoRepo, clienteRepo, mensajeriaService, notificacionService);

    await expect(useCase.ejecutar('pedido-inexistente', 'whatsapp')).rejects.toThrow(
      RecursoNoEncontradoError
    );
  });

  it('debe lanzar RecursoNoEncontradoError si el cliente no existe', async () => {
    const pedidoRepo = crearMockPedidoRepo();
    const clienteRepo = crearMockClienteRepo(null);
    const mensajeriaService = crearMockMensajeriaService();
    const notificacionService = crearMockNotificacionService();
    const useCase = new EnviarCuentaCliente(pedidoRepo, clienteRepo, mensajeriaService, notificacionService);

    await expect(useCase.ejecutar('pedido-001', 'whatsapp')).rejects.toThrow(
      RecursoNoEncontradoError
    );
  });

  it('debe lanzar ValidacionError si el cliente no tiene correo y se selecciona email', async () => {
    const clienteSinCorreo: Cliente = { ...crearClienteMock(), correo: undefined };
    const pedidoRepo = crearMockPedidoRepo();
    const clienteRepo = crearMockClienteRepo(clienteSinCorreo);
    const mensajeriaService = crearMockMensajeriaService();
    const notificacionService = crearMockNotificacionService();
    const useCase = new EnviarCuentaCliente(pedidoRepo, clienteRepo, mensajeriaService, notificacionService);

    await expect(useCase.ejecutar('pedido-001', 'email')).rejects.toThrow(ValidacionError);
  });

  it('debe lanzar ValidacionError si el cliente no tiene teléfono y se selecciona whatsapp', async () => {
    const clienteSinTelefono: Cliente = { ...crearClienteMock(), telefono: '' };
    const pedidoRepo = crearMockPedidoRepo();
    const clienteRepo = crearMockClienteRepo(clienteSinTelefono);
    const mensajeriaService = crearMockMensajeriaService();
    const notificacionService = crearMockNotificacionService();
    const useCase = new EnviarCuentaCliente(pedidoRepo, clienteRepo, mensajeriaService, notificacionService);

    await expect(useCase.ejecutar('pedido-001', 'whatsapp')).rejects.toThrow(ValidacionError);
  });
});
