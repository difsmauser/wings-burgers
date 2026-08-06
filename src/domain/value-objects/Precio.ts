import {
  PrecioFueraDeRangoError,
  PrecioDecimalesInvalidosError,
} from '@/shared/errors';

/**
 * Cuenta la cantidad de decimales de un número.
 */
function decimalPlaces(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const str = n.toString();
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return 0;
  return str.length - dotIndex - 1;
}

/**
 * Value Object inmutable que representa un precio válido.
 * Rango permitido: 0.01 - 99,999.99 con máximo 2 decimales.
 */
export class Precio {
  private constructor(readonly valor: number) {}

  static crear(valor: number): Precio {
    if (!Number.isFinite(valor) || decimalPlaces(valor) > 2) {
      throw new PrecioDecimalesInvalidosError(valor);
    }
    if (valor < 0.01 || valor > 99_999.99) {
      throw new PrecioFueraDeRangoError(valor);
    }
    return new Precio(valor);
  }

  sumar(otro: Precio): Precio {
    return Precio.crear(
      Math.round((this.valor + otro.valor) * 100) / 100
    );
  }

  multiplicar(factor: number): Precio {
    return Precio.crear(
      Math.round(this.valor * factor * 100) / 100
    );
  }

  esIgual(otro: Precio): boolean {
    return this.valor === otro.valor;
  }
}
