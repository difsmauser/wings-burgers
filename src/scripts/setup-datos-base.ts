/**
 * SETUP DATOS BASE — Script único y definitivo para crear datos iniciales.
 * 
 * Crea: 5 mesas con QR codes, 3 meseros con PIN, 2 repartidores.
 * NO toca productos ni categorías.
 * Seguro de ejecutar múltiples veces (limpia antes de crear).
 * 
 * Ejecutar:
 *   npx tsx src/scripts/setup-datos-base.ts
 * 
 * Requiere env vars ya cargadas en .env.local o exportadas manualmente.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey || !supabaseUrl) {
  console.error('❌ Env vars required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DUMMY_ID = '00000000-0000-0000-0000-000000000000';

// Helper: genera código QR a partir del nombre de mesa
// Produce formato: MESA-1, MESA-2, etc. (sin espacios, URL-safe)
function generarCodigoQR(nombreMesa: string): string {
  return nombreMesa.replace(/\s+/g, '-').toUpperCase();
}

// ─── DATOS ────────────────────────────────────────────────────────────────────

const MESAS = [
  { nombre: 'Mesa 1', zona: 'Interior', capacidad: 4, pos_x: 15, pos_y: 25 },
  { nombre: 'Mesa 2', zona: 'Interior', capacidad: 4, pos_x: 35, pos_y: 25 },
  { nombre: 'Mesa 3', zona: 'Terraza', capacidad: 6, pos_x: 55, pos_y: 25 },
  { nombre: 'Mesa 4', zona: 'Terraza', capacidad: 4, pos_x: 15, pos_y: 65 },
  { nombre: 'Mesa 5', zona: 'Bar', capacidad: 2, pos_x: 35, pos_y: 65 },
];

const MESEROS = [
  { nombre: 'Carlos', telefono: '5512345678', pin: '1234', activo: true },
  { nombre: 'María', telefono: '5598765432', pin: '5678', activo: true },
  { nombre: 'Pedro', telefono: '5511223344', pin: '0000', activo: true },
];

const REPARTIDORES = [
  { nombre: 'Jorge Ramírez', telefono: '5551112222', vehiculo: 'Moto Honda', activo: true },
  { nombre: 'Ana García', telefono: '5553334444', vehiculo: 'Moto Italika', activo: true },
];

// ─── EJECUCIÓN ────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Setup Datos Base — A-la Burguer        ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ── Limpiar datos existentes (orden FK-safe) ──
  console.log('🧹 Limpiando datos previos...');
  await supabase.from('mesa').update({ estado: 'disponible', pedido_activo_id: null }).neq('id', DUMMY_ID);
  await supabase.from('pedido_detalle').delete().neq('id', DUMMY_ID);
  await supabase.from('pedido').delete().neq('id', DUMMY_ID);
  await supabase.from('cliente').delete().neq('id', DUMMY_ID);
  await supabase.from('qr_mesa').delete().neq('id', DUMMY_ID);
  await supabase.from('mesa').delete().neq('id', DUMMY_ID);
  await supabase.from('mesero').delete().neq('id', DUMMY_ID);
  await supabase.from('repartidor').delete().neq('id', DUMMY_ID);
  await supabase.from('articulo_inventario').delete().neq('id', DUMMY_ID);
  await supabase.from('gasto').delete().neq('id', DUMMY_ID);
  console.log('  ✓ Tablas limpias (productos intactos)\n');

  // ── Crear Mesas + QR Codes ──
  console.log('🪑 Creando mesas...');
  for (const mesa of MESAS) {
    const { data, error } = await supabase.from('mesa').insert({
      ...mesa,
      estado: 'disponible',
      activa: true,
    }).select().single();

    if (error) { console.log(`  ✗ ${mesa.nombre}: ${error.message}`); continue; }

    // Crear QR code con formato correcto (MESA-1, MESA-2, etc.)
    const qrCodigo = generarCodigoQR(mesa.nombre);
    await supabase.from('qr_mesa').upsert({
      codigo: qrCodigo,
      mesa_zona: `${mesa.nombre} - ${mesa.zona}`,
      activo: true,
    }, { onConflict: 'codigo' });

    console.log(`  ✓ ${mesa.nombre} (${mesa.zona}) — QR: ${qrCodigo}`);
  }

  // ── Crear Meseros ──
  console.log('\n🧑‍🍳 Creando meseros...');
  for (const mesero of MESEROS) {
    const { error } = await supabase.from('mesero').insert(mesero);
    console.log(error ? `  ✗ ${mesero.nombre}: ${error.message}` : `  ✓ ${mesero.nombre} (PIN: ${mesero.pin})`);
  }

  // ── Crear Repartidores ──
  console.log('\n🛵 Creando repartidores...');
  for (const rep of REPARTIDORES) {
    const { error } = await supabase.from('repartidor').insert(rep);
    console.log(error ? `  ✗ ${rep.nombre}: ${error.message}` : `  ✓ ${rep.nombre} (${rep.vehiculo})`);
  }

  // ── Resumen ──
  console.log('\n' + '═'.repeat(44));
  console.log('✅ Setup completo. Datos creados:');
  console.log('═'.repeat(44));
  console.log(`  🪑 ${MESAS.length} mesas (QR: MESA-1 a MESA-5)`);
  console.log(`  🧑‍🍳 ${MESEROS.length} meseros (PINs: 1234, 5678, 0000)`);
  console.log(`  🛵 ${REPARTIDORES.length} repartidores`);
  console.log('═'.repeat(44));
  console.log('\n  Links QR para probar:');
  MESAS.forEach(m => {
    const qr = generarCodigoQR(m.nombre);
    console.log(`    ${m.nombre}: /menu?qr=${qr}`);
  });
}

main().catch(console.error);
