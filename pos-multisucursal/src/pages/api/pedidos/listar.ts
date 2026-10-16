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
    const cajaId = url.searchParams.get('cajaId');
    const estado = url.searchParams.get('estado');

    let query = supabaseAdminServer
      .from('pedidos')
      .select(`
        id,
        sucursal_id,
        apertura_caja_id,
        usuario_id,
        cliente_nombre,
        numero_mesa,
        estado,
        subtotal,
        descuento,
        total,
        anulado_por,
        motivo_anulacion,
        anulado_at,
        created_at,
        updated_at,
        detalle_pedidos (
          id,
          pedido_id,
          producto_id,
          cantidad,
          precio_unitario,
          descuento_item,
          subtotal,
          notas,
          productos ( id, nombre, precio_base, categoria_id, imagen_url )
        ),
        pagos (
          id,
          pedido_id,
          apertura_caja_id,
          usuario_id,
          metodo,
          monto,
          referencia_pago,
          created_at
        ),
        usuarios:usuarios!pedidos_usuario_id_fkey (
          id,
          nombre_completo,
          rol
        )
      `)
      .eq('sucursal_id', sucursalId)
      .order('created_at', { ascending: false });

    if (cajaId) {
      query = query.eq('apertura_caja_id', Number(cajaId));
    }

    if (estado && estado !== 'TODOS') {
      query = query.eq('estado', estado);
    }

    const { data: pedidos, error } = await query;

    if (error) {
      console.error('Error listando pedidos:', error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        pedidos: pedidos || [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/pedidos/listar:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
