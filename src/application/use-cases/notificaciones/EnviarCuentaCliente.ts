import type { IPedidoRepository, IClienteRepository } from '@/domain/ports/repositories';
import type { IMensajeriaService, INotificacionService } from '@/domain/ports/services';
import type { Pedido, Cliente } from '@/shared/domain-types';
import { RecursoNoEncontradoError, ValidacionError } from '@/shared/errors';

/** Canal por el cual se enviará la cuenta al cliente */
export type CanalEnvio = 'whatsapp' | 'email' | 'app';

/**
 * Caso de uso: Enviar cuenta/resumen al cliente.
 *
 * Genera un resumen de cuenta (items, subtotal, impuestos, total) y lo envía
 * al cliente por el canal seleccionado (WhatsApp, email o notificación in-app).
 * Valida que el cliente tenga la información de contacto necesaria para el canal.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export class EnviarCuentaCliente {
  constructor(
    private readonly pedidoRepo: IPedidoRepository,
    private readonly clienteRepo: IClienteRepository,
    private readonly mensajeriaService: IMensajeriaService,
    private readonly notificacionService: INotificacionService
  ) {}

  /**
   * Ejecuta el envío de cuenta al cliente por el canal especificado.
   * @param pedidoId - Identificador del pedido a facturar
   * @param canal - Canal de envío: 'whatsapp', 'email' o 'app'
   * @throws RecursoNoEncontradoError si el pedido o cliente no existe
   * @throws ValidacionError si el cliente no tiene el dato de contacto requerido
   */
  async ejecutar(pedidoId: string, canal: CanalEnvio): Promise<void> {
    // 1. Obtener el pedido
    const pedido = await this.pedidoRepo.obtenerPorId(pedidoId);
    if (!pedido) {
      throw new RecursoNoEncontradoError('Pedido', pedidoId);
    }

    // 2. Obtener el cliente
    const cliente = await this.clienteRepo.obtenerPorId(pedido.clienteId);
    if (!cliente) {
      throw new RecursoNoEncontradoError('Cliente', pedido.clienteId);
    }

    // 3. Validar que el cliente tiene el dato de contacto para el canal
    this.validarContacto(cliente, canal);

    // 4. Generar resumen de cuenta
    const resumen = this.generarResumen(pedido, cliente);

    // 5. Enviar por el canal seleccionado
    switch (canal) {
      case 'whatsapp':
        await this.mensajeriaService.enviarWhatsApp(cliente.telefono, resumen);
        break;
      case 'email':
        await this.mensajeriaService.enviarEmail(
          cliente.correo!,
          `Cuenta - Pedido #${pedido.numero}`,
          resumen
        );
        break;
      case 'app':
        await this.notificacionService.enviarPush(
          cliente.id,
          `Cuenta - Pedido #${pedido.numero}`,
          resumen
        );
        break;
    }
  }

  /**
   * Valida que el cliente tenga la información de contacto necesaria.
   * @throws ValidacionError si falta el dato de contacto
   */
  private validarContacto(cliente: Cliente, canal: CanalEnvio): void {
    switch (canal) {
      case 'whatsapp':
        if (!cliente.telefono) {
          throw new ValidacionError(
            'El cliente no tiene número de teléfono registrado para envío por WhatsApp',
            ['telefono']
          );
        }
        break;
      case 'email':
        if (!cliente.correo) {
          throw new ValidacionError(
            'El cliente no tiene correo electrónico registrado para envío por email',
            ['correo']
          );
        }
        break;
      case 'app':
        if (!cliente.id) {
          throw new ValidacionError(
            'El cliente no tiene cuenta en la app para recibir notificaciones',
            ['cuenta_app']
          );
        }
        break;
    }
  }

  /**
   * Genera el resumen de cuenta con items, subtotal, impuestos y total.
   * Requirements: 9.1
   */
  private generarResumen(pedido: Pedido, cliente: Cliente): string {
    const lineas: string[] = [];

    lineas.push(`🧾 Cuenta - Pedido #${pedido.numero}`);
    lineas.push(`Cliente: ${cliente.nombre}`);
    lineas.push('─────────────────────────');

    // Listar items con cantidades y precios unitarios
    for (const item of pedido.items) {
      const subtotalItem = item.precioUnitario * item.cantidad;
      lineas.push(`${item.cantidad}x ${item.nombre} - $${item.precioUnitario.toFixed(2)} c/u = $${subtotalItem.toFixed(2)}`);
    }

    lineas.push('─────────────────────────');

    // Calcular subtotal e impuestos
    const subtotal = pedido.items.reduce(
      (sum, item) => sum + item.precioUnitario * item.cantidad,
      0
    );
    const impuestos = pedido.total - subtotal;

    lineas.push(`Subtotal: $${subtotal.toFixed(2)}`);
    if (impuestos > 0) {
      lineas.push(`Impuestos: $${impuestos.toFixed(2)}`);
    }
    lineas.push(`Total: $${pedido.total.toFixed(2)}`);

    return lineas.join('\n');
  }
}
