/**
 * SCRIPT DE UTILIDAD: Crear usuario administrador
 *
 * ⚠️  SEGURIDAD: Este script NO debe contener credenciales hardcodeadas.
 *     Usa variables de entorno para pasar los valores sensibles.
 *
 * USO (local):
 *   Crea un archivo .env.local con:
 *     NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *     SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *     ADMIN_EMAIL=nuevo-admin@tecsur.edu.pe
 *     ADMIN_PASSWORD=contraseña-segura
 *
 *   Luego ejecuta:
 *     node -r dotenv/config create-admin.js
 *
 * ALTERNATIVA RECOMENDADA:
 *   Usa el panel de Supabase → Authentication → Users → Invite user
 *   o llama al endpoint POST /api/administradores desde la UI de la aplicación.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword) {
  console.error(
    '❌ Variables de entorno requeridas:\n' +
    '   NEXT_PUBLIC_SUPABASE_URL\n' +
    '   SUPABASE_SERVICE_ROLE_KEY\n' +
    '   ADMIN_EMAIL\n' +
    '   ADMIN_PASSWORD'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log(`Creando usuario administrador: ${adminEmail}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (error) {
    console.error('Error al crear usuario:', error.message);
    process.exit(1);
  }

  console.log('✅ Usuario creado exitosamente');
  console.log('   User ID:', data.user.id);
}

run().catch((err) => { console.error(err); process.exit(1); });
