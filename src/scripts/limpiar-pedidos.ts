import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://evhyieblmtivcnfqxwxc.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  console.log('🧹 Limpiando pedidos para pruebas...\n');

  // 1. Delete pedido_detalle
  const { error: e1 } = await supabase.from('pedido_detalle').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(e1 ? `  ✗ pedido_detalle: ${e1.message}` : '  ✓ pedido_detalle limpio');

  // 2. Delete pedidos
  const { error: e2 } = await supabase.from('pedido').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(e2 ? `  ✗ pedido: ${e2.message}` : '  ✓ pedidos eliminados');

  // 3. Reset mesas to disponible
  const { error: e3 } = await supabase.from('mesa').update({ estado: 'disponible', pedido_activo_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(e3 ? `  ✗ mesas: ${e3.message}` : '  ✓ mesas liberadas (todas disponibles)');

  // 4. Delete clientes (optional for clean slate)
  const { error: e4 } = await supabase.from('cliente').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(e4 ? `  ✗ clientes: ${e4.message}` : '  ✓ clientes eliminados');

  console.log('\n✅ Base limpia. Listo para pruebas.');
}

main().catch(console.error);
