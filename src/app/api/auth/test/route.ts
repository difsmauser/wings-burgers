import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/test
 * Tests Supabase Auth sign-in directly with fetch to diagnose issues.
 */
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Direct HTTP call to Supabase Auth (no SDK)
  const authResponse = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const authBody = await authResponse.json();

  if (!authResponse.ok) {
    return NextResponse.json({
      error: 'Auth failed',
      status: authResponse.status,
      supabaseError: authBody,
      debug: {
        url: `${supabaseUrl}/auth/v1/token?grant_type=password`,
        email,
        anonKeyPrefix: supabaseAnonKey.substring(0, 20),
      }
    }, { status: authResponse.status });
  }

  return NextResponse.json({
    success: true,
    userId: authBody.user?.id,
    email: authBody.user?.email,
    hasAccessToken: !!authBody.access_token,
  });
}
