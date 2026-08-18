import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Roles disponibles en el sistema.
 */
export type Rol = 'admin' | 'vendedor' | 'cliente' | 'repartidor' | 'caja' | 'bar';

/**
 * Información del usuario autenticado extraída del contexto de autenticación.
 */
export interface UsuarioAutenticado {
  id: string;
  rol: Rol;
  nombre: string;
}

/**
 * Resultado de la verificación de autenticación.
 */
export type AuthResult =
  | { autenticado: true; usuario: UsuarioAutenticado }
  | { autenticado: false; respuesta: NextResponse };

/**
 * Middleware de autenticación para API Routes.
 *
 * Verifica la sesión del usuario mediante Supabase Auth.
 * Soporta dos métodos de autenticación:
 * 1. Cookie `sb-access-token` (para requests desde el browser)
 * 2. Header `Authorization: Bearer <token>` (para API clients)
 *
 * Fallback: headers `x-user-id` y `x-user-rol` para desarrollo/testing.
 */
export async function verificarAutenticacion(
  request: NextRequest
): Promise<AuthResult> {
  // Intentar obtener token de autenticación
  const accessToken =
    request.cookies.get('sb-access-token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '') ??
    null;

  // Fallback para desarrollo/testing: headers manuales
  // ONLY allow in development/test mode to prevent production bypass
  if (process.env.NODE_ENV !== 'production') {
    const devUserId = request.headers.get('x-user-id');
    const devUserRol = request.headers.get('x-user-rol') as Rol | null;

    if (devUserId && devUserRol) {
      return {
        autenticado: true,
        usuario: {
          id: devUserId,
          rol: devUserRol,
          nombre: request.headers.get('x-user-nombre') ?? 'Usuario',
        },
      };
    }
  }

  if (!accessToken) {
    return {
      autenticado: false,
      respuesta: NextResponse.json(
        {
          error: {
            code: 'NO_AUTENTICADO',
            message: 'Se requiere autenticación para acceder a este recurso',
          },
        },
        { status: 401 }
      ),
    };
  }

  // Verificar token con Supabase Auth
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return {
      autenticado: false,
      respuesta: NextResponse.json(
        {
          error: {
            code: 'NO_AUTENTICADO',
            message: 'Sesión inválida o expirada',
          },
        },
        { status: 401 }
      ),
    };
  }

  // Obtener rol desde la tabla usuario usando service role key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData } = await adminClient
    .from('usuario')
    .select('rol, nombre')
    .eq('id', user.id)
    .eq('activo', true)
    .single();

  if (!userData) {
    return {
      autenticado: false,
      respuesta: NextResponse.json(
        {
          error: {
            code: 'NO_AUTENTICADO',
            message: 'Usuario no encontrado o inactivo',
          },
        },
        { status: 401 }
      ),
    };
  }

  return {
    autenticado: true,
    usuario: {
      id: user.id,
      rol: userData.rol as Rol,
      nombre: userData.nombre,
    },
  };
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Retorna null si la autorización es exitosa, o un NextResponse con error 403 si no.
 */
export function verificarRol(
  usuario: UsuarioAutenticado,
  rolesPermitidos: Rol[]
): NextResponse | null {
  if (!rolesPermitidos.includes(usuario.rol)) {
    return NextResponse.json(
      {
        error: {
          code: 'NO_AUTORIZADO',
          message: `Se requiere uno de los siguientes roles: ${rolesPermitidos.join(', ')}`,
        },
      },
      { status: 403 }
    );
  }

  return null;
}


/**
 * Helper compacto: verifica autenticación + rol en una sola llamada.
 * Retorna el usuario si todo es correcto, o un NextResponse de error si no.
 * 
 * Uso:
 * ```ts
 * const auth = await requireAuth(request, ['admin', 'caja']);
 * if ('respuesta' in auth) return auth.respuesta;
 * // auth.usuario está disponible
 * ```
 */
export async function requireAuth(
  request: NextRequest,
  rolesPermitidos?: Rol[]
): Promise<{ usuario: UsuarioAutenticado } | { respuesta: NextResponse }> {
  const result = await verificarAutenticacion(request);

  if (!result.autenticado) {
    return { respuesta: result.respuesta };
  }

  if (rolesPermitidos) {
    const errorRol = verificarRol(result.usuario, rolesPermitidos);
    if (errorRol) return { respuesta: errorRol };
  }

  return { usuario: result.usuario };
}
