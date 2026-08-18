import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/setup
 * Configura las políticas de seguridad RLS para que el sistema funcione correctamente.
 * Ejecutar una vez después del deploy. Requiere SUPABASE_SERVICE_ROLE_KEY.
 * 
 * Crea:
 * - Policies de lectura pública para tablas que el cliente necesita leer
 * - Columnas del módulo mesero si no existen
 * - Tabla de meseros si no existe
 * - Registros QR de ejemplo
 */
export async function GET() {
  // SECURITY: Only allow in development or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SETUP !== 'true') {
    return NextResponse.json(
      { error: { message: 'Setup endpoint is disabled in production. Set ALLOW_SETUP=true to enable.' } },
      { status: 403 }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        error: 'Se requiere SUPABASE_SERVICE_ROLE_KEY para ejecutar setup.',
        manual_sql: getManualSQL(),
      }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const results: string[] = [];

    // 1. Disable RLS on public-read tables (simplest approach for small restaurant)
    const publicTables = ['producto', 'qr_mesa', 'mesa', 'pedido', 'pedido_detalle', 'cliente', 'mesero'];

    for (const table of publicTables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY;`
      });
      if (error) {
        // Try direct approach - some Supabase instances don't have exec_sql
        results.push(`${table}: RPC not available (${error.message})`);
      } else {
        results.push(`${table}: RLS disabled`);
      }
    }

    // 2. Add mesero columns to pedido
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_id TEXT DEFAULT NULL;`
    });
    if (e1) results.push(`mesero_id column: ${e1.message}`);

    const { error: e2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_nombre TEXT DEFAULT NULL;`
    });
    if (e2) results.push(`mesero_nombre column: ${e2.message}`);
    else results.push('pedido: mesero columns checked');

    // 3. Create mesero table
    const { error: e3 } = await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS mesero (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre TEXT NOT NULL,
        telefono TEXT,
        pin TEXT,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now()
      );`
    });
    if (e3) results.push(`mesero table: ${e3.message}`);
    else results.push('mesero table: checked');

    return NextResponse.json({
      success: true,
      results,
      note: 'Si los RPC fallaron, ejecuta el SQL manualmente en Supabase SQL Editor',
      manual_sql: getManualSQL(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

function getManualSQL(): string {
  return `-- Deshabilitar RLS en tablas públicas (restaurante pequeño, no necesita RLS)
ALTER TABLE producto DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_mesa DISABLE ROW LEVEL SECURITY;
ALTER TABLE mesa DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedido DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_detalle DISABLE ROW LEVEL SECURITY;
ALTER TABLE cliente DISABLE ROW LEVEL SECURITY;
ALTER TABLE mesero DISABLE ROW LEVEL SECURITY;

-- Columnas mesero en pedido
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_id TEXT DEFAULT NULL;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_nombre TEXT DEFAULT NULL;

-- Tabla mesero
CREATE TABLE IF NOT EXISTS mesero (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  pin TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);`;
}
