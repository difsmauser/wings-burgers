import { TelefonoInvalidoError } from '@/shared/errors';

/**
 * Value Object inmutable que representa un número de teléfono de 10 dígitos.
 * Limpia caracteres no numéricos antes de validar.
 */
export class Telefono {
  private constructor(readonly valor: string) {}

  static crear(valor: string): Telefono {
    const limpio = valor.replace(/\D/g, '');
    if (limpio.length !== 10) {
      throw new TelefonoInvalidoError(valor);
    }
    return new Telefono(limpio);
  }

  esIgual(otro: Telefono): boolean {
    return this.valor === otro.valor;
  }
}
