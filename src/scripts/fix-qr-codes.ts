import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }
if (!supabaseUrl) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL required'); process.exit(1); }

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  console.log('🔧 Sincronizando QR codes de mesas...\n');

  // First, let's see what's currently in qr_mesa
  const { data: existingQr } = await supabase.from('qr_mesa').select('codigo, mesa_zona, activo');
  console.log('QR codes actuales en la tabla:');
  existingQr?.forEach(q => console.log(`  - ${q.codigo} → ${q.mesa_zona} (activo: ${q.activo})`));

  // Get all mesas
  const { data: mesas } = await supabase.from('mesa').select('nombre, zona').eq('activa', true);
  
  if (!mesas || mesas.length === 0) {
    console.log('\n❌ No hay mesas activas.');
    return;
  }

  console.log(`\n${mesas.length} mesas encontradas. Generando QR codes...\n`);

  // Delete all existing QR codes and recreate
  await supabase.from('qr_mesa').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  for (const mesa of mesas) {
    const codigo = mesa.nombre.replace(/\s+/g, '-').toUpperCase();
    const { error } = await supabase.from('qr_mesa').insert({
      codigo,
      mesa_zona: `${mesa.nombre} - ${mesa.zona}`,
      activo: true,
    });

    if (error) {
      console.log(`  ✗ ${mesa.nombre} (${codigo}): ${error.message}`);
    } else {
      console.log(`  ✓ ${mesa.nombre} → código: ${codigo}`);
      console.log(`    URL: http://localhost:3000/menu?qr=${codigo}`);
    }
  }

  // Verify
  console.log('\n📋 Verificación final:');
  const { data: finalQr } = await supabase.from('qr_mesa').select('codigo, mesa_zona, activo');
  finalQr?.forEach(q => console.log(`  ✓ ${q.codigo} → ${q.mesa_zona}`));

  console.log('\n✅ QR codes sincronizados. Prueba los links ahora.');
}

main().catch(console.error);
