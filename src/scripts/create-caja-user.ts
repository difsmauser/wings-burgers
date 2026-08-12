import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://evhyieblmtivcnfqxwxc.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!serviceRoleKey) { console.error('❌ SUPABASE_SERVICE_ROLE_KEY required'); process.exit(1); }

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  console.log('💰 Creando usuario de Caja...\n');

  const email = 'caja@alaburguer.com';
  const password = 'Caja123!';

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('  ⚠️  Usuario ya existe, actualizando rol...');
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users?.find(u => u.email === email);
      if (existingUser) {
        await supabase.from('usuario').upsert({
          id: existingUser.id,
          email,
          nombre: 'Cajero',
          rol: 'caja',
          activo: true,
        });
        console.log('  ✓ Rol actualizado a: caja');
      }
    } else {
      console.error('  ✗ Error:', authError.message);
    }
  } else {
    // Insert into usuario table
    await supabase.from('usuario').insert({
      id: authData.user.id,
      email,
      nombre: 'Cajero',
      rol: 'caja',
      activo: true,
    });
    console.log('  ✓ Usuario creado exitosamente');
  }

  console.log('\n📋 Credenciales de Caja:');
  console.log('   Email: caja@alaburguer.com');
  console.log('   Contraseña: Caja123!');
  console.log('   URL: http://localhost:3000/caja');
  console.log('\n✅ Listo!');
}

main().catch(console.error);
