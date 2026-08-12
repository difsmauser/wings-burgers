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
  console.log('🍗 Separando Alitas y Boneless...');

  // Delete the combined products
  const { error: delError } = await supabase
    .from('producto')
    .delete()
    .ilike('nombre', '%Boneless y Alitas%');

  if (delError) {
    console.error('Error al eliminar:', delError.message);
  } else {
    console.log('✓ Productos combinados eliminados');
  }

  // Insert separated products
  const nuevos = [
    {
      nombre: 'Alitas (7 piezas)',
      descripcion: 'Alitas al carbón y fritas. Sabores a elegir: BBQ, Tamarindo, Búfalo, Piña, Mango Habanero, Chipotle-naranja. Incluye aderezo Ranch y verduras frescas (pepino, zanahoria y limón).',
      categoria: 'alitas',
      precio: 80,
      activo: true,
      opciones_personalizacion: '[]',
    },
    {
      nombre: 'Alitas con Papitas',
      descripcion: 'Alitas al carbón 7 piezas con sabor a elegir: BBQ, Tamarindo, Búfalo, Piña, Mango Habanero, Chipotle-naranja. Incluye aderezo Ranch, verduras frescas y papas francesas.',
      categoria: 'alitas',
      precio: 95,
      activo: true,
      opciones_personalizacion: '[]',
    },
    {
      nombre: 'Boneless (7 piezas)',
      descripcion: 'Boneless al carbón y fritos. Sabores a elegir: BBQ, Tamarindo, Búfalo, Piña, Mango Habanero, Chipotle-naranja. Incluye aderezo Ranch y verduras frescas (pepino, zanahoria y limón).',
      categoria: 'alitas',
      precio: 80,
      activo: true,
      opciones_personalizacion: '[]',
    },
    {
      nombre: 'Boneless con Papitas',
      descripcion: 'Boneless al carbón 7 piezas con sabor a elegir: BBQ, Tamarindo, Búfalo, Piña, Mango Habanero, Chipotle-naranja. Incluye aderezo Ranch, verduras frescas y papas francesas.',
      categoria: 'alitas',
      precio: 95,
      activo: true,
      opciones_personalizacion: '[]',
    },
  ];

  const { data, error: insError } = await supabase.from('producto').insert(nuevos).select();

  if (insError) {
    console.error('Error al insertar:', insError.message);
  } else {
    console.log(`✓ ${data?.length} productos nuevos insertados:`);
    data?.forEach(p => console.log(`   - ${p.nombre} ($${p.precio})`));
  }

  console.log('\n✅ Listo! Ahora hay 4 productos en alitas: Alitas solas, Alitas+papas, Boneless solos, Boneless+papas');
}

main().catch(console.error);
