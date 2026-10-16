import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cargar variables de entorno desde .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const supabaseUrl = env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const anonKey = env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.argv[4] ||
  env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Error: No se encontró PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en el archivo .env');
  process.exit(1);
}

const supabasePublic = createClient(supabaseUrl, anonKey);

async function main() {
  const targetUser = process.argv[2]; // Puede ser email o UUID
  const newPassword = process.argv[3]; // Nueva contraseña

  console.log('\n============================================================');
  console.log('       🔥 Doña Migue POS - Gestor de Contraseñas            ');
  console.log('============================================================\n');

  // Si no se proporcionaron argumentos, listar usuarios registrados
  if (!targetUser || !newPassword) {
    console.log('📋 Lista de Operadores en la Base de Datos:\n');

    const { data: usuarios, error } = await supabasePublic
      .from('usuarios')
      .select('id, nombre_completo, rol, activo, sucursal_id')
      .order('created_at');

    if (error) {
      console.error('❌ Error al consultar usuarios:', error.message);
    } else if (usuarios && usuarios.length > 0) {
      console.table(
        usuarios.map((u) => ({
          ID: u.id,
          Nombre: u.nombre_completo,
          Rol: u.rol,
          Sucursal: u.sucursales?.nombre || 'Global',
          Estado: u.activo ? 'Habilitado' : 'Bloqueado',
        }))
      );
    } else {
      console.log('ℹ️ No hay usuarios registrados en la tabla "usuarios".');
    }

    console.log('\n📖 Modo de Uso:');
    console.log('  node scripts/reset-password.mjs <correo_o_id> <nueva_contraseña> [service_role_key]\n');
    console.log('Ejemplo:');
    console.log('  node scripts/reset-password.mjs admin@donamigue.com Migue2026*\n');
    console.log('💡 Opción SQL directa en Supabase SQL Editor:');
    console.log("  UPDATE auth.users SET encrypted_password = crypt('MiNuevaClave123', gen_salt('bf')) WHERE email = 'correo@ejemplo.com';\n");
    return;
  }

  // 1. Si tenemos la service_role_key, reseteo administrativo directo
  if (serviceRoleKey) {
    console.log(`🔐 Utilizando Service Role Key para actualizar contraseña de: ${targetUser}...`);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      let userId = targetUser;

      // Si es un email, buscar el ID en auth.users
      if (targetUser.includes('@')) {
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;

        const found = listData.users.find((u) => u.email?.toLowerCase() === targetUser.toLowerCase());
        if (!found) {
          throw new Error(`No se encontró ningún usuario con el correo: ${targetUser}`);
        }
        userId = found.id;
      }

      // Actualizar contraseña directamente
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) throw updateError;

      console.log('✅ ¡Contraseña actualizada exitosamente!');
      console.log(`   Usuario: ${updatedUser.user.email || updatedUser.user.id}`);
      console.log(`   Nueva contraseña: ${newPassword}`);
      console.log('   Ya puedes iniciar sesión en /login.\n');
    } catch (err) {
      console.error('❌ Error al actualizar contraseña con Admin API:', err.message);
    }
    return;
  }

  // 2. Si no hay service_role_key en .env
  console.log(`ℹ️ No se detectó SUPABASE_SERVICE_ROLE_KEY en .env.`);
  console.log(`   Para resetear contraseñas directamente por script necesitas la Service Role Key.`);
  console.log(`   (La encuentras en: Supabase Dashboard > Settings > API > Project API keys > service_role)\n`);

  if (targetUser.includes('@')) {
    console.log(`📧 Enviando correo de recuperación a: ${targetUser}...`);
    const { error: resetError } = await supabasePublic.auth.resetPasswordForEmail(targetUser);
    if (resetError) {
      console.error('❌ Error al solicitar reseteo por email:', resetError.message);
    } else {
      console.log(`✅ Correo de recuperación enviado a ${targetUser}. Revisa tu bandeja de entrada.\n`);
    }
  }

  console.log('------------------------------------------------------------');
  console.log('💡 COMANDO SQL DIRECTO (Copia y pega en Supabase SQL Editor):');
  console.log('------------------------------------------------------------');
  const sql = targetUser.includes('@')
    ? `UPDATE auth.users \nSET encrypted_password = crypt('${newPassword}', gen_salt('bf')) \nWHERE email = '${targetUser}';`
    : `UPDATE auth.users \nSET encrypted_password = crypt('${newPassword}', gen_salt('bf')) \nWHERE id = '${targetUser}';`;
  console.log(sql);
  console.log('------------------------------------------------------------\n');
}

main().catch((err) => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
