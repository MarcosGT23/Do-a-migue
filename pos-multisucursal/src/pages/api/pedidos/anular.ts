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
    const pedidoId = Number(body.pedido_id);
    const motivo = (body.motivo || 'Anulación solicitada desde terminal POS').trim();
    const devolverStock = body.devolver_stock !== false; // default true

    if (!pedidoId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ID de pedido inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabaseAdminServer.rpc('anular_pedido_pos', {
      p_pedido_id: pedidoId,
      p_usuario_id: sesion.usuarioId,
      p_motivo: motivo,
      p_devolver_stock: devolverStock,
    });

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message || 'Error anulando pedido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        resultado: data,
        mensaje: `Pedido #${pedidoId} anulado exitosamente.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/pedidos/anular:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
