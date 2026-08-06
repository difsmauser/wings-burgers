import { describe, it, expect } from 'vitest';
import { Cliente } from './Cliente';
import { ValidacionError, TelefonoInvalidoError } from '@/shared/errors';

describe('Cliente', () => {
  const propsValidas = {
    id: 'cli-1',
    nombre: 'Juan Pérez',
    telefono: '5512345678',
  };

  describe('crear', () => {
    it('crea un cliente con datos mínimos (nombre + teléfono)', () => {
      const cliente = Cliente.crear(propsValidas);
      expect(cliente.id).toBe('cli-1');
      expect(cliente.nombre).toBe('Juan Pérez');
      expect(cliente.telefono.valor).toBe('5512345678');
      expect(cliente.email).toBeNull();
      expect(cliente.direccion).toBeNull();
    });

    it('crea un cliente con todos los campos', () => {
      const cliente = Cliente.crear({
        ...propsValidas,
        email: 'juan@example.com',
        direccion: 'Calle 123, Col. Centro',
      });
      expect(cliente.email).toBe('juan@example.com');
      expect(cliente.direccion?.valor).toBe('Calle 123, Col. Centro');
    });

    it('rechaza nombre vacío', () => {
      expect(() => Cliente.crear({ ...propsValidas, nombre: '' }))
        .toThrow(ValidacionError);
    });

    it('rechaza nombre mayor a 100 caracteres', () => {
      expect(() => Cliente.crear({ ...propsValidas, nombre: 'x'.repeat(101) }))
        .toThrow(ValidacionError);
    });

    it('rechaza teléfono vacío', () => {
      expect(() => Cliente.crear({ ...propsValidas, telefono: '' }))
        .toThrow(ValidacionError);
    });

    it('rechaza teléfono con menos de 10 dígitos', () => {
      expect(() => Cliente.crear({ ...propsValidas, telefono: '12345' }))
        .toThrow(TelefonoInvalidoError);
    });

    it('limpia caracteres no numéricos del teléfono', () => {
      const cliente = Cliente.crear({ ...propsValidas, telefono: '(55) 1234-5678' });
      expect(cliente.telefono.valor).toBe('5512345678');
    });

    it('maneja email null como opcional', () => {
      const cliente = Cliente.crear({ ...propsValidas, email: null });
      expect(cliente.email).toBeNull();
    });

    it('maneja dirección null como opcional', () => {
      const cliente = Cliente.crear({ ...propsValidas, direccion: null });
      expect(cliente.direccion).toBeNull();
    });
  });
});
