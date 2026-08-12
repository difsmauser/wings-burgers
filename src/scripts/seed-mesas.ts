import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://evhyieblmtivcnfqxwxc.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('🪑 Creando mesas iniciales...');

  // Insert initial mesas (5 interior + 3 terraza + 2 barra)
  const mesas = [
    { nombre: 'Mesa 1', zona: 'Interior', capacidad: 4, pos_x: 10, pos_y: 10, estado: 'disponible', activa: true },
    { nombre: 'Mesa 2', zona: 'Interior', capacidad: 4, pos_x: 30, pos_y: 10, estado: 'disponible', activa: true },
    { nombre: 'Mesa 3', zona: 'Interior', capacidad: 6, pos_x: 50, pos_y: 10, estado: 'disponible', activa: true },
    { nombre: 'Mesa 4', zona: 'Interior', capacidad: 4, pos_x: 10, pos_y: 40, estado: 'disponible', activa: true },
    { nombre: 'Mesa 5', zona: 'Interior', capacidad: 4, pos_x: 30, pos_y: 40, estado: 'disponible', activa: true },
    { nombre: 'Terraza 1', zona: 'Terraza', capacidad: 4, pos_x: 70, pos_y: 10, estado: 'disponible', activa: true },
    { nombre: 'Terraza 2', zona: 'Terraza', capacidad: 4, pos_x: 70, pos_y: 30, estado: 'disponible', activa: true },
    { nombre: 'Terraza 3', zona: 'Terraza', capacidad: 6, pos_x: 70, pos_y: 50, estado: 'disponible', activa: true },
    { nombre: 'Barra 1', zona: 'Barra', capacidad: 2, pos_x: 10, pos_y: 70, estado: 'disponible', activa: true },
    { nombre: 'Barra 2', zona: 'Barra', capacidad: 2, pos_x: 30, pos_y: 70, estado: 'disponible', activa: true },
  ];

  const { data, error } = await supabase.from('mesa').insert(mesas).select();

  if (error) {
    if (error.message.includes('relation "mesa" does not exist')) {
      console.error('❌ La tabla "mesa" no existe. Ejecuta el SQL primero en Supabase SQL Editor.');
      console.log('\nSQL a ejecutar:');
      console.log(`
CREATE TABLE IF NOT EXISTS mesa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  zona TEXT NOT NULL DEFAULT 'Interior',
  capacidad INTEGER NOT NULL DEFAULT 4,
  pos_x NUMERIC(5,1) NOT NULL DEFAULT 0,
  pos_y NUMERIC(5,1) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupada', 'pendiente_cobro', 'reservada')),
  pedido_activo_id UUID REFERENCES pedido(id),
  activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mesa_estado ON mesa(estado);
      `);
    } else {
      console.error('Error:', error.message);
    }
  } else {
    console.log(`✓ ${data?.length} mesas creadas`);
    data?.forEach(m => console.log(`  - ${m.nombre} (${m.zona}, ${m.capacidad} personas)`));
  }

  console.log('\n✅ Listo!');
}

main().catch(console.error);
