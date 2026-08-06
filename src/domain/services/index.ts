// Domain Services - Business logic that spans multiple entities
export { PrecioService } from './PrecioService';
export { InventarioService } from './InventarioService';
export {
  CorteService,
  type TipoCorte,
  type ProductoVendido,
  type DesgloseItem,
  type Corte,
  type PedidoData,
  type GastoData,
} from './CorteService';
export {
  filtrarGastos,
  type GastoFiltrable,
  type FiltroGasto,
} from './FiltrarGastosService';
