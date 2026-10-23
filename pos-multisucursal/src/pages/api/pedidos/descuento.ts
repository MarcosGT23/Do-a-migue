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
    const descuento = Math.max(0, Number(body.descuento) || 0);

    if (!pedidoId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ID de pedido inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: pedido, error: errPedido } = await supabaseAdminServer
      .from('pedidos')
      .select('id, subtotal, estado')
      .eq('id', pedidoId)
      .single();

    if (errPedido || !pedido) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Pedido no encontrado.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (pedido.estado === 'ANULADO') {
      return new Response(
        JSON.stringify({ ok: false, error: 'No se puede descontar un pedido anulado.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const descuentoFinal = Math.min(descuento, Number(pedido.subtotal) || 0);

    const { data: actualizado, error: errUpdate } = await supabaseAdminServer
      .from('pedidos')
      .update({ descuento: descuentoFinal, updated_at: new Date().toISOString() })
      .eq('id', pedidoId)
      .select('id, subtotal, descuento, total')
      .single();

    if (errUpdate) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No se pudo aplicar el descuento: ' + errUpdate.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, pedido: actualizado }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/pedidos/descuento:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
