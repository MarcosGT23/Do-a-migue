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
    const clienteNombre = (body.cliente_nombre || 'Cliente Mostrador').trim();
    const numeroMesa = body.numero_mesa ? Number(body.numero_mesa) : null;
    const descuentoGlobal = Math.max(0, parseFloat(body.descuento) || 0);
    const items = body.items || [];
    const metodoPago = body.metodo_pago;

    if (!pedidoId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ID de pedido inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'El pedido debe tener al menos un producto.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener el pedido actual y sus detalles
    const { data: pedidoActual, error: errPed } = await supabaseAdminServer
      .from('pedidos')
      .select('*, detalle_pedidos(*), pagos(*)')
      .eq('id', pedidoId)
      .single();

    if (errPed || !pedidoActual) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Pedido no encontrado.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (pedidoActual.estado === 'ANULADO') {
      return new Response(
        JSON.stringify({ ok: false, error: 'No se puede editar un pedido anulado.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Ajustar inventario según diferencias de cantidad
    const itemsAnteriores = pedidoActual.detalle_pedidos || [];
    const mapaAnterior = new Map<number, number>();
    for (const it of itemsAnteriores) {
      mapaAnterior.set(it.producto_id, (mapaAnterior.get(it.producto_id) || 0) + it.cantidad);
    }

    const mapaNuevo = new Map<number, number>();
    for (const it of items) {
      mapaNuevo.set(it.producto_id, (mapaNuevo.get(it.producto_id) || 0) + Number(it.cantidad));
    }

    // Lista de todos los productos involucrados
    const todosProductos = new Set([...mapaAnterior.keys(), ...mapaNuevo.keys()]);
    for (const prodId of todosProductos) {
      const cantAnterior = mapaAnterior.get(prodId) || 0;
      const cantNueva = mapaNuevo.get(prodId) || 0;
      const diferencia = cantNueva - cantAnterior;

      if (diferencia !== 0) {
        // Consultar stock actual
        const { data: invRow } = await supabaseAdminServer
          .from('inventario')
          .select('stock_actual')
          .eq('sucursal_id', pedidoActual.sucursal_id)
          .eq('producto_id', prodId)
          .maybeSingle();

        if (invRow) {
          const nuevoStock = Math.max(0, invRow.stock_actual - diferencia);
          await supabaseAdminServer
            .from('inventario')
            .update({ stock_actual: nuevoStock })
            .eq('sucursal_id', pedidoActual.sucursal_id)
            .eq('producto_id', prodId);
        }
      }
    }

    // 3. Calcular nuevos totales
    let subtotalCalculado = 0;
    const nuevosDetalles = items.map((it: any) => {
      const cantidad = Math.max(1, Number(it.cantidad) || 1);
      const precioUnitario = Number(it.precio_unitario) || 0;
      const descItem = Math.max(0, Number(it.descuento_item) || 0);
      const itemSubtotal = Math.max(0, cantidad * precioUnitario - descItem);
      subtotalCalculado += itemSubtotal;

      return {
        pedido_id: pedidoId,
        producto_id: it.producto_id,
        cantidad,
        precio_unitario: precioUnitario,
        descuento_item: descItem,
        subtotal: itemSubtotal,
        notas: it.notas || '',
      };
    });

    const totalCalculado = Math.max(0, subtotalCalculado - descuentoGlobal);

    // 4. Reemplazar filas en detalle_pedidos
    await supabaseAdminServer.from('detalle_pedidos').delete().eq('pedido_id', pedidoId);
    const { error: insDetErr } = await supabaseAdminServer.from('detalle_pedidos').insert(nuevosDetalles);
    if (insDetErr) {
      console.error('Error insertando nuevos detalle_pedidos:', insDetErr);
    }

    // 5. Actualizar el pedido
    const { data: pedidoActualizado, error: updPedErr } = await supabaseAdminServer
      .from('pedidos')
      .update({
        cliente_nombre: clienteNombre,
        numero_mesa: numeroMesa,
        subtotal: subtotalCalculado,
        descuento: descuentoGlobal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedidoId)
      .select(`
        *,
        detalle_pedidos (
          id, producto_id, cantidad, precio_unitario, descuento_item, subtotal, notas,
          productos ( id, nombre, precio_base, categoria_id, imagen_url )
        ),
        pagos (*),
        usuarios:usuarios!pedidos_usuario_id_fkey ( id, nombre_completo, rol )
      `)
      .single();

    if (updPedErr) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Error actualizando pedido: ' + updPedErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Actualizar pago si existe
    if (pedidoActual.pagos && pedidoActual.pagos.length > 0) {
      const updatePago: any = { monto: totalCalculado };
      if (metodoPago) {
        updatePago.metodo = metodoPago;
      }
      await supabaseAdminServer
        .from('pagos')
        .update(updatePago)
        .eq('pedido_id', pedidoId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        pedido: pedidoActualizado,
        mensaje: `Pedido #${pedidoId} actualizado correctamente.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/pedidos/editar:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
