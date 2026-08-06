/**
 * Datos de entrega para persistencia.
 */
export interface EntregaData {
  id: string;
  pedidoId: string;
  repartidorId: string;
  estado: string;
  motivoNoEntrega?: string | null;
  aceptadaEn?: Date | null;
  completadaEn?: Date | null;
  creadoEn: Date;
}

/**
 * Puerto de repositorio para la entidad Entrega.
 * Define las operaciones de persistencia disponibles para entregas.
 * Los adaptadores de infraestructura implementan esta interfaz.
 */
export interface IEntregaRepository {
  /**
   * Obtiene una entrega por su identificador único.
   * @param id - Identificador único de la entrega
   * @returns Los datos de la entrega o null si no existe
   */
  obtenerPorId(id: string): Promise<EntregaData | null>;

  /**
   * Cuenta las entregas activas (EN_CAMINO) de un repartidor.
   * @param repartidorId - Identificador del repartidor
   * @returns Número de entregas activas
   */
  contarActivasPorRepartidor(repartidorId: string): Promise<number>;

  /**
   * Persiste los cambios de una entrega.
   * @param entrega - Datos de la entrega a actualizar
   */
  actualizar(entrega: EntregaData): Promise<void>;

  /**
   * Lista entregas pendientes disponibles para repartidores.
   * @returns Lista de entregas en estado PENDIENTE
   */
  listarPendientes(): Promise<EntregaData[]>;
}
