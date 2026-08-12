/**
 * Script para crear usuarios de prueba en Supabase Auth + tabla usuario.
 *
 * Ejecutar con: npx tsx src/scripts/seed-users.ts
 *
 * Usuarios creados:
 * - admin@wingsandburgers.com / Admin123! (rol: admin)
 * - vendedor@wingsandburgers.com / Vendedor123! (rol: vendedor)
 * - repartidor@wingsandburgers.com / Repartidor123! (rol: repartidor)
 * - cliente@wingsandburgers.com / Cliente123! (rol: cliente)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evhyieblmtivcnfqxwxc.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required. Set it as an environment variable.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface TestUser {
  email: string;
  password: string;
  nombre: string;
  rol: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'admin@wingsandburgers.com',
    password: 'Admin123!',
    nombre: 'Administrador',
    rol: 'admin',
  },
  {
    email: 'vendedor@wingsandburgers.com',
    password: 'Vendedor123!',
    nombre: 'Juan Vendedor',
    rol: 'vendedor',
  },
  {
    email: 'repartidor@wingsandburgers.com',
    password: 'Repartidor123!',
    nombre: 'Carlos Repartidor',
    rol: 'repartidor',
  },
  {
    email: 'cliente@wingsandburgers.com',
    password: 'Cliente123!',
    nombre: 'María Cliente',
    rol: 'cliente',
  },
];

async function createUser(user: TestUser): Promise<void> {
  console.log(`Creating user: ${user.email} (${user.rol})...`);

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true, // Auto-confirm email
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log(`  ⚠️  User ${user.email} already exists, updating role...`);

      // Get existing user
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users?.find(u => u.email === user.email);

      if (existingUser) {
        // Upsert in usuario table
        await supabase.from('usuario').upsert({
          id: existingUser.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          activo: true,
        });
        console.log(`  ✓  Role updated to: ${user.rol}`);
      }
      return;
    }
    console.error(`  ✗  Error creating ${user.email}:`, authError.message);
    return;
  }

  // Insert into usuario table with role
  const { error: dbError } = await supabase.from('usuario').insert({
    id: authData.user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    activo: true,
  });

  if (dbError) {
    console.error(`  ✗  Error inserting role for ${user.email}:`, dbError.message);
    return;
  }

  console.log(`  ✓  Created successfully: ${user.email} / ${user.password} (${user.rol})`);
}

async function main() {
  console.log('');
  console.log('🍗 Wings & Burgers - Creando usuarios de prueba');
  console.log('================================================');
  console.log('');

  for (const user of TEST_USERS) {
    await createUser(user);
  }

  console.log('');
  console.log('================================================');
  console.log('');
  console.log('📋 Credenciales de acceso:');
  console.log('');
  console.log('┌─────────────┬─────────────────────────────────────┬───────────────┐');
  console.log('│ Rol         │ Email                               │ Contraseña    │');
  console.log('├─────────────┼─────────────────────────────────────┼───────────────┤');
  console.log('│ Admin       │ admin@wingsandburgers.com            │ Admin123!     │');
  console.log('│ Vendedor    │ vendedor@wingsandburgers.com         │ Vendedor123!  │');
  console.log('│ Repartidor  │ repartidor@wingsandburgers.com       │ Repartidor123!│');
  console.log('│ Cliente     │ cliente@wingsandburgers.com          │ Cliente123!   │');
  console.log('└─────────────┴─────────────────────────────────────┴───────────────┘');
  console.log('');
  console.log('🔗 El módulo Cliente no usa login - accede via QR:');
  console.log('   http://localhost:3000/menu?qr=MESA-01');
  console.log('');
}

main().catch(console.error);
