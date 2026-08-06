import { describe, it, expect } from 'vitest';
import { handleApiError } from './errorHandler';
import {
  ValidacionError,
  RecursoNoEncontradoError,
  TransicionEstadoInvalidaError,
  ProductoNoDisponibleError,
  ServicioExternoError,
} from '@/shared/errors';

describe('handleApiError', () => {
  it('mapea ValidacionError a 400 con campos', async () => {
    const error = new ValidacionError('Datos inválidos', ['nombre', 'precio']);
    const response = handleApiError(error);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDACION_ERROR');
    expect(body.error.message).toBe('Datos inválidos');
    expect(body.error.campos).toEqual(['nombre', 'precio']);
  });

  it('mapea RecursoNoEncontradoError a 404', async () => {
    const error = new RecursoNoEncontradoError('Producto', 'abc-123');
    const response = handleApiError(error);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('RECURSO_NO_ENCONTRADO');
    expect(body.error.message).toContain('abc-123');
  });

  it('mapea TransicionEstadoInvalidaError a 422', async () => {
    const error = new TransicionEstadoInvalidaError('recibido', 'entregado');
    const response = handleApiError(error);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe('TRANSICION_ESTADO_INVALIDA');
  });

  it('mapea ProductoNoDisponibleError a 409', async () => {
    const error = new ProductoNoDisponibleError('prod-1');
    const response = handleApiError(error);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe('PRODUCTO_NO_DISPONIBLE');
  });

  it('mapea ServicioExternoError a 502', async () => {
    const error = new ServicioExternoError('WhatsApp', 'timeout');
    const response = handleApiError(error);

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe('SERVICIO_EXTERNO_ERROR');
    expect(body.error.message).toContain('WhatsApp');
  });

  it('mapea errores desconocidos a 500', async () => {
    const error = new Error('algo salió mal');
    const response = handleApiError(error);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('ERROR_INTERNO');
    expect(body.error.message).toBe('Ha ocurrido un error interno del servidor');
  });

  it('maneja errores no-Error (string, null, etc) como 500', async () => {
    const response = handleApiError('string error');

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('ERROR_INTERNO');
  });
});
