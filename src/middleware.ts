import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Roles del sistema.
 */
type Rol = 'admin' | 'vendedor' | 'cliente' | 'repartidor' | 'caja';

/**
 * Rutas públicas que no requieren autenticación.
 */
const PUBLIC_PATHS = [
  '/login',
  '/registro',
  '/api/webhooks/',
  '/api/qr/',
  '/api/productos',       // Menu needs to load products without auth
  '/api/pedidos',         // Client creates orders
  '/api/notificaciones',  // Push subscription
  '/_next',
  '/favicon',
];

/**
 * Rutas protegidas por rol.
 * El path key usa el prefijo real que Next.js genera para route groups.
 */
const ROLE_PROTECTED_PATHS: { prefix: string; roles: Rol[] }[] = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/pedidos', roles: ['admin', 'vendedor'] },
  { prefix: '/caja', roles: ['admin', 'caja'] },
  { prefix: '/entregas', roles: ['admin', 'repartidor'] },
];

/**
 * Verifica si la ruta es pública (no requiere autenticación).
 */
function isPublicPath(pathname: string): boolean {
  // Static files and assets
  if (pathname.includes('.') && !pathname.startsWith('/api')) {
    return true;
  }

  // API routes handle their own authentication internally
  // (via verificarAutenticacion for POST/PUT/DELETE operations)
  if (pathname.startsWith('/api/')) {
    return true;
  }

  // Explicitly public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return true;
  }

  // Client module routes are public (no login required)
  if (
    pathname.startsWith('/menu') ||
    pathname === '/pedido' ||
    pathname.startsWith('/pago') ||
    pathname.startsWith('/rastreo') ||
    pathname.startsWith('/mesero') ||
    pathname.startsWith('/demo')
  ) {
    return true;
  }

  // Home page
  if (pathname === '/') {
    return true;
  }

  return false;
}

/**
 * Obtiene los roles requeridos para una ruta, si aplica.
 */
function getRequiredRoles(pathname: string): Rol[] | null {
  for (const { prefix, roles } of ROLE_PROTECTED_PATHS) {
    if (pathname.startsWith(prefix)) {
      return roles;
    }
  }
  return null;
}

/**
 * Next.js Middleware para protección de rutas.
 *
 * - Rutas públicas: acceso sin autenticación
 * - Rutas protegidas por rol: verifica sesión + rol del usuario
 * - Usuarios no autenticados: redirige a /login
 * - Usuarios sin rol adecuado: redirige a /login con error
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas no requieren verificación
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Obtener token de autenticación
  const accessToken =
    request.cookies.get('sb-access-token')?.value ??
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!accessToken) {
    // No hay sesión, redirigir a login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar sesión con Supabase
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
    // Sesión inválida, redirigir a login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    return response;
  }

  // Verificar rol si la ruta está protegida por rol
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles) {
    // Obtener rol del usuario desde la tabla usuario usando service role
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData } = await adminClient
      .from('usuario')
      .select('rol')
      .eq('id', user.id)
      .eq('activo', true)
      .single();

    if (!userData || !requiredRoles.includes(userData.rol as Rol)) {
      // No tiene el rol necesario
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'no_autorizado');
      return NextResponse.redirect(loginUrl);
    }
  }

  // Autenticación y autorización exitosas
  return NextResponse.next();
}

/**
 * Configuración del matcher para el middleware.
 * Excluye archivos estáticos y la carpeta _next.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public files (images, icons, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
