/**
 * Fix: Recrear pedidos de prueba con los 3 canales reales correctos:
 * 1. QR Mesa — cliente escanea QR y ordena solo
 * 2. Mesero — toma orden presencial o por WhatsApp
 * 3. Domicilio — pedido a domicilio
 * 
 * Ejecutar: npx tsx src/scripts/fix-canales-prueba.ts
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey || !supabaseUrl) { console.error('❌ Env vars required'); process.exit(1); }

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  console.log('🔄 Recreando pedidos con los 3 canales correctos...\n');

  // Limpiar pedidos existentes
  await supabase.from('mesa').update({ estado: 'disponible', pedido_activo_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pedido_detalle').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pedido').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Pedidos anteriores eliminados\n');

  // Obtener productos y mesas
  const { data: productos } = await supabase.from('producto').select('id, nombre, precio, categoria').eq('activo', true);
  const { data: mesas } = await supabase.from('mesa').select('id, nombre, zona');
  const { data: meseros } = await supabase.from('mesero').select('id, nombre');

  if (!productos?.length || !mesas?.length || !meseros?.length) {
    console.log('❌ Faltan productos, mesas o meseros'); return;
  }

  const pickItems = (count: number) => {
    const shuffled = [...productos].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(p => ({
      producto_id: p.id, nombre: p.nombre,
      cantidad: Math.ceil(Math.random() * 2),
      precio_unitario: p.precio,
    }));
  };
  const calcTotal = (items: Array<{ cantidad: number; precio_unitario: number }>) =>
    items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const mesero1 = meseros[0];
  const mesero2 = meseros[1];

  // ════════════════════════════════════════════
  // CANAL 1: QR MESA — Cliente ordena via QR
  // ════════════════════════════════════════════
  console.log('  📱 CANAL: QR MESA (cliente escanea y ordena)');
  const qrPedidos = [
    { mesa: mesas[0], items: pickItems(2), estado: 'en_preparacion' },
    { mesa: mesas[1], items: pickItems(3), estado: 'listo_para_servir' },
  ];

  for (const qr of qrPedidos) {
    const total = calcTotal(qr.items);
    const numero = `QR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const { data: pedido, error } = await supabase.from('pedido').insert({
      numero,
      estado: qr.estado,
      estado_pago: 'pendiente',
      modalidad: 'local',
      mesa_zona: `${qr.mesa.nombre} - ${qr.mesa.zona}`,
      subtotal: total, impuestos: 0, total,
      observaciones: '[QR] Pedido desde menú QR de mesa',
      creado_en: new Date(Date.now() - Math.random() * 2400000).toISOString(),
      actualizado_en: new Date().toISOString(),
    }).select().single();

    if (error) { console.log(`     ✗ ${error.message}`); continue; }

    await supabase.from('pedido_detalle').insert(qr.items.map(i => ({
      pedido_id: pedido.id, producto_id: i.producto_id,
      cantidad: i.cantidad, precio_unitario: i.precio_unitario,
      precio_total: i.cantidad * i.precio_unitario, personalizaciones: [],
    })));
    await supabase.from('mesa').update({ estado: 'ocupada', pedido_activo_id: pedido.id }).eq('id', qr.mesa.id);
    console.log(`     ✓ #${numero.slice(-5)} — ${qr.mesa.nombre} — $${total} — ${qr.estado}`);
  }

  // ════════════════════════════════════════════
  // CANAL 2: MESERO — Toma orden presencial o WhatsApp
  // ════════════════════════════════════════════
  console.log('\n  🧑‍🍳 CANAL: MESERO (orden presencial / WhatsApp)');
  const meseroPedidos = [
    { mesa: mesas[2], items: pickItems(4), mesero: mesero1, estado: 'en_preparacion', tipo: 'presencial' },
    { mesa: mesas[3], items: pickItems(3), mesero: mesero2, estado: 'en_preparacion', tipo: 'presencial' },
    { mesa: mesas[4], items: pickItems(2), mesero: mesero1, estado: 'listo_para_servir', tipo: 'whatsapp' },
  ];

  for (const mp of meseroPedidos) {
    const total = calcTotal(mp.items);
    const numero = `PED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const obs = mp.tipo === 'whatsapp'
      ? `[MESERO] Orden recibida por WhatsApp — Mesero: ${mp.mesero.nombre}`
      : `[MESERO] Orden tomada en mesa por ${mp.mesero.nombre}`;

    const { data: pedido, error } = await supabase.from('pedido').insert({
      numero,
      estado: mp.estado,
      estado_pago: 'pendiente',
      modalidad: 'local',
      mesa_zona: `${mp.mesa.nombre} - ${mp.mesa.zona}`,
      mesero_id: mp.mesero.id,
      mesero_nombre: mp.mesero.nombre,
      subtotal: total, impuestos: 0, total,
      observaciones: obs,
      creado_en: new Date(Date.now() - Math.random() * 1800000).toISOString(),
      actualizado_en: new Date().toISOString(),
    }).select().single();

    if (error) { console.log(`     ✗ ${error.message}`); continue; }

    await supabase.from('pedido_detalle').insert(mp.items.map(i => ({
      pedido_id: pedido.id, producto_id: i.producto_id,
      cantidad: i.cantidad, precio_unitario: i.precio_unitario,
      precio_total: i.cantidad * i.precio_unitario, personalizaciones: [],
    })));
    await supabase.from('mesa').update({ estado: 'ocupada', pedido_activo_id: pedido.id }).eq('id', mp.mesa.id);
    console.log(`     ✓ #${numero.slice(-5)} — ${mp.mesa.nombre} — ${mp.mesero.nombre} (${mp.tipo}) — $${total} — ${mp.estado}`);
  }

  // ════════════════════════════════════════════
  // CANAL 3: DOMICILIO — Pedidos a domicilio
  // ════════════════════════════════════════════
  console.log('\n  🛵 CANAL: DOMICILIO (entrega a domicilio)');
  const domicilios = [
    { items: pickItems(3), cliente: 'Juan García', dir: 'Av. Reforma 123, Col. Centro', tel: '5512345678', estado: 'recibido' },
    { items: pickItems(2), cliente: 'Ana López', dir: 'Calle 5 de Mayo 456', tel: '5598765432', estado: 'en_preparacion' },
    { items: pickItems(4), cliente: 'Roberto Sánchez', dir: 'Blvd. Hidalgo 789, Col. Sur', tel: '5511223344', estado: 'empacado' },
  ];

  for (const dom of domicilios) {
    const total = calcTotal(dom.items);
    const numero = `DOM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const { data: pedido, error } = await supabase.from('pedido').insert({
      numero,
      estado: dom.estado,
      estado_pago: 'pendiente',
      modalidad: 'domicilio',
      subtotal: total, impuestos: 0, total,
      observaciones: `[DOMICILIO] Cliente: ${dom.cliente} | Tel: ${dom.tel} | Dir: ${dom.dir}`,
      creado_en: new Date(Date.now() - Math.random() * 3000000).toISOString(),
      actualizado_en: new Date().toISOString(),
    }).select().single();

    if (error) { console.log(`     ✗ ${error.message}`); continue; }

    await supabase.from('pedido_detalle').insert(dom.items.map(i => ({
      pedido_id: pedido.id, producto_id: i.producto_id,
      cantidad: i.cantidad, precio_unitario: i.precio_unitario,
      precio_total: i.cantidad * i.precio_unitario, personalizaciones: [],
    })));
    console.log(`     ✓ #${numero.slice(-5)} — ${dom.cliente} — $${total} — ${dom.estado.toUpperCase()}`);
  }

  // Resumen
  console.log('\n' + '═'.repeat(50));
  console.log('📊 PEDIDOS DE PRUEBA CREADOS:');
  console.log('═'.repeat(50));
  console.log('  📱 QR Mesa: 2 pedidos (cliente ordena solo via QR)');
  console.log('     - 1 en preparación, 1 listo para servir');
  console.log('  🧑‍🍳 Mesero: 3 pedidos (2 presencial, 1 WhatsApp)');
  console.log('     - 2 en preparación, 1 listo para servir');
  console.log('  🛵 Domicilio: 3 pedidos');
  console.log('     - 1 recibido, 1 en preparación, 1 empacado');
  console.log('═'.repeat(50));
  console.log('\n  Mesas ocupadas: 5/5');
  console.log('  Total pedidos: 8');
  console.log('\n✅ Listo para testing de todos los canales.');
}

main().catch(console.error);
