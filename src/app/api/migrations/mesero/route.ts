export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/adapters/driven/persistence/supabase/SupabaseClient';

/**
 * GET /api/migrations/mesero
 * Adds mesero_id and mesero_nombre columns to the pedido table.
 * Safe to run multiple times (uses IF NOT EXISTS logic).
 * Run once to set up the mesero module.
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Add mesero_id column if not exists
    const { error: err1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_id TEXT DEFAULT NULL;`
    }).single();

    // Add mesero_nombre column if not exists
    const { error: err2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_nombre TEXT DEFAULT NULL;`
    }).single();

    // If RPC doesn't exist, try raw query approach
    if (err1 || err2) {
      // Fallback: attempt direct column additions via a dummy update
      // The columns may already exist from manual creation
      return NextResponse.json({
        message: 'Migration may need manual execution. Run in Supabase SQL Editor:',
        sql: [
          'ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_id TEXT DEFAULT NULL;',
          'ALTER TABLE pedido ADD COLUMN IF NOT EXISTS mesero_nombre TEXT DEFAULT NULL;',
        ],
        errors: [err1?.message, err2?.message].filter(Boolean),
      });
    }

    return NextResponse.json({ message: 'Migration successful', columns_added: ['mesero_id', 'mesero_nombre'] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
