import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 * Autentica usuario contra Supabase Auth y retorna sesión con cookies.
 */
export async function POST(request: NextRequest) {
  // 1. Parse body
  let email: string;
  let password: string;

  try {
    const body = await request.json();
    email = body.email;
    password = body.password;
  } catch {
    return NextResponse.json(
      { error: { message: 'Body JSON inválido' } },
      { status: 400 }
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: { message: 'Email y contraseña son requeridos' } },
      { status: 400 }
    );
  }

  // 2. Check env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: { message: 'Error de configuración del servidor. Contacta al administrador.' } },
      { status: 500 }
    );
  }

  // 3. Authenticate with Supabase
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return NextResponse.json(
        { error: { message: 'Credenciales inválidas. Verifica tu correo y contraseña.' } },
        { status: 401 }
      );
    }

    // 4. Get user role
    const dbKey = serviceRoleKey || supabaseAnonKey;
    const dbClient = createClient(supabaseUrl, dbKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData } = await dbClient
      .from('usuario')
      .select('rol, nombre, activo')
      .eq('id', authData.user.id)
      .single();

    const rol = userData?.rol || 'cliente';
    const nombre = userData?.nombre || email.split('@')[0];

    if (userData && userData.activo === false) {
      return NextResponse.json(
        { error: { message: 'Usuario desactivado.' } },
        { status: 403 }
      );
    }

    // 5. Set cookies and respond
    const response = NextResponse.json({
      data: {
        userId: authData.user.id,
        email: authData.user.email,
        nombre,
        rol,
      },
    });

    response.cookies.set('sb-access-token', authData.session.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    response.cookies.set('sb-refresh-token', authData.session.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 604800,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: { message: 'Error del servidor al procesar login. Intenta de nuevo.' } },
      { status: 500 }
    );
  }
}
