import type { APIRoute } from 'astro';
import { supabaseAdminServer } from '../../../core/supabaseAdminServer';
import { obtenerContextoSesion } from '../../../core/sessionContext';
import { existeColumnaNumeroFicha } from '../../../core/columnaNumeroFicha';

export const prerender = false;

/**
 * Consulta el número de ficha del turno.
 *
 * GET /api/pedidos/ficha?pedidoId=123        -> { ok, numero_ficha: 4 }
 * GET /api/pedidos/ficha?aperturaCajaId=33   -> { ok, numero_ficha: 4, proxima_ficha: 5 }
 *
 * La ficha la asigna el trigger de la base de datos (trg_pedidos_numero_ficha)
 * y se reinicia en 1 cada vez que se abre una nueva caja.
 */
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
    const pedidoId = Number(url.searchParams.get('pedidoId')) || null;
    const cajaId = Number(url.searchParams.get('aperturaCajaId')) || null;

    if (!pedidoId && !cajaId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Indica pedidoId o aperturaCajaId.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Si la migración todavía no está aplicada no hay ficha que mostrar.
    if (!(await existeColumnaNumeroFicha())) {
      return new Response(
        JSON.stringify({ ok: true, numero_ficha: null, proxima_ficha: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (pedidoId) {
      const { data, error } = await supabaseAdminServer
        .from('pedidos')
        .select('numero_ficha, apertura_caja_id')
        .eq('id', pedidoId)
        .maybeSingle();

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          numero_ficha: data?.numero_ficha ?? null,
          apertura_caja_id: data?.apertura_caja_id ?? null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Con la caja: la última ficha usada y la siguiente.
    const { data, error } = await supabaseAdminServer
      .from('pedidos')
      .select('numero_ficha')
      .eq('apertura_caja_id', cajaId)
      .not('numero_ficha', 'is', null)
      .order('numero_ficha', { ascending: false })
      .limit(1);

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ultima = data && data.length > 0 ? Number(data[0].numero_ficha) : 0;

    return new Response(
      JSON.stringify({
        ok: true,
        numero_ficha: ultima || null,
        proxima_ficha: ultima + 1,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/pedidos/ficha:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
