import type { APIRoute } from 'astro';
import { supabaseAdminServer } from '../../../core/supabaseAdminServer';
import { verificarUsuarioPOS } from '../../../core/verifiedPosUser';

export const prerender = false;

const TIPOS_VALIDOS = new Set([
  'ENTRADA_ABASTECIMIENTO',
  'AJUSTE_POSITIVO',
  'AJUSTE_MERMA',
]);

const responder = (payload: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const usuario = await verificarUsuarioPOS(cookies);
    if (!usuario) return responder({ ok: false, error: 'Sesión vencida. Inicia sesión otra vez.' }, 401);
    if (usuario.rol !== 'ADMIN' && usuario.rol !== 'SUPERVISOR') {
      return responder({ ok: false, error: 'No tienes permiso para ajustar inventario.' }, 403);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return responder({ ok: false, error: 'La solicitud no contiene JSON válido.' }, 400);
    }

    const productoId = Number(body.producto_id);
    const cantidad = Number(body.cantidad);
    const tipo = typeof body.tipo === 'string' ? body.tipo : '';
    const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : '';

    if (!Number.isSafeInteger(productoId) || productoId <= 0) {
      return responder({ ok: false, error: 'El producto seleccionado no es válido.' }, 400);
    }
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      return responder({ ok: false, error: 'La cantidad debe ser un entero mayor que cero.' }, 400);
    }
    if (!TIPOS_VALIDOS.has(tipo)) {
      return responder({ ok: false, error: 'El tipo de movimiento no es válido.' }, 400);
    }
    if (!motivo || motivo.length > 250) {
      return responder({ ok: false, error: 'El motivo es obligatorio y no puede superar 250 caracteres.' }, 400);
    }

    const { data, error } = await supabaseAdminServer.rpc('ajustar_inventario_pos', {
      p_sucursal_id: usuario.sucursalId,
      p_producto_id: productoId,
      p_usuario_id: usuario.id,
      p_tipo: tipo,
      p_cantidad: cantidad,
      p_motivo: motivo,
    });

    if (error) {
      console.error('Error registrando ajuste de inventario POS:', error);
      return responder({ ok: false, error: error.message || 'No se pudo registrar el ajuste.' }, 400);
    }

    return responder({ ok: true, resultado: data }, 200);
  } catch (error) {
    console.error('Error en /api/inventario/ajustar:', error);
    return responder(
      { ok: false, error: error instanceof Error ? error.message : 'Error interno al ajustar inventario.' },
      500
    );
  }
};
