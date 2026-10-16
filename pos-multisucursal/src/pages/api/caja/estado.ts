import type { APIRoute } from 'astro';
import { supabaseAdminServer } from '../../../core/supabaseAdminServer';
import { obtenerContextoSesion } from '../../../core/sessionContext';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const sesion = await obtenerContextoSesion(cookies);
    if (!sesion.autenticado) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado. Por favor inicia sesión.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const sucursalId = Number(url.searchParams.get('sucursalId')) || sesion.sucursalId || 1;

    const { data: cajaAbierta, error } = await supabaseAdminServer
      .from('apertura_cajas')
      .select('id, sucursal_id, usuario_id, monto_inicial, fecha_inicio, estado, monto_efectivo_sistema, monto_digital_sistema, usuarios(nombre_completo, rol)')
      .eq('sucursal_id', sucursalId)
      .eq('estado', 'ABIERTA')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error consultando estado de caja:', error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        hayCajaAbierta: !!cajaAbierta,
        caja: cajaAbierta || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/caja/estado:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
