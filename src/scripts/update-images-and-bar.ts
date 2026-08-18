import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey || !supabaseUrl) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL required'); process.exit(1); }

if (!serviceRoleKey) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Free Unsplash image URLs (direct links, no API key needed)
const IMAGES: Record<string, string> = {
  // Alitas
  'Alitas (7 piezas)': 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&h=300&fit=crop',
  'Alitas con Papitas': 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400&h=300&fit=crop',
  'Boneless (7 piezas)': 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
  'Boneless con Papitas': 'https://images.unsplash.com/photo-1585325701165-351af55efb3e?w=400&h=300&fit=crop',
  // Hamburguesas
  'Hamburguesa Sencilla': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'Hamburguesa Sencilla con Papitas': 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop',
  'Hamburguesa Especial': 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop',
  'Hamburguesa Especial con Papitas': 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=400&h=300&fit=crop',
  'Hamburguesa Suprema': 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&h=300&fit=crop',
  'Hamburguesa Suprema con Papitas': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop',
  // Combos
  'Combo Especial': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&h=300&fit=crop',
  // Complementos
  'Dedos de Queso (5 piezas)': 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400&h=300&fit=crop',
  'Dedos de Queso con Papitas': 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400&h=300&fit=crop',
  'Aros de Cebolla (5 piezas)': 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop',
  'Aros de Cebolla con Papitas': 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400&h=300&fit=crop',
  'Papas a la Francesa': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
  'Chicharrón Preparado': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  // Platillos
  'Enchiladas de Pollo': 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400&h=300&fit=crop',
  'Enchiladas de Huevo': 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=400&h=300&fit=crop',
  'Enchiladas de Longaniza': 'https://images.unsplash.com/photo-1629385701021-fcd568a743e8?w=400&h=300&fit=crop',
  'Enchiladas de Milanesa': 'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?w=400&h=300&fit=crop',
  'Chilaquiles de Pollo': 'https://images.unsplash.com/photo-1585816777126-f4ed9950f8de?w=400&h=300&fit=crop',
  'Chilaquiles de Huevo': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop',
  'Chilaquiles de Longaniza': 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
  'Chilaquiles de Milanesa': 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?w=400&h=300&fit=crop',
};

// Bar products to add
const BAR_PRODUCTS = [
  { nombre: 'Cerveza Clara', descripcion: 'Cerveza clara bien fría 355ml. Marcas disponibles: Corona, Victoria, Modelo.', categoria: 'bar', precio: 45, activo: true, opciones_personalizacion: '[]' },
  { nombre: 'Cerveza Oscura', descripcion: 'Cerveza oscura 355ml. Marcas disponibles: Negra Modelo, Bohemia Oscura.', categoria: 'bar', precio: 50, activo: true, opciones_personalizacion: '[]' },
  { nombre: 'Michelada', descripcion: 'Michelada preparada con cerveza, clamato, limón, salsa y chile. Vaso escarchado.', categoria: 'bar', precio: 65, activo: true, opciones_personalizacion: '[]' },
  { nombre: 'Copa de Vino Tinto', descripcion: 'Copa de vino tinto de la casa. Servido a temperatura ambiente.', categoria: 'bar', precio: 70, activo: true, opciones_personalizacion: '[]' },
  { nombre: 'Margarita', descripcion: 'Margarita clásica con tequila, triple sec y limón. Vaso escarchado con sal.', categoria: 'bar', precio: 85, activo: true, opciones_personalizacion: '[]' },
  { nombre: 'Shot de Tequila', descripcion: 'Shot de tequila reposado con limón y sal.', categoria: 'bar', precio: 40, activo: true, opciones_personalizacion: '[]' },
];

const BAR_IMAGES: Record<string, string> = {
  'Cerveza Clara': 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=300&fit=crop',
  'Cerveza Oscura': 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=300&fit=crop',
  'Michelada': 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop',
  'Copa de Vino Tinto': 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
  'Margarita': 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=400&h=300&fit=crop',
  'Shot de Tequila': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
};

async function main() {
  console.log('🖼️  Actualizando imágenes y agregando categoría Bar...\n');

  // Step 1: Update category constraint
  console.log('1. Actualizando constraint de categorías...');
  // Can't do ALTER TABLE via JS client easily, so we skip and handle errors

  // Step 2: Update existing product images
  console.log('2. Actualizando imágenes de productos...');
  const { data: productos } = await supabase.from('producto').select('id, nombre');
  
  let updated = 0;
  for (const prod of productos ?? []) {
    const imageUrl = IMAGES[prod.nombre];
    if (imageUrl) {
      const { error } = await supabase.from('producto').update({ imagen_url: imageUrl }).eq('id', prod.id);
      if (!error) { updated++; console.log(`   ✓ ${prod.nombre}`); }
      else { console.log(`   ✗ ${prod.nombre}: ${error.message}`); }
    }
  }
  console.log(`   → ${updated} productos actualizados con imagen\n`);

  // Step 3: Insert bar products
  console.log('3. Insertando productos de Bar...');
  
  const barRecords = BAR_PRODUCTS.map(p => ({
    ...p,
    imagen_url: BAR_IMAGES[p.nombre] || null,
  }));

  const { data: barData, error: barError } = await supabase.from('producto').insert(barRecords).select();
  
  if (barError) {
    if (barError.message.includes('violates check constraint')) {
      console.log('   ⚠️  Necesitas actualizar el constraint. Ejecuta en SQL Editor:');
      console.log("   ALTER TABLE producto DROP CONSTRAINT IF EXISTS producto_categoria_check;");
      console.log("   ALTER TABLE producto ADD CONSTRAINT producto_categoria_check CHECK (categoria IN ('alitas', 'hamburguesas', 'bebidas', 'combos', 'complementos', 'platillos', 'bar', 'otros'));");
      console.log('\n   Luego vuelve a ejecutar este script.');
    } else {
      console.error('   Error:', barError.message);
    }
  } else {
    console.log(`   ✓ ${barData?.length} productos de bar insertados`);
    barData?.forEach(p => console.log(`     - ${p.nombre} ($${p.precio})`));
  }

  console.log('\n✅ ¡Listo! Recarga el menú para ver las imágenes.');
}

main().catch(console.error);
