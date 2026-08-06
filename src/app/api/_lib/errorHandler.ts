import { NextResponse } from 'next/server';
import { DomainError, ValidacionError } from '@/shared/errors';

/**
 * Respuesta de error estándar para las API Routes.
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    campos?: string[];
  };
}

/**
 * Respuesta de éxito estándar para las API Routes.
 */
export interface SuccessResponse<T = unknown> {
  data: T;
}

/**
 * Maneja errores de dominio y genéricos, retornando una respuesta HTTP apropiada.
 * Mapea DomainError a su statusCode correspondiente; errores desconocidos retornan 500.
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof ValidacionError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, campos: error.campos } },
      { status: error.statusCode }
    );
  }

  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }

  console.error('Error no manejado en API:', error);

  return NextResponse.json(
    { error: { code: 'ERROR_INTERNO', message: 'Ha ocurrido un error interno del servidor' } },
    { status: 500 }
  );
}

/**
 * Alias para compatibilidad con el index.
 */
export const handleError = handleApiError;

/**
 * Helper para crear respuestas de éxito JSON.
 */
export function successResponse<T>(data: T, status = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ data }, { status });
}
