import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email y contraseña son requeridos' } },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Sign in with Supabase Auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: { message: 'Credenciales inválidas. Verifica tu correo y contraseña.' } },
        { status: 401 }
      );
    }

    // Get user role from usuario table
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData } = await adminClient
      .from('usuario')
      .select('rol, nombre, activo')
      .eq('id', authData.user.id)
      .single();

    if (!userData || !userData.activo) {
      return NextResponse.json(
        { error: { message: 'Usuario desactivado. Contacta al administrador.' } },
        { status: 403 }
      );
    }

    // Set auth cookies
    const response = NextResponse.json({
      data: {
        userId: authData.user.id,
        email: authData.user.email,
        nombre: userData.nombre,
        rol: userData.rol,
      },
    });

    // Set access token cookie
    response.cookies.set('sb-access-token', authData.session!.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Set refresh token cookie
    response.cookies.set('sb-refresh-token', authData.session!.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { message: 'Error interno del servidor' } },
      { status: 500 }
    );
  }
}
