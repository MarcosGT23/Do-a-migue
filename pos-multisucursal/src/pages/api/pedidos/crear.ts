import type { APIRoute } from 'astro';
import { supabaseAdminServer } from '../../../core/supabaseAdminServer';
import { verificarUsuarioPOS } from '../../../core/verifiedPosUser';

export const prerender = false;

interface ItemPedido {
  producto_id: number;
  cantidad: number;
  descuento_item: number;
  notas?: string;
}

const responder = (payload: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const usuario = await verificarUsuarioPOS(cookies);
    if (!usuario) return responder({ ok: false, error: 'Sesión vencida. Inicia sesión otra vez.' }, 401);

    const body = await request.json();
    const aperturaCajaId = Number(body.apertura_caja_id);
    const clienteNombre = typeof body.cliente_nombre === 'string' ? body.cliente_nombre.trim() : '';
    const tipoServicio = body.tipo_servicio === 'llevar' ? 'llevar' : 'mesa';
    const items: ItemPedido[] = body.items;

    if (!Number.isSafeInteger(aperturaCajaId) || aperturaCajaId <= 0) {
      return responder({ ok: false, error: 'La caja seleccionada no es válida.' }, 400);
    }
    if (!clienteNombre || clienteNombre.length > 120) {
      return responder({ ok: false, error: 'El nombre del cliente no es válido.' }, 400);
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return responder({ ok: false, error: 'El pedido debe contener entre 1 y 100 productos.' }, 400);
    }

    for (const item of items) {
      if (
        !Number.isSafeInteger(item.producto_id) ||
        item.producto_id <= 0 ||
        !Number.isSafeInteger(item.cantidad) ||
        item.cantidad <= 0 ||
        !Number.isFinite(item.descuento_item) ||
        item.descuento_item < 0 ||
        (item.notas !== undefined && typeof item.notas !== 'string')
      ) {
        return responder({ ok: false, error: 'Hay un producto con datos inválidos en el pedido.' }, 400);
      }
    }

    const { data: caja, error: cajaError } = await supabaseAdminServer
      .from('apertura_cajas')
      .select('id')
      .eq('id', aperturaCajaId)
      .eq('sucursal_id', usuario.sucursalId)
      .eq('estado', 'ABIERTA')
      .maybeSingle();

    if (cajaError) throw new Error(`No se pudo validar la caja: ${cajaError.message}`);
    if (!caja) return responder({ ok: false, error: 'La caja no está abierta en tu sucursal.' }, 400);

    const { data: pedidoId, error } = await supabaseAdminServer.rpc('crear_pedido_pos', {
      p_apertura_caja_id: aperturaCajaId,
      p_usuario_id: usuario.id,
      p_cliente_nombre: clienteNombre,
      p_numero_mesa: null,
      p_descuento_global: 0,
      p_items: items,
      p_tipo_servicio: tipoServicio,
    });

    if (error) {
      console.error('Error creando pedido POS:', error);
      return responder({ ok: false, error: error.message || 'No se pudo crear el pedido.' }, 400);
    }

    return responder({ ok: true, pedido_id: Number(pedidoId) }, 200);
  } catch (error) {
    console.error('Error en /api/pedidos/crear:', error);
    return responder(
      { ok: false, error: error instanceof Error ? error.message : 'Error interno al crear el pedido.' },
      500
    );
  }
};
