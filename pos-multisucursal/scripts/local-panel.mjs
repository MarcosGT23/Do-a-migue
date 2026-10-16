import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const PORT = 5050;

function readEnv() {
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length > 0) {
        env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return env;
}

function writeEnv(newEnv) {
  const current = readEnv();
  const merged = { ...current, ...newEnv };
  const lines = Object.entries(merged)
    .filter(([k, v]) => Boolean(k && v))
    .map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');
}

function getSupabaseClients() {
  const env = readEnv();
  const url = env.PUBLIC_SUPABASE_URL || '';
  const anonKey = env.PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  const publicClient = url && anonKey ? createClient(url, anonKey) : null;
  const adminClient = url && serviceKey
    ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  return { url, anonKey, serviceKey, publicClient, adminClient };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // API: Estado y Claves
  if (pathname === '/api/status' && req.method === 'GET') {
    const { url, anonKey, serviceKey } = getSupabaseClients();
    return sendJson(res, 200, {
      url,
      hasAnonKey: Boolean(anonKey),
      anonKeyLength: anonKey.length,
      hasServiceKey: Boolean(serviceKey),
      serviceKeyLength: serviceKey.length,
    });
  }

  // API: Guardar Claves en .env
  if (pathname === '/api/save-keys' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const updates = {};
      if (body.url) updates.PUBLIC_SUPABASE_URL = body.url.trim();
      if (body.anonKey) updates.PUBLIC_SUPABASE_ANON_KEY = body.anonKey.trim();
      if (body.serviceKey) updates.SUPABASE_SERVICE_ROLE_KEY = body.serviceKey.trim();
      writeEnv(updates);
      return sendJson(res, 200, { ok: true, message: 'Variables guardadas en .env correctamente' });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  // API: Obtener Usuarios
  if (pathname === '/api/users' && req.method === 'GET') {
    const { publicClient, adminClient, serviceKey } = getSupabaseClients();

    let authUsers = [];
    let appUsers = [];
    let errorAuth = null;
    let errorApp = null;

    if (adminClient) {
      try {
        const { data, error } = await adminClient.auth.admin.listUsers();
        if (error) throw error;
        authUsers = (data?.users || []).map((u) => ({
          id: u.id,
          email: u.email,
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at,
          phone: u.phone,
          confirmedAt: u.email_confirmed_at,
        }));
      } catch (err) {
        errorAuth = err.message;
      }
    } else {
      errorAuth = 'Falta configurar SUPABASE_SERVICE_ROLE_KEY para listar cuentas de auth.users.';
    }

    if (adminClient || publicClient) {
      try {
        const client = adminClient || publicClient;
        const { data, error } = await client
          .from('usuarios')
          .select('id, nombre_completo, rol, sucursal_id, activo, created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        appUsers = data || [];
      } catch (err) {
        errorApp = err.message;
      }
    }

    return sendJson(res, 200, {
      authUsers,
      appUsers,
      hasServiceKey: Boolean(serviceKey),
      errorAuth,
      errorApp,
    });
  }

  // API: Resetear Contraseña
  if (pathname === '/api/reset-password' && req.method === 'POST') {
    try {
      const { userId, newPassword } = await parseBody(req);
      if (!userId || !newPassword) {
        return sendJson(res, 400, { ok: false, error: 'Falta userId o newPassword' });
      }

      const { adminClient } = getSupabaseClients();
      if (!adminClient) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Se requiere SUPABASE_SERVICE_ROLE_KEY para cambiar la contraseña directamente.',
          sqlSuggestion: `UPDATE auth.users SET encrypted_password = crypt('${newPassword}', gen_salt('bf')) WHERE id = '${userId}';`,
        });
      }

      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) throw error;
      return sendJson(res, 200, {
        ok: true,
        message: `Contraseña actualizada para ${data.user.email || userId}`,
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // API: Crear Usuario
  if (pathname === '/api/create-user' && req.method === 'POST') {
    try {
      const { email, password, nombreCompleto, rol, sucursalId } = await parseBody(req);
      if (!email || !password || !nombreCompleto) {
        return sendJson(res, 400, { ok: false, error: 'Email, contraseña y nombre son obligatorios.' });
      }

      const { adminClient } = getSupabaseClients();
      if (!adminClient) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Se requiere SUPABASE_SERVICE_ROLE_KEY para crear usuarios desde este panel.',
        });
      }

      // 1. Crear en auth.users
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authErr) throw authErr;
      const newUserId = authData.user.id;

      // 2. Insertar en tabla public.usuarios
      const { error: appErr } = await adminClient.from('usuarios').insert({
        id: newUserId,
        nombre_completo: nombreCompleto,
        rol: rol || 'ADMIN',
        sucursal_id: sucursalId ? Number(sucursalId) : null,
        activo: true,
      });

      if (appErr) {
        return sendJson(res, 200, {
          ok: true,
          warning: `Usuario creado en Auth pero falló insertar en tabla usuarios: ${appErr.message}`,
          userId: newUserId,
        });
      }

      return sendJson(res, 200, {
        ok: true,
        message: `Usuario ${nombreCompleto} (${email}) creado exitosamente con rol ${rol || 'ADMIN'}.`,
        userId: newUserId,
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  // Servir el Frontend HTML del Panel Local
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(getHtmlTemplate());
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: El puerto ${PORT} ya está en uso.`);
    console.error(`   Cierra la ventana de terminal anterior o detén el proceso que usa el puerto ${PORT}.\n`);
  } else {
    console.error('\n❌ Error en el servidor local:', err.message);
  }
  process.exit(1);
});

function getHtmlTemplate() {
  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Panel Local de Gestión Supabase | Doña Migue</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background-color: #100f0e; color: #ede7dc; }
    .num-tabular { font-variant-numeric: tabular-nums; }
  </style>
</head>
<body class="min-h-screen p-6 md:p-10 flex flex-col items-center">
  <div class="max-w-6xl w-full space-y-8">
    
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#171513] border border-[#2b2520] shadow-2xl">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600/30 to-orange-700/20 border border-amber-600/40 text-amber-500 flex items-center justify-center text-2xl shadow-inner">
          🔥
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-extrabold text-white tracking-tight">Panel Local Supabase</h1>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-600/20 text-amber-300 border border-amber-600/30">
              Puerto :${PORT}
            </span>
          </div>
          <p class="text-xs text-[#9c907f] mt-0.5">Visor directo de usuarios, roles y reseteo de claves (100% independiente)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button id="btnActualizar" class="px-4 py-2 rounded-xl bg-[#24201c] hover:bg-[#302b25] text-xs font-bold text-[#ede7dc] border border-[#383129] transition">
          🔄 Actualizar Datos
        </button>
        <button id="btnNuevoUsuario" class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition">
          + Nuevo Usuario
        </button>
      </div>
    </div>

    <!-- Estado de Conexión & Configuración de Claves -->
    <div class="p-6 rounded-3xl bg-[#171513] border border-[#2b2520] space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <span>📡 Estado de Conexión con Supabase</span>
        </h2>
        <button id="btnToggleConfig" class="text-xs text-amber-500 hover:underline font-semibold">
          Editar Claves (.env)
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs" id="statusGrid">
        <div class="p-3.5 rounded-2xl bg-[#11100f] border border-[#26211c]">
          <span class="text-[#7a6f5f] block text-[11px]">URL del Proyecto</span>
          <span id="txtUrl" class="font-bold text-white truncate block">Cargando...</span>
        </div>
        <div class="p-3.5 rounded-2xl bg-[#11100f] border border-[#26211c]">
          <span class="text-[#7a6f5f] block text-[11px]">Clave Anon / Public</span>
          <span id="txtAnon" class="font-bold text-emerald-400">Verificando...</span>
        </div>
        <div class="p-3.5 rounded-2xl bg-[#11100f] border border-[#26211c]">
          <span class="text-[#7a6f5f] block text-[11px]">Service Role Key (Admin)</span>
          <span id="txtService" class="font-bold text-amber-400">Verificando...</span>
        </div>
      </div>

      <!-- Formulario para Editar Claves en .env -->
      <form id="formConfig" class="hidden pt-3 border-t border-[#26211c] space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label class="text-[#9c907f] block mb-1">PUBLIC_SUPABASE_URL</label>
            <input type="text" id="inputUrl" required class="w-full px-3 py-2 rounded-xl bg-[#100f0e] border border-[#2b2520] text-white">
          </div>
          <div>
            <label class="text-[#9c907f] block mb-1">PUBLIC_SUPABASE_ANON_KEY</label>
            <input type="text" id="inputAnon" required class="w-full px-3 py-2 rounded-xl bg-[#100f0e] border border-[#2b2520] text-white">
          </div>
        </div>
        <div>
          <label class="text-[#9c907f] block mb-1">SUPABASE_SERVICE_ROLE_KEY (Permite ver auth.users y cambiar claves al instante)</label>
          <input type="text" id="inputService" placeholder="Pega aquí la service_role secret de Supabase..." class="w-full px-3 py-2 rounded-xl bg-[#100f0e] border border-[#2b2520] text-white">
        </div>
        <button type="submit" class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition">
          Guardar en .env y Reintentar
        </button>
      </form>
    </div>

    <!-- Mensajes de Alerta -->
    <div id="alertBox" class="hidden p-4 rounded-2xl text-xs font-medium"></div>

    <!-- Tabla Principal de Usuarios -->
    <div class="p-6 rounded-3xl bg-[#171513] border border-[#2b2520] space-y-4">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-base font-bold text-white">Usuarios Registrados</h2>
          <p class="text-xs text-[#7a6f5f]">Cuentas de autenticación (<code class="text-amber-400">auth.users</code>) y perfiles operativos (<code class="text-amber-400">public.usuarios</code>)</p>
        </div>
        <span id="badgeTotal" class="px-3 py-1 rounded-full bg-[#221f1c] text-amber-400 text-xs font-bold border border-[#332c25]">
          0 usuarios
        </span>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-[#29231e]">
        <table class="w-full text-left text-xs divide-y divide-[#26211c]">
          <thead class="bg-[#12110f] text-[#8c806f] uppercase tracking-wider text-[11px]">
            <tr>
              <th class="py-3.5 px-4 font-semibold">Correo / ID</th>
              <th class="py-3.5 px-4 font-semibold">Nombre en Sistema</th>
              <th class="py-3.5 px-4 font-semibold">Rol Asignado</th>
              <th class="py-3.5 px-4 font-semibold">Sucursal</th>
              <th class="py-3.5 px-4 font-semibold">Confirmado</th>
              <th class="py-3.5 px-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyUsuarios" class="divide-y divide-[#26211c] bg-[#161412]">
            <tr>
              <td colspan="6" class="py-8 text-center text-[#7a6f5f]">Cargando usuarios de Supabase...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Generador Rápido de SQL de Reseteo -->
    <div class="p-6 rounded-3xl bg-[#171513] border border-[#2b2520] space-y-3">
      <h3 class="text-xs font-bold text-white uppercase tracking-wider">💡 Generador de Consulta SQL para Supabase</h3>
      <p class="text-xs text-[#9c907f]">Si prefieres ejecutar directamente en el <b>SQL Editor</b> de Supabase sin llaves admin:</p>
      <div class="flex gap-2">
        <input type="text" id="sqlEmail" placeholder="correo@ejemplo.com" class="px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white flex-1">
        <input type="text" id="sqlPass" placeholder="NuevaContraseña123*" class="px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white flex-1">
        <button id="btnGenerarSql" class="px-4 py-2 bg-[#26211c] hover:bg-[#332c25] rounded-xl text-xs font-bold text-amber-400 border border-[#383129]">Generar SQL</button>
      </div>
      <pre id="sqlOutput" class="hidden p-3 rounded-xl bg-[#100f0e] border border-[#2b2520] text-amber-300 font-mono text-[11px] overflow-x-auto"></pre>
    </div>

  </div>

  <!-- Modal Reset Password -->
  <div id="modalReset" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-bold text-white">Resetear Contraseña</h3>
        <button id="btnCloseModalReset" class="text-[#7a6f5f] hover:text-white text-xl font-bold">&times;</button>
      </div>
      <p class="text-xs text-[#9c907f]">Usuario: <span id="resetTargetName" class="font-bold text-white"></span></p>
      <div>
        <label class="text-xs text-[#ede7dc]">Nueva Contraseña</label>
        <input type="text" id="inputNewPassword" placeholder="Ej. DoñaMigue2026*" class="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white">
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button id="btnCancelModalReset" class="px-4 py-2 bg-[#221f1c] rounded-xl text-xs font-semibold text-[#9c907f]">Cancelar</button>
        <button id="btnSubmitModalReset" class="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-xs font-bold">Cambiar Contraseña</button>
      </div>
    </div>
  </div>

  <!-- Modal Crear Usuario -->
  <div id="modalCrear" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-[#181614] border border-[#2e2721] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-bold text-white">Crear Nuevo Operador</h3>
        <button id="btnCloseModalCrear" class="text-[#7a6f5f] hover:text-white text-xl font-bold">&times;</button>
      </div>
      <form id="formCrearUsuario" class="space-y-3">
        <div>
          <label class="text-xs text-[#ede7dc]">Nombre Completo</label>
          <input type="text" id="nuevoNombre" required placeholder="Ej. Carlos Migue" class="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white">
        </div>
        <div>
          <label class="text-xs text-[#ede7dc]">Correo Electrónico</label>
          <input type="email" id="nuevoEmail" required placeholder="carlos@donamigue.com" class="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white">
        </div>
        <div>
          <label class="text-xs text-[#ede7dc]">Contraseña Inicial</label>
          <input type="text" id="nuevoPass" required placeholder="Migue2026*" class="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-[#ede7dc]">Rol</label>
            <select id="nuevoRol" class="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white">
              <option value="ADMIN">ADMIN</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="CAJERO">CAJERO</option>
              <option value="MESERO">MESERO</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-[#ede7dc]">Sucursal ID</label>
            <input type="number" id="nuevaSucursal" value="1" class="mt-1 w-full px-3 py-2 bg-[#100f0e] border border-[#2b2520] rounded-xl text-xs text-white">
          </div>
        </div>
        <button type="submit" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs mt-2">
          Crear Cuenta y Asignar Rol
        </button>
      </form>
    </div>
  </div>

  <script>
    let resetTargetId = null;

    function mostrarAlerta(msg, clases) {
      const b = document.getElementById('alertBox');
      if (!b) return;
      b.className = 'p-4 rounded-2xl text-xs font-medium ' + clases;
      b.innerText = msg;
      b.classList.remove('hidden');
      setTimeout(() => b.classList.add('hidden'), 8000);
    }

    async function cargarStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const txtUrl = document.getElementById('txtUrl');
        const txtAnon = document.getElementById('txtAnon');
        const txtService = document.getElementById('txtService');
        const inputUrl = document.getElementById('inputUrl');
        const inputAnon = document.getElementById('inputAnon');

        if (txtUrl) txtUrl.innerText = data.url || 'No configurada';
        if (txtAnon) {
          txtAnon.innerText = data.hasAnonKey ? 'Activa (' + data.anonKeyLength + ' chars)' : 'Incompleta o Ausente';
          txtAnon.className = data.hasAnonKey ? 'font-bold text-emerald-400' : 'font-bold text-rose-400';
        }
        if (txtService) {
          txtService.innerText = data.hasServiceKey ? 'Configurada (' + data.serviceKeyLength + ' chars)' : 'No configurada (Opcional)';
          txtService.className = data.hasServiceKey ? 'font-bold text-emerald-400' : 'font-bold text-amber-400';
        }

        if (inputUrl) inputUrl.value = data.url || '';
        if (inputAnon) inputAnon.value = data.hasAnonKey ? '••••••••' : '';
      } catch (e) {
        console.error('Error al cargar status:', e);
      }
    }

    async function cargarUsuarios() {
      const tbody = document.getElementById('tbodyUsuarios');
      if (!tbody) return;

      try {
        const res = await fetch('/api/users');
        const data = await res.json();

        if (data.errorAuth && !data.hasServiceKey) {
          mostrarAlerta('ℹ️ ' + data.errorAuth + ' Puedes añadir la service_role key en "Editar Claves (.env)" para gestionar auth.users directamente.', 'bg-amber-950/40 text-amber-300 border border-amber-800/40');
        }

        const mapa = {};
        (data.authUsers || []).forEach(u => {
          mapa[u.id] = { ...u, nombre: 'Sin perfil en public.usuarios', rol: 'Sin rol', activo: true };
        });

        (data.appUsers || []).forEach(u => {
          if (mapa[u.id]) {
            mapa[u.id].nombre = u.nombre_completo;
            mapa[u.id].rol = u.rol;
            mapa[u.id].sucursal_id = u.sucursal_id;
            mapa[u.id].activo = u.activo;
          } else {
            mapa[u.id] = { id: u.id, email: '(Sin email en auth.users)', nombre: u.nombre_completo, rol: u.rol, sucursal_id: u.sucursal_id, activo: u.activo };
          }
        });

        const lista = Object.values(mapa);
        const badge = document.getElementById('badgeTotal');
        if (badge) badge.innerText = lista.length + ' usuarios';

        if (lista.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="py-12 text-center text-[#7a6f5f]">No se encontraron usuarios registrados en la base de datos.<br><button onclick="window.abrirModalCrear()" class="mt-2 text-amber-400 underline font-semibold">+ Crear el primer usuario Administrador</button></td></tr>';
          return;
        }

        tbody.innerHTML = lista.map(u => {
          const emailDisplay = u.email || 'N/A';
          const nombreDisplay = u.nombre || 'Sin nombre';
          const idDisplay = u.id || '';
          return '<tr class="hover:bg-[#1f1c19] transition">' +
            '<td class="py-3.5 px-4"><span class="font-bold text-white block">' + emailDisplay + '</span><span class="text-[10px] text-[#7a6f5f] font-mono">' + idDisplay + '</span></td>' +
            '<td class="py-3.5 px-4 text-[#ede7dc] font-semibold">' + nombreDisplay + '</td>' +
            '<td class="py-3.5 px-4"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ' + (u.rol === 'ADMIN' ? 'bg-amber-600/20 text-amber-300 border border-amber-600/30' : 'bg-[#221f1c] text-[#a89b88]') + '">' + (u.rol || 'N/A') + '</span></td>' +
            '<td class="py-3.5 px-4 text-[#9c907f]">' + (u.sucursal_id ? 'Sucursal #' + u.sucursal_id : 'Global') + '</td>' +
            '<td class="py-3.5 px-4">' + (u.confirmedAt ? '<span class="text-emerald-400 font-bold">Sí</span>' : '<span class="text-amber-400 font-bold">Sin confirmar</span>') + '</td>' +
            '<td class="py-3.5 px-4 text-right"><button onclick="window.abrirModalReset(\\'' + idDisplay + '\\', \\'' + (u.email || u.nombre || idDisplay) + '\\')" class="px-2.5 py-1 rounded-lg bg-[#221f1c] hover:bg-amber-600/20 text-amber-400 border border-[#332c25] hover:border-amber-600/40 text-[11px] font-semibold transition">Reset Clave</button></td>' +
          '</tr>';
        }).join('');

      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-rose-400">Error al cargar usuarios: ' + err.message + '</td></tr>';
      }
    }

    async function cargarTodo() {
      await cargarStatus();
      await cargarUsuarios();
    }

    function toggleConfig() {
      const form = document.getElementById('formConfig');
      if (form) form.classList.toggle('hidden');
    }

    async function guardarClaves(e) {
      if (e) e.preventDefault();
      const url = document.getElementById('inputUrl')?.value || '';
      const anonKey = document.getElementById('inputAnon')?.value || '';
      const serviceKey = document.getElementById('inputService')?.value || '';

      const payload = { url };
      if (anonKey && !anonKey.includes('•••')) payload.anonKey = anonKey;
      if (serviceKey) payload.serviceKey = serviceKey;

      try {
        const res = await fetch('/api/save-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (d.ok) {
          mostrarAlerta('✅ Claves guardadas exitosamente en .env', 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40');
          toggleConfig();
          cargarTodo();
        } else {
          mostrarAlerta('❌ ' + d.error, 'bg-rose-950/40 text-rose-300 border border-rose-800/40');
        }
      } catch (err) {
        mostrarAlerta('❌ Error de red: ' + err.message, 'bg-rose-950/40 text-rose-300 border border-rose-800/40');
      }
    }

    function abrirModalReset(id, nombre) {
      resetTargetId = id;
      const tName = document.getElementById('resetTargetName');
      const tPass = document.getElementById('inputNewPassword');
      const m = document.getElementById('modalReset');
      if (tName) tName.innerText = nombre;
      if (tPass) tPass.value = '';
      if (m) m.classList.remove('hidden');
    }

    function cerrarModalReset() {
      const m = document.getElementById('modalReset');
      if (m) m.classList.add('hidden');
    }

    async function ejecutarResetPassword() {
      const input = document.getElementById('inputNewPassword');
      const newPassword = input ? input.value.trim() : '';
      if (!newPassword) return alert('Por favor escribe la nueva contraseña');

      try {
        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: resetTargetId, newPassword }),
        });
        const data = await res.json();
        if (data.ok) {
          mostrarAlerta('✅ ' + data.message, 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40');
          cerrarModalReset();
        } else {
          if (data.sqlSuggestion) {
            const pre = document.getElementById('sqlOutput');
            if (pre) {
              pre.innerText = data.sqlSuggestion;
              pre.classList.remove('hidden');
            }
          }
          mostrarAlerta('⚠️ ' + data.error, 'bg-amber-950/40 text-amber-300 border border-amber-800/40');
          cerrarModalReset();
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    function abrirModalCrear() {
      const m = document.getElementById('modalCrear');
      if (m) m.classList.remove('hidden');
    }

    function cerrarModalCrear() {
      const m = document.getElementById('modalCrear');
      if (m) m.classList.add('hidden');
    }

    async function ejecutarCrearUsuario(e) {
      if (e) e.preventDefault();
      const nombreCompleto = document.getElementById('nuevoNombre')?.value.trim() || '';
      const email = document.getElementById('nuevoEmail')?.value.trim() || '';
      const password = document.getElementById('nuevoPass')?.value.trim() || '';
      const rol = document.getElementById('nuevoRol')?.value || 'ADMIN';
      const sucursalId = document.getElementById('nuevaSucursal')?.value || '1';

      try {
        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombreCompleto, email, password, rol, sucursalId }),
        });
        const d = await res.json();
        if (d.ok) {
          mostrarAlerta('✅ ' + d.message, 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40');
          cerrarModalCrear();
          cargarUsuarios();
        } else {
          mostrarAlerta('❌ ' + d.error, 'bg-rose-950/40 text-rose-300 border border-rose-800/40');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    function generarSql() {
      const email = document.getElementById('sqlEmail')?.value.trim() || '';
      const pass = document.getElementById('sqlPass')?.value.trim() || '';
      if (!email || !pass) return alert('Ingresa correo y contraseña');
      const sql = "UPDATE auth.users\\nSET encrypted_password = crypt('" + pass + "', gen_salt('bf'))\\nWHERE email = '" + email + "';";
      const pre = document.getElementById('sqlOutput');
      if (pre) {
        pre.innerText = sql;
        pre.classList.remove('hidden');
      }
    }

    // Exponer al objeto window global
    window.cargarTodo = cargarTodo;
    window.toggleConfig = toggleConfig;
    window.guardarClaves = guardarClaves;
    window.abrirModalReset = abrirModalReset;
    window.cerrarModalReset = cerrarModalReset;
    window.ejecutarResetPassword = ejecutarResetPassword;
    window.abrirModalCrear = abrirModalCrear;
    window.cerrarModalCrear = cerrarModalCrear;
    window.ejecutarCrearUsuario = ejecutarCrearUsuario;
    window.generarSql = generarSql;

    // Vincular Event Listeners al cargar el DOM
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('btnActualizar')?.addEventListener('click', cargarTodo);
      document.getElementById('btnNuevoUsuario')?.addEventListener('click', abrirModalCrear);
      document.getElementById('btnToggleConfig')?.addEventListener('click', toggleConfig);
      document.getElementById('formConfig')?.addEventListener('submit', guardarClaves);
      document.getElementById('btnGenerarSql')?.addEventListener('click', generarSql);
      document.getElementById('btnCloseModalReset')?.addEventListener('click', cerrarModalReset);
      document.getElementById('btnCancelModalReset')?.addEventListener('click', cerrarModalReset);
      document.getElementById('btnSubmitModalReset')?.addEventListener('click', ejecutarResetPassword);
      document.getElementById('btnCloseModalCrear')?.addEventListener('click', cerrarModalCrear);
      document.getElementById('formCrearUsuario')?.addEventListener('submit', ejecutarCrearUsuario);

      cargarTodo();
    });
  </script>
</body>
</html>`;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n============================================================`);
  console.log(`  🔥 Doña Migue - Panel Local de Gestión Supabase Activo   `);
  console.log(`============================================================`);
  console.log(`  🌐 Abre en tu navegador: http://localhost:${PORT}`);
  console.log(`============================================================\n`);
});
