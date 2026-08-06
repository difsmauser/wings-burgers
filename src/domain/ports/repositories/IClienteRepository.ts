import { Cliente } from '@/shared/domain-types';
import { FiltroCliente } from '@/shared/types';

/**
 * Puerto de repositorio para la entidad Cliente.
 * Define las operaciones de persistencia disponibles para clientes.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IClienteRepository {
  /**
   * Crea un nuevo cliente en el sistema.
   * @param cliente - Datos del cliente a crear
   * @returns El cliente creado con su identificador asignado
   */
  crear(cliente: Cliente): Promise<Cliente>;

  /**
   * Obtiene un cliente por su número de teléfono.
   * Útil para identificar clientes existentes y evitar duplicados.
   * @param telefono - Número de teléfono (10 dígitos)
   * @returns El cliente encontrado o null si no existe
   */
  obtenerPorTelefono(telefono: string): Promise<Cliente | null>;

  /**
   * Obtiene un cliente por su identificador único.
   * @param id - Identificador único del cliente
   * @returns El cliente encontrado o null si no existe
   */
  obtenerPorId(id: string): Promise<Cliente | null>;

  /**
   * Lista clientes con filtros opcionales.
   * Permite filtrar por nombre, número de pedidos y monto total.
   * @param filtros - Criterios de filtrado
   * @returns Lista de clientes que cumplen los filtros
   */
  listar(filtros: FiltroCliente): Promise<Cliente[]>;
}
