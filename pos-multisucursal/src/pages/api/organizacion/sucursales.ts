import type { APIRoute } from 'astro';
import { supabaseAdminServer } from '../../../core/supabaseAdminServer';
import { obtenerContextoSesion } from '../../../core/sessionContext';

export const prerender = false;

// GET: Listar sucursales
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sesion = await obtenerContextoSesion(cookies);
    if (!sesion.autenticado) {
      return new Response(JSON.stringify({ ok: false, error: 'No autorizado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabaseAdminServer
      .from('sucursales')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Crear sucursal
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sesion = await obtenerContextoSesion(cookies);
    if (!sesion.autenticado || !sesion.esAdminOSupervisor) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado. Se requieren permisos de administrador.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const nombre = (body.nombre || '').trim();
    const direccion = (body.direccion || '').trim();
    const telefono = (body.telefono || '').trim();

    if (!nombre) {
      return new Response(
        JSON.stringify({ ok: false, error: 'El nombre de la sucursal es obligatorio.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Insertar sucursal
    const { data: nuevaSucursal, error: sucError } = await supabaseAdminServer
      .from('sucursales')
      .insert({
        nombre,
        direccion: direccion || 'Sin dirección',
        telefono: telefono || 'Sin teléfono',
        activa: true,
      })
      .select()
      .single();

    if (sucError) throw sucError;

    // 2. Inicializar inventario para todos los productos existentes en esta nueva sucursal
    try {
      const { data: productos } = await supabaseAdminServer
        .from('productos')
        .select('id');

      if (productos && productos.length > 0) {
        const inventarios = productos.map((p) => ({
          sucursal_id: nuevaSucursal.id,
          producto_id: p.id,
          stock_actual: 0,
          stock_minimo: 5,
        }));

        await supabaseAdminServer
          .from('inventario')
          .upsert(inventarios, { onConflict: 'sucursal_id,producto_id' });
      }
    } catch (invErr) {
      console.warn('Aviso inicializando inventario en nueva sucursal:', invErr);
    }

    return new Response(JSON.stringify({ ok: true, data: nuevaSucursal }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error al crear sucursal.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT: Actualizar sucursal (nombre, dirección, teléfono, estado activa)
export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const sesion = await obtenerContextoSesion(cookies);
    if (!sesion.autenticado || !sesion.esAdminOSupervisor) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado. Se requieren permisos de administrador.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const id = Number(body.id);
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ID de sucursal inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updateData: Record<string, any> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim();
    if (body.direccion !== undefined) updateData.direccion = body.direccion ? body.direccion.trim() : '';
    if (body.telefono !== undefined) updateData.telefono = body.telefono ? body.telefono.trim() : '';
    if (body.activa !== undefined) updateData.activa = Boolean(body.activa);

    const { data: sucursalActualizada, error } = await supabaseAdminServer
      .from('sucursales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, data: sucursalActualizada }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error al actualizar sucursal.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Eliminar sucursal
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const sesion = await obtenerContextoSesion(cookies);
    if (!sesion.autenticado || !sesion.esAdminOSupervisor) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado. Se requieren permisos de administrador.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const id = Number(body.id);
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ID de sucursal inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Verificar si tiene pedidos o cajas asociadas
    const { data: pedidos, error: errPed } = await supabaseAdminServer
      .from('pedidos')
      .select('id')
      .eq('sucursal_id', id)
      .limit(1);

    if (errPed) throw errPed;

    const { data: cajas, error: errCajas } = await supabaseAdminServer
      .from('apertura_cajas')
      .select('id')
      .eq('sucursal_id', id)
      .limit(1);

    if (errCajas) throw errCajas;

    if ((pedidos && pedidos.length > 0) || (cajas && cajas.length > 0)) {
      // Si tiene historial, desactivar en lugar de borrar para proteger la integridad contable
      await supabaseAdminServer
        .from('sucursales')
        .update({ activa: false })
        .eq('id', id);

      return new Response(
        JSON.stringify({
          ok: true,
          desactivada: true,
          message: 'La sucursal tiene ventas o cajas registradas en el sistema. Ha sido deshabilitada (Inactiva) para conservar los registros de auditoría.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Si no tiene pedidos ni cajas, limpiar inventario de la sucursal y eliminar la sucursal
    await supabaseAdminServer
      .from('inventario')
      .delete()
      .eq('sucursal_id', id);

    // Reasignar usuarios de esta sucursal a null (global)
    await supabaseAdminServer
      .from('usuarios')
      .update({ sucursal_id: null })
      .eq('sucursal_id', id);

    const { error: delError } = await supabaseAdminServer
      .from('sucursales')
      .delete()
      .eq('id', id);

    if (delError) throw delError;

    return new Response(
      JSON.stringify({ ok: true, message: 'Sucursal eliminada permanentemente.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error al eliminar sucursal.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
