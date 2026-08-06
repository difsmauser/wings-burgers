import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { verificarAutenticacion, verificarRol } from './auth';
import type { UsuarioAutenticado } from './auth';

function crearRequest(headers: Record<string, string> = {}): NextRequest {
  const headerEntries = Object.entries(headers);
  const headersInit = new Headers();
  headerEntries.forEach(([key, value]) => headersInit.set(key, value));

  return new NextRequest('http://localhost:3000/api/test', {
    headers: headersInit,
  });
}

describe('verificarAutenticacion', () => {
  it('retorna autenticado=false si no hay token ni headers de desarrollo', async () => {
    const request = crearRequest({});
    const result = await verificarAutenticacion(request);

    expect(result.autenticado).toBe(false);
    if (!result.autenticado) {
      expect(result.respuesta.status).toBe(401);
    }
  });

  it('retorna autenticado=true con usuario cuando headers de desarrollo están presentes', async () => {
    const request = crearRequest({
      'x-user-id': 'user-123',
      'x-user-rol': 'admin',
      'x-user-nombre': 'Juan Admin',
    });
    const result = await verificarAutenticacion(request);

    expect(result.autenticado).toBe(true);
    if (result.autenticado) {
      expect(result.usuario.id).toBe('user-123');
      expect(result.usuario.rol).toBe('admin');
      expect(result.usuario.nombre).toBe('Juan Admin');
    }
  });

  it('usa nombre por defecto si x-user-nombre no está presente (modo dev)', async () => {
    const request = crearRequest({
      'x-user-id': 'user-123',
      'x-user-rol': 'vendedor',
    });
    const result = await verificarAutenticacion(request);

    expect(result.autenticado).toBe(true);
    if (result.autenticado) {
      expect(result.usuario.nombre).toBe('Usuario');
    }
  });

  it('retorna autenticado=false si solo tiene x-user-id sin x-user-rol', async () => {
    const request = crearRequest({ 'x-user-id': 'user-1' });
    const result = await verificarAutenticacion(request);

    expect(result.autenticado).toBe(false);
    if (!result.autenticado) {
      expect(result.respuesta.status).toBe(401);
    }
  });

  it('retorna autenticado=false si solo tiene x-user-rol sin x-user-id', async () => {
    const request = crearRequest({ 'x-user-rol': 'admin' });
    const result = await verificarAutenticacion(request);

    expect(result.autenticado).toBe(false);
    if (!result.autenticado) {
      expect(result.respuesta.status).toBe(401);
    }
  });
});

describe('verificarRol', () => {
  const usuario: UsuarioAutenticado = {
    id: 'user-1',
    rol: 'vendedor',
    nombre: 'Test',
  };

  it('retorna null cuando el rol del usuario está en los permitidos', () => {
    const result = verificarRol(usuario, ['vendedor', 'admin']);
    expect(result).toBeNull();
  });

  it('retorna respuesta 403 cuando el rol no está en los permitidos', () => {
    const result = verificarRol(usuario, ['admin']);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it('retorna null cuando se permite cualquier rol que incluya el del usuario', () => {
    const admin: UsuarioAutenticado = { id: '1', rol: 'admin', nombre: 'A' };
    expect(verificarRol(admin, ['admin'])).toBeNull();

    const cliente: UsuarioAutenticado = { id: '2', rol: 'cliente', nombre: 'C' };
    expect(verificarRol(cliente, ['cliente', 'vendedor'])).toBeNull();
  });
});
