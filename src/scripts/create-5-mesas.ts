import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }
if (!supabaseUrl) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL required'); process.exit(1); }

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  console.log('🪑 Creando 5 mesas con QR...\n');

  // First delete existing mesas
  await supabase.from('mesa').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  // Also clean existing QR codes for mesas
  await supabase.from('qr_mesa').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const mesas = [
    { nombre: 'Mesa 1', zona: 'Interior', capacidad: 4, pos_x: 15, pos_y: 25 },
    { nombre: 'Mesa 2', zona: 'Interior', capacidad: 4, pos_x: 35, pos_y: 25 },
    { nombre: 'Mesa 3', zona: 'Interior', capacidad: 6, pos_x: 55, pos_y: 25 },
    { nombre: 'Mesa 4', zona: 'Terraza', capacidad: 4, pos_x: 15, pos_y: 65 },
    { nombre: 'Mesa 5', zona: 'Terraza', capacidad: 4, pos_x: 35, pos_y: 65 },
  ];

  for (const mesa of mesas) {
    // Create mesa
    const { data, error } = await supabase.from('mesa').insert({
      ...mesa,
      estado: 'disponible',
      activa: true,
    }).select().single();

    if (error) {
      console.error(`  ✗ ${mesa.nombre}: ${error.message}`);
      continue;
    }

    // Create QR code entry
    const qrCodigo = mesa.nombre.replace(/\s+/g, '-').toUpperCase();
    await supabase.from('qr_mesa').upsert({
      codigo: qrCodigo,
      mesa_zona: `${mesa.nombre} - ${mesa.zona}`,
      activo: true,
    }, { onConflict: 'codigo' });

    console.log(`  ✓ ${mesa.nombre} (${mesa.zona}, ${mesa.capacidad}p)`);
    console.log(`    QR: http://localhost:3000/menu?qr=${qrCodigo}`);
  }

  console.log('\n📋 Links QR para pruebas:');
  console.log('─────────────────────────────────────────────');
  mesas.forEach(m => {
    const qr = m.nombre.replace(/\s+/g, '-').toUpperCase();
    console.log(`  ${m.nombre}: http://localhost:3000/menu?qr=${qr}`);
  });
  console.log('─────────────────────────────────────────────');
  console.log('\n✅ Listo! Escanea o abre estos links para probar.');
}

main().catch(console.error);
