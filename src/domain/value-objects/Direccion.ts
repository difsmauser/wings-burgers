import { ValidacionError } from '@/shared/errors';

/**
 * Value Object inmutable que representa una dirección de entrega.
 * Máximo 200 caracteres.
 */
export class Direccion {
  private constructor(readonly valor: string) {}

  static crear(valor: string): Direccion {
    const trimmed = valor.trim();
    if (trimmed.length === 0) {
      throw new ValidacionError(
        'La dirección no puede estar vacía',
        ['direccion']
      );
    }
    if (trimmed.length > 200) {
      throw new ValidacionError(
        `La dirección excede el máximo de 200 caracteres (tiene ${trimmed.length})`,
        ['direccion']
      );
    }
    return new Direccion(trimmed);
  }

  esIgual(otra: Direccion): boolean {
    return this.valor === otra.valor;
  }
}
