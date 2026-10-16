import type { APIRoute } from 'astro';
import { supabaseAdminServer } from '../../../core/supabaseAdminServer';
import { obtenerContextoSesion } from '../../../core/sessionContext';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sesion = await obtenerContextoSesion(cookies);
    if (!sesion.autenticado) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado. Por favor inicia sesión.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const aperturaCajaId = Number(body.apertura_caja_id);
    const montoEfectivoDeclarado = Math.max(0, parseFloat(body.monto_efectivo_declarado) || 0);
    const montoDigitalDeclarado = Math.max(0, parseFloat(body.monto_digital_declarado) || 0);
    const observaciones = body.observaciones?.trim() || null;

    if (!aperturaCajaId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ID de caja no proporcionado.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: resultadoArqueo, error: rpcErr } = await supabaseAdminServer.rpc('cerrar_caja_pos', {
      p_apertura_caja_id: aperturaCajaId,
      p_monto_efectivo_declarado: montoEfectivoDeclarado,
      p_monto_digital_declarado: montoDigitalDeclarado,
      p_observaciones: observaciones,
    });

    if (rpcErr) {
      console.error('Error cerrando caja vía RPC:', rpcErr);
      return new Response(
        JSON.stringify({ ok: false, error: rpcErr.message || 'Error al cerrar caja.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        arqueo: resultadoArqueo,
        mensaje: `Caja #${aperturaCajaId} cerrada correctamente.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/caja/cerrar:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
