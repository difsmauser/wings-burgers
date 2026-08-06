// Domain Ports - Hexagonal Architecture
// Interfaces que definen la comunicación entre el dominio y los adaptadores externos

export type {
  IProductoRepository,
  IPedidoRepository,
  IClienteRepository,
  IInventarioRepository,
  IGastoRepository,
} from './repositories';

export type {
  IPagoGateway,
  IMensajeriaService,
  INotificacionService,
  IStorageService,
  IGeolocalizacionService,
} from './services';
