/**
 * SCRIPT DE UTILIDAD: Prueba de conexión a Supabase
 *
 * ⚠️  SEGURIDAD: Este script NO debe contener credenciales hardcodeadas.
 *     Usa variables de entorno para pasar los valores sensibles.
 *
 * USO (local):
 *   Asegúrate de tener un archivo .env.local con:
 *     NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *
 *   Luego ejecuta:
 *     node -r dotenv/config test-db.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Variables de entorno requeridas:\n' +
    '   NEXT_PUBLIC_SUPABASE_URL\n' +
    '   NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Probando conexión a Supabase...');

  console.log('\n--- 1. Probando tabla carreras ---');
  const { data: carreras, error: carrerasError } = await supabase.from('carreras').select('id, nombre');
  if (carrerasError) {
    console.error('Error fetching carreras:', carrerasError.message);
  } else {
    console.log('Carreras encontradas:', carreras.length);
  }

  console.log('\n--- 2. Probando tabla docentes ---');
  const { data: docentes, error: docentesError } = await supabase.from('docentes').select('id, nombres');
  if (docentesError) {
    console.error('Error fetching docentes:', docentesError.message);
  } else {
    console.log('Docentes encontrados:', docentes.length);
  }

  console.log('\n✅ Prueba de conexión completada.');
}

run().catch((err) => { console.error(err); process.exit(1); });
