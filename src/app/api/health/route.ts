import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Health check que muestra si las variables de entorno están disponibles.
 * NO expone valores, solo confirma presencia.
 */
export async function GET() {
  const checks = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    url_prefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'NOT SET',
    anon_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'NOT SET',
    service_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'NOT SET',
  };

  const allGood = checks.NEXT_PUBLIC_SUPABASE_URL && checks.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    status: allGood ? 'healthy' : 'misconfigured',
    checks,
    timestamp: new Date().toISOString(),
  }, { status: allGood ? 200 : 503 });
}
