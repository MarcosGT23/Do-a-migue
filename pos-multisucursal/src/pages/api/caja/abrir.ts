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
    const sucursalId = Number(body.sucursal_id) || sesion.sucursalId || 1;
    const montoInicial = Math.max(0, parseFloat(body.monto_inicial) || 0);
    const usuarioId = sesion.usuarioId || body.usuario_id;

    // 1. Verificar si ya existe una caja abierta en esta sucursal
    const { data: cajaExistente } = await supabaseAdminServer
      .from('apertura_cajas')
      .select('id, sucursal_id, usuario_id, monto_inicial, fecha_inicio, estado, usuarios(nombre_completo, rol)')
      .eq('sucursal_id', sucursalId)
      .eq('estado', 'ABIERTA')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cajaExistente) {
      return new Response(
        JSON.stringify({
          ok: true,
          yaAbierta: true,
          caja: cajaExistente,
          mensaje: `Ya existe una caja abierta (#${cajaExistente.id}) en esta sucursal.`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Aperturar nueva caja
    const { data: nuevaCaja, error: insertErr } = await supabaseAdminServer
      .from('apertura_cajas')
      .insert({
        sucursal_id: sucursalId,
        usuario_id: usuarioId,
        monto_inicial: montoInicial,
        monto_efectivo_sistema: 0,
        monto_digital_sistema: 0,
        estado: 'ABIERTA',
        fecha_inicio: new Date().toISOString(),
      })
      .select('id, sucursal_id, usuario_id, monto_inicial, fecha_inicio, estado, usuarios(nombre_completo, rol)')
      .single();

    if (insertErr) {
      console.error('Error insertando apertura_cajas:', insertErr);
      return new Response(
        JSON.stringify({ ok: false, error: 'Error en base de datos al abrir caja: ' + insertErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        yaAbierta: false,
        caja: nuevaCaja,
        mensaje: `Caja #${nuevaCaja.id} aperturada con éxito con Bs ${montoInicial}.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/caja/abrir:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
