import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdminServer } from '../../../core/supabaseAdminServer';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://chtfqkriruyxvjxmmazl.supabase.co';
const supabaseAnonKey =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodGZxa3JpcnV5eHZqeG1tYXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzk1ODMsImV4cCI6MjA4Njk1NTU4M30.ql4JMrg9OcJ6DKNpFu3Q2ncw30NMT3ebAWVNT0dhQ18';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const rawEmail = body.email || '';
    const rawPassword = body.password || '';

    if (!rawEmail || !rawPassword) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Correo electrónico y contraseña requeridos.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Normalizar y resolver alias de correo
    let cleanEmail = rawEmail.trim().toLowerCase();
    if (['admin', 'hernan', 'administrador'].includes(cleanEmail)) {
      cleanEmail = 'hernan@donamigue.com';
    } else if (cleanEmail === 'marcos' || cleanEmail === 'marcos.caja') {
      cleanEmail = 'marcos.caja@kjaras.local';
    } else if (['caja', 'cajero', 'pos'].includes(cleanEmail)) {
      cleanEmail = 'cajero@donamigue.com';
    }

    // 2. Cliente de autenticación aislado para validar credenciales sin tocar los headers de supabaseAdminServer
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
      email: cleanEmail,
      password: rawPassword,
    });

    if (authErr || !authData?.user) {
      const { data: listData } = await supabaseAdminServer.auth.admin.listUsers();
      const userExists = listData?.users?.some((u) => u.email?.toLowerCase() === cleanEmail);

      let mensajeError = `Contraseña incorrecta para "${cleanEmail}".`;
      if (!userExists) {
        const correosDisponibles = (listData?.users || [])
          .map((u) => u.email)
          .filter(Boolean)
          .join(', ');
        mensajeError = `El usuario "${rawEmail}" no está registrado. Cuentas activas: ${correosDisponibles}`;
      }

      return new Response(
        JSON.stringify({ ok: false, error: mensajeError }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;

    // 3. Consultar perfil en tabla public.usuarios usando supabaseAdminServer (con service_role key intacta)
    const { data: perfil } = await supabaseAdminServer
      .from('usuarios')
      .select('id, nombre_completo, rol, sucursal_id, activo')
      .eq('id', userId)
      .maybeSingle();

    if (perfil && perfil.activo === false) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Esta cuenta ha sido desactivada por la administración.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Determinar rol estricto desde la base de datos
    const rol = ((perfil?.rol || 'CAJERO') as string).toUpperCase();
    const esAdmin = rol === 'ADMIN' || rol === 'SUPERVISOR';
    const sucursalId = perfil?.sucursal_id || 1;

    // 5. Consultar nombre de la sucursal
    const { data: sucursal } = await supabaseAdminServer
      .from('sucursales')
      .select('nombre')
      .eq('id', sucursalId)
      .maybeSingle();

    const nombreCompleto = perfil?.nombre_completo || authData.user.email?.split('@')[0] || 'Operador';
    const sucursalNombre = sucursal?.nombre || 'Sucursal Central';

    const sesionData = {
      usuarioId: userId,
      nombreCompleto,
      rol,
      sucursalId,
      sucursalNombre,
      esAdminOSupervisor: esAdmin,
      autenticado: true,
    };

    // 6. Guardar cookies compatibles con Astro SSR
    cookies.set('dona_migue_user', encodeURIComponent(JSON.stringify(sesionData)), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      sameSite: 'lax',
      httpOnly: false,
    });

    if (authData.session?.access_token) {
      cookies.set('sb-access-token', authData.session.access_token, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        httpOnly: false,
      });
    }

    const destino = esAdmin ? '/admin/dashboard' : '/pos';

    return new Response(
      JSON.stringify({
        ok: true,
        session: authData.session,
        perfil: sesionData,
        destino,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error en el servidor al autenticar' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
