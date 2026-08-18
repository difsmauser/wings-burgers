/**
 * Script para poblar la base de datos con el menú real de A-la Burguer.
 * 
 * IMPORTANTE: Antes de ejecutar este script, ejecuta el siguiente SQL en Supabase SQL Editor:
 * 
 *   ALTER TABLE producto DROP CONSTRAINT IF EXISTS producto_categoria_check;
 *   ALTER TABLE producto ADD CONSTRAINT producto_categoria_check 
 *     CHECK (categoria IN ('alitas', 'hamburguesas', 'bebidas', 'combos', 'complementos', 'platillos', 'otros'));
 * 
 * Ejecutar con: 
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<tu-service-role-key>"; npx tsx src/scripts/seed-menu.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required.');
  console.error('   Uso: $env:SUPABASE_SERVICE_ROLE_KEY="<key>"; npx tsx src/scripts/seed-menu.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface ProductoSeed {
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
}

const MENU: ProductoSeed[] = [
  // === ALITAS ===
  {
    nombre: 'Boneless y Alitas (7 piezas)',
    descripcion: 'Al carbón y fritas. Sabores: BBQ, Tamarindo, Búfalo, Piña, Mango Habanero, Chipotle-naranja. Incluye aderezo Ranch y verduras (pepino, zanahoria y limón).',
    categoria: 'alitas',
    precio: 80,
  },
  {
    nombre: 'Boneless y Alitas con Papitas',
    descripcion: 'Al carbón y fritas. 7 piezas con sabor a elegir, aderezo Ranch, verduras y papas francesas.',
    categoria: 'alitas',
    precio: 95,
  },

  // === HAMBURGUESAS ===
  {
    nombre: 'Hamburguesa Sencilla',
    descripcion: 'Carne de res, jamón, queso americano, pepino, lechuga, jitomate, cátsup, mostaza.',
    categoria: 'hamburguesas',
    precio: 70,
  },
  {
    nombre: 'Hamburguesa Sencilla con Papitas',
    descripcion: 'Carne de res, jamón, queso americano, pepino, lechuga, jitomate, cátsup, mostaza. Incluye papas francesas.',
    categoria: 'hamburguesas',
    precio: 85,
  },
  {
    nombre: 'Hamburguesa Especial',
    descripcion: 'Carne de res, tocino, jamón, queso Oaxaca y americano, pepino, lechuga, jitomate, piña, cátsup, mostaza.',
    categoria: 'hamburguesas',
    precio: 95,
  },
  {
    nombre: 'Hamburguesa Especial con Papitas',
    descripcion: 'Carne de res, tocino, jamón, queso Oaxaca y americano, pepino, lechuga, jitomate, piña, cátsup, mostaza. Incluye papas francesas.',
    categoria: 'hamburguesas',
    precio: 110,
  },
  {
    nombre: 'Hamburguesa Suprema',
    descripcion: 'Carne de res, más tocino, aros de cebolla con sabor BBQ o Mango Habanero, jamón, queso Oaxaca y americano, pepino, lechuga, jitomate, piña, cátsup, mostaza.',
    categoria: 'hamburguesas',
    precio: 120,
  },
  {
    nombre: 'Hamburguesa Suprema con Papitas',
    descripcion: 'Carne de res, más tocino, aros de cebolla con sabor BBQ o Mango Habanero, jamón, queso Oaxaca y americano, pepino, lechuga, jitomate, piña, cátsup, mostaza. Incluye papas francesas.',
    categoria: 'hamburguesas',
    precio: 140,
  },

  // === COMBOS ===
  {
    nombre: 'Combo Especial',
    descripcion: 'Alitas 5pz, Boneless 5pz, Papitas, Dedos de queso 2pz, Aros de cebolla 5pz, Aderezo Ranch, Verduras (pepino, zanahoria y limón).',
    categoria: 'combos',
    precio: 170,
  },

  // === COMPLEMENTOS ===
  {
    nombre: 'Dedos de Queso (5 piezas)',
    descripcion: 'Dedos de queso crujientes, 5 piezas. Acompañados con aderezo.',
    categoria: 'complementos',
    precio: 65,
  },
  {
    nombre: 'Dedos de Queso con Papitas',
    descripcion: 'Dedos de queso crujientes 5 piezas con papas francesas.',
    categoria: 'complementos',
    precio: 75,
  },
  {
    nombre: 'Aros de Cebolla (5 piezas)',
    descripcion: 'Aros de cebolla empanizados crujientes, 5 piezas.',
    categoria: 'complementos',
    precio: 55,
  },
  {
    nombre: 'Aros de Cebolla con Papitas',
    descripcion: 'Aros de cebolla empanizados 5 piezas con papas francesas.',
    categoria: 'complementos',
    precio: 65,
  },
  {
    nombre: 'Papas a la Francesa',
    descripcion: 'Porción generosa de papas francesas crujientes.',
    categoria: 'complementos',
    precio: 45,
  },
  {
    nombre: 'Chicharrón Preparado',
    descripcion: 'Chicharrón preparado con salsa, crema, lechuga y queso.',
    categoria: 'complementos',
    precio: 40,
  },

  // === PLATILLOS ===
  {
    nombre: 'Enchiladas de Pollo',
    descripcion: 'Enchiladas rellenas de pollo con salsa, crema y queso.',
    categoria: 'platillos',
    precio: 65,
  },
  {
    nombre: 'Enchiladas de Huevo',
    descripcion: 'Enchiladas rellenas de huevo con salsa, crema y queso.',
    categoria: 'platillos',
    precio: 70,
  },
  {
    nombre: 'Enchiladas de Longaniza',
    descripcion: 'Enchiladas rellenas de longaniza con salsa, crema y queso.',
    categoria: 'platillos',
    precio: 75,
  },
  {
    nombre: 'Enchiladas de Milanesa',
    descripcion: 'Enchiladas rellenas de milanesa con salsa, crema y queso.',
    categoria: 'platillos',
    precio: 85,
  },
  {
    nombre: 'Chilaquiles de Pollo',
    descripcion: 'Chilaquiles con pollo, salsa verde o roja, crema y queso.',
    categoria: 'platillos',
    precio: 65,
  },
  {
    nombre: 'Chilaquiles de Huevo',
    descripcion: 'Chilaquiles con huevo, salsa verde o roja, crema y queso.',
    categoria: 'platillos',
    precio: 70,
  },
  {
    nombre: 'Chilaquiles de Longaniza',
    descripcion: 'Chilaquiles con longaniza, salsa verde o roja, crema y queso.',
    categoria: 'platillos',
    precio: 75,
  },
  {
    nombre: 'Chilaquiles de Milanesa',
    descripcion: 'Chilaquiles con milanesa, salsa verde o roja, crema y queso.',
    categoria: 'platillos',
    precio: 85,
  },
];

async function main() {
  console.log('');
  console.log('🍔 A-la Burguer - Poblando menú real');
  console.log('=====================================');
  console.log('');

  // Step 1: Delete pedido_detalle references first (to avoid FK constraint)
  console.log('1. Eliminando referencias en pedido_detalle...');
  const { error: detDeleteError } = await supabase
    .from('pedido_detalle')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (detDeleteError) {
    console.error('   ⚠️  Error al eliminar detalles:', detDeleteError.message);
  } else {
    console.log('   ✓ Detalles de pedidos eliminados');
  }

  // Step 1b: Delete pedidos
  console.log('   Eliminando pedidos...');
  const { error: pedDeleteError } = await supabase
    .from('pedido')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (pedDeleteError) {
    console.error('   ⚠️  Error al eliminar pedidos:', pedDeleteError.message);
  } else {
    console.log('   ✓ Pedidos eliminados');
  }

  // Step 1c: Delete old products
  console.log('   Eliminando productos anteriores...');
  const { error: deleteError } = await supabase
    .from('producto')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('   ⚠️  Error al eliminar productos:', deleteError.message);
  } else {
    console.log('   ✓ Productos anteriores eliminados');
  }

  // Step 2: Insert new menu items
  console.log('2. Insertando menú real de A-la Burguer...');

  const records = MENU.map(item => ({
    nombre: item.nombre,
    descripcion: item.descripcion,
    categoria: item.categoria,
    precio: item.precio,
    activo: true,
    opciones_personalizacion: '[]',
  }));

  const { data, error: insertError } = await supabase
    .from('producto')
    .insert(records)
    .select();

  if (insertError) {
    console.error('   ✗ Error al insertar:', insertError.message);

    // If it's a constraint error, try inserting one by one to identify which fail
    if (insertError.message.includes('check') || insertError.message.includes('constraint') || insertError.message.includes('violates')) {
      console.log('');
      console.log('   ⚠️  Puede que falten categorías en el constraint de la tabla.');
      console.log('   Ejecuta este SQL en Supabase SQL Editor:');
      console.log('');
      console.log('   ALTER TABLE producto DROP CONSTRAINT IF EXISTS producto_categoria_check;');
      console.log('   ALTER TABLE producto ADD CONSTRAINT producto_categoria_check');
      console.log("     CHECK (categoria IN ('alitas', 'hamburguesas', 'bebidas', 'combos', 'complementos', 'platillos', 'otros'));");
      console.log('');
      console.log('   Luego vuelve a ejecutar este script.');

      // Try inserting only the ones with existing categories as fallback
      console.log('');
      console.log('   Intentando insertar solo alitas y hamburguesas (categorías existentes)...');
      const fallbackRecords = records.filter(r => ['alitas', 'hamburguesas'].includes(r.categoria));
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('producto')
        .insert(fallbackRecords)
        .select();

      if (fallbackError) {
        console.error('   ✗ También falló:', fallbackError.message);
      } else {
        console.log(`   ✓ ${fallbackData?.length ?? 0} productos insertados (solo alitas y hamburguesas)`);
        console.log('   ⚠️  Faltan combos, complementos y platillos — actualiza el constraint primero.');
      }
    }
  } else {
    console.log(`   ✓ ${data?.length ?? 0} productos insertados exitosamente`);
  }

  // Step 3: Summary
  console.log('');
  console.log('=====================================');
  console.log('📋 Resumen del menú:');
  console.log('');
  console.log(`   🍗 Alitas: 2 productos`);
  console.log(`   🍔 Hamburguesas: 6 productos`);
  console.log(`   🎁 Combos: 1 producto`);
  console.log(`   🍟 Complementos: 6 productos`);
  console.log(`   🍽️  Platillos: 8 productos`);
  console.log(`   ─────────────────────`);
  console.log(`   Total: ${MENU.length} productos`);
  console.log('');
  console.log('✅ ¡Menú actualizado! Recarga http://localhost:3000/menu');
  console.log('');
}

main().catch(console.error);
