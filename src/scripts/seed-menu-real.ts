/**
 * Seed del menú REAL de A-la Burguer basado en el menú físico del restaurante.
 * 
 * Ejecutar con:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<key>"; $env:NEXT_PUBLIC_SUPABASE_URL="<url>"; npx tsx src/scripts/seed-menu-real.ts
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey || !supabaseUrl) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Imágenes representativas por categoría (Unsplash URLs de alta calidad)
const IMG = {
  alitas: 'https://images.unsplash.com/photo-1527477396000-e27163b4bfca?w=600&q=80',
  boneless: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
  hambSencilla: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  hambEspecial: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80',
  hambSuprema: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80',
  combo: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&q=80',
  dedosQueso: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=600&q=80',
  aros: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&q=80',
  papas: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
  chicharron: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80',
  enchiladas: 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=600&q=80',
  chilaquiles: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=600&q=80',
  cocaCola: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=600&q=80',
  limonada: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80',
  cerveza: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80',
  michelada: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&q=80',
  agua: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80',
};

interface Producto {
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  activo: boolean;
  imagen_url: string | null;
  opciones_personalizacion: Array<{ nombre: string; opciones: string[] }>;
}

const PRODUCTOS: Producto[] = [
  // === ALITAS Y BONELESS ===
  {
    nombre: 'Alitas al Carbón (7 pzas)',
    descripcion: 'Alitas al carbón y fritas. Sabores: BBQ, Tamarindo, Búfalo, Piña, Mango Habanero, Chipotle-naranja. Incluye aderezo Ranch y verduras.',
    categoria: 'alitas',
    precio: 80.00,
    activo: true,
    imagen_url: IMG.alitas,
    opciones_personalizacion: [
      { nombre: 'Sabor', opciones: ['BBQ', 'Tamarindo', 'Búfalo', 'Piña', 'Mango Habanero', 'Chipotle-Naranja'] },
      { nombre: 'Extra', opciones: ['Con papitas (+$15)'] },
    ],
  },
  {
    nombre: 'Alitas con Papitas (7 pzas)',
    descripcion: 'Alitas al carbón y fritas con papas francesas. Sabores a elegir. Incluye aderezo Ranch y verduras.',
    categoria: 'alitas',
    precio: 95.00,
    activo: true,
    imagen_url: IMG.alitas,
    opciones_personalizacion: [
      { nombre: 'Sabor', opciones: ['BBQ', 'Tamarindo', 'Búfalo', 'Piña', 'Mango Habanero', 'Chipotle-Naranja'] },
    ],
  },
  {
    nombre: 'Boneless (7 pzas)',
    descripcion: 'Boneless crujientes con salsa a elegir. Incluye aderezo Ranch y verduras (pepino, zanahoria y limón).',
    categoria: 'alitas',
    precio: 80.00,
    activo: true,
    imagen_url: IMG.boneless,
    opciones_personalizacion: [
      { nombre: 'Sabor', opciones: ['BBQ', 'Tamarindo', 'Búfalo', 'Piña', 'Mango Habanero', 'Chipotle-Naranja'] },
      { nombre: 'Extra', opciones: ['Con papitas (+$15)'] },
    ],
  },

  // === HAMBURGUESAS ===
  {
    nombre: 'Hamburguesa Sencilla',
    descripcion: 'Carne de res, jamón, queso americano, pepino, lechuga, jitomate, cátsup, mostaza.',
    categoria: 'hamburguesas',
    precio: 70.00,
    activo: true,
    imagen_url: IMG.hambSencilla,
    opciones_personalizacion: [
      { nombre: 'Extra', opciones: ['Con papitas (+$15)'] },
    ],
  },
  {
    nombre: 'Hamburguesa Sencilla con Papitas',
    descripcion: 'Carne de res, jamón, queso americano, pepino, lechuga, jitomate, cátsup, mostaza. Incluye papas francesas.',
    categoria: 'hamburguesas',
    precio: 85.00,
    activo: true,
    imagen_url: IMG.hambSencilla,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Hamburguesa Especial',
    descripcion: 'Carne de res, tocino, jamón, queso Oaxaca y americano, pepino, lechuga, jitomate, piña, cátsup, mostaza.',
    categoria: 'hamburguesas',
    precio: 95.00,
    activo: true,
    imagen_url: IMG.hambEspecial,
    opciones_personalizacion: [
      { nombre: 'Extra', opciones: ['Con papitas (+$15)'] },
    ],
  },
  {
    nombre: 'Hamburguesa Especial con Papitas',
    descripcion: 'Carne de res, tocino, jamón, queso Oaxaca y americano, pepino, lechuga, jitomate, piña. Incluye papas francesas.',
    categoria: 'hamburguesas',
    precio: 110.00,
    activo: true,
    imagen_url: IMG.hambEspecial,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Hamburguesa Suprema',
    descripcion: 'Carne de res, más tocino, aros de cebolla con sabor BBQ o Mango Habanero, jamón, queso Oaxaca y americano, pepino, lechuga, piña, cátsup, mostaza.',
    categoria: 'hamburguesas',
    precio: 120.00,
    activo: true,
    imagen_url: IMG.hambSuprema,
    opciones_personalizacion: [
      { nombre: 'Sabor aros', opciones: ['BBQ', 'Mango Habanero'] },
      { nombre: 'Extra', opciones: ['Con papitas (+$20)'] },
    ],
  },
  {
    nombre: 'Hamburguesa Suprema con Papitas',
    descripcion: 'Hamburguesa Suprema completa con papas francesas.',
    categoria: 'hamburguesas',
    precio: 140.00,
    activo: true,
    imagen_url: IMG.hambSuprema,
    opciones_personalizacion: [
      { nombre: 'Sabor aros', opciones: ['BBQ', 'Mango Habanero'] },
    ],
  },

  // === COMPLEMENTOS ===
  {
    nombre: 'Combo Especial',
    descripcion: 'Alitas 5pz + Boneless 5pz + Papitas + Dedos de queso 2pz + Aros de cebolla 5pz + Aderezo Ranch + Verduras.',
    categoria: 'combos',
    precio: 170.00,
    activo: true,
    imagen_url: IMG.combo,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Dedos de Queso (5 pzas)',
    descripcion: 'Dedos de queso mozzarella empanizados crujientes.',
    categoria: 'complementos',
    precio: 65.00,
    activo: true,
    imagen_url: IMG.dedosQueso,
    opciones_personalizacion: [
      { nombre: 'Extra', opciones: ['Con papitas (+$10)'] },
    ],
  },
  {
    nombre: 'Dedos de Queso con Papitas',
    descripcion: 'Dedos de queso mozzarella empanizados con papas francesas.',
    categoria: 'complementos',
    precio: 75.00,
    activo: true,
    imagen_url: IMG.dedosQueso,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Aros de Cebolla (5 pzas)',
    descripcion: 'Aros de cebolla empanizados crujientes.',
    categoria: 'complementos',
    precio: 55.00,
    activo: true,
    imagen_url: IMG.aros,
    opciones_personalizacion: [
      { nombre: 'Extra', opciones: ['Con papitas (+$10)'] },
    ],
  },
  {
    nombre: 'Aros de Cebolla con Papitas',
    descripcion: 'Aros de cebolla empanizados con papas francesas.',
    categoria: 'complementos',
    precio: 65.00,
    activo: true,
    imagen_url: IMG.aros,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Papas a la Francesa',
    descripcion: 'Porción generosa de papas francesas crujientes.',
    categoria: 'complementos',
    precio: 45.00,
    activo: true,
    imagen_url: IMG.papas,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Chicharrón Preparado',
    descripcion: 'Chicharrón preparado con salsa, crema y verdura.',
    categoria: 'complementos',
    precio: 40.00,
    activo: true,
    imagen_url: IMG.chicharron,
    opciones_personalizacion: [],
  },

  // === PLATILLOS ===
  {
    nombre: 'Enchiladas de Pollo',
    descripcion: 'Enchiladas rellenas de pollo con salsa, crema y queso.',
    categoria: 'platillos',
    precio: 65.00,
    activo: true,
    imagen_url: IMG.enchiladas,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Enchiladas de Huevo',
    descripcion: 'Enchiladas rellenas de huevo con salsa, crema y queso.',
    categoria: 'platillos',
    precio: 70.00,
    activo: true,
    imagen_url: IMG.enchiladas,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Chilaquiles de Longaniza',
    descripcion: 'Chilaquiles con longaniza, crema, queso y cebolla.',
    categoria: 'platillos',
    precio: 75.00,
    activo: true,
    imagen_url: IMG.chilaquiles,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Chilaquiles de Milanesa',
    descripcion: 'Chilaquiles con milanesa de res, crema, queso y cebolla.',
    categoria: 'platillos',
    precio: 85.00,
    activo: true,
    imagen_url: IMG.chilaquiles,
    opciones_personalizacion: [],
  },

  // === BEBIDAS ===
  {
    nombre: 'Coca-Cola 600ml',
    descripcion: 'Refresco Coca-Cola 600ml.',
    categoria: 'bebidas',
    precio: 30.00,
    activo: true,
    imagen_url: IMG.cocaCola,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Limonada Natural 1L',
    descripcion: 'Limonada fresca del día preparada con limón natural.',
    categoria: 'bebidas',
    precio: 45.00,
    activo: true,
    imagen_url: IMG.limonada,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Agua Natural 600ml',
    descripcion: 'Agua purificada.',
    categoria: 'bebidas',
    precio: 20.00,
    activo: true,
    imagen_url: IMG.agua,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Cerveza Artesanal',
    descripcion: 'Cerveza artesanal local 355ml.',
    categoria: 'bebidas',
    precio: 60.00,
    activo: true,
    imagen_url: IMG.cerveza,
    opciones_personalizacion: [],
  },
  {
    nombre: 'Michelada',
    descripcion: 'Michelada preparada con cerveza, limón, salsa y chamoy.',
    categoria: 'bebidas',
    precio: 70.00,
    activo: true,
    imagen_url: IMG.michelada,
    opciones_personalizacion: [],
  },
];

async function main() {
  console.log('🍗 Sembrando menú REAL de A-la Burguer...\n');

  // 1. Delete existing products
  const { error: delError } = await supabase.from('producto').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delError) {
    console.log(`  ⚠️  No se pudieron borrar productos existentes: ${delError.message}`);
  } else {
    console.log('  🧹 Productos anteriores eliminados');
  }

  // 2. Insert new products
  let created = 0;
  for (const prod of PRODUCTOS) {
    const { error } = await supabase.from('producto').insert({
      id: crypto.randomUUID(),
      nombre: prod.nombre,
      descripcion: prod.descripcion,
      categoria: prod.categoria,
      precio: prod.precio,
      activo: prod.activo,
      imagen_url: prod.imagen_url,
      opciones_personalizacion: prod.opciones_personalizacion,
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    });

    if (error) {
      console.log(`  ❌ ${prod.nombre}: ${error.message}`);
    } else {
      console.log(`  ✅ ${prod.nombre} — $${prod.precio} (${prod.categoria})`);
      created++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   Total productos: ${created}/${PRODUCTOS.length}`);
  console.log(`   Categorías: alitas, hamburguesas, combos, complementos, platillos, bebidas`);
  console.log('\n✅ Menú real sembrado exitosamente.');
}

main().catch(console.error);
