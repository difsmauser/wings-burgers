import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Roles del sistema Wings & Burgers.
 */
export type Rol = 'admin' | 'vendedor' | 'cliente' | 'repartidor' | 'caja' | 'bar';

/**
 * Información del usuario autenticado.
 */
export interface UsuarioSesion {
  id: string;
  email: string;
  rol: Rol;
  nombre: string;
}

/**
 * Crea un cliente Supabase server-side que maneja cookies de autenticación.
 * Se usa en Server Components, API Routes y middleware.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Obtiene la sesión actual del usuario server-side.
 * Lee el token de la cookie o header Authorization.
 * Retorna null si no hay sesión válida.
 */
export async function getServerSession(
  accessToken?: string
): Promise<UsuarioSesion | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  // Obtener rol desde la tabla usuario
  const rol = await getUserRole(user.id, client);
  if (!rol) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? '',
    rol: rol.rol,
    nombre: rol.nombre,
  };
}

/**
 * Obtiene el rol del usuario desde la tabla `usuario`.
 */
export async function getUserRole(
  userId: string,
  client?: SupabaseClient
): Promise<{ rol: Rol; nombre: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Usar service role para leer la tabla usuario sin restricciones RLS
  const supabase =
    client ??
    createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  const { data, error } = await supabase
    .from('usuario')
    .select('rol, nombre')
    .eq('id', userId)
    .eq('activo', true)
    .single();

  if (error || !data) {
    return null;
  }

  return { rol: data.rol as Rol, nombre: data.nombre };
}

/**
 * Rutas públicas que no requieren autenticación.
 */
export const PUBLIC_ROUTES = [
  '/login',
  '/registro',
  '/api/webhooks',
  '/api/qr',
];

/**
 * Mapa de rutas protegidas por rol.
 * Las rutas del grupo (cliente) son públicas (cualquier usuario autenticado o anónimo).
 */
export const ROLE_ROUTES: Record<string, Rol[]> = {
  '/admin': ['admin'],
  '/(vendedor)': ['admin', 'vendedor'],
  '/(repartidor)': ['admin', 'repartidor'],
  '/mesero': ['admin', 'vendedor'],
  '/caja': ['admin', 'caja'],
};

/**
 * Verifica si una ruta es pública (no requiere autenticación).
 */
export function isPublicRoute(pathname: string): boolean {
  // Rutas explícitamente públicas
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return true;
  }

  // Rutas del módulo cliente son públicas
  if (pathname.startsWith('/(cliente)') || pathname.startsWith('/menu') || pathname.startsWith('/pedido') || pathname.startsWith('/pago') || pathname.startsWith('/rastreo')) {
    return true;
  }

  // Archivos estáticos y Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return true;
  }

  return false;
}

/**
 * Obtiene los roles permitidos para una ruta dada.
 * Retorna null si la ruta no tiene restricción de rol.
 */
export function getRolesForRoute(pathname: string): Rol[] | null {
  for (const [routePrefix, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      return roles;
    }
  }
  return null;
}
