import type { APIRoute } from 'astro';
import { supabaseAdminServer } from '../../../core/supabaseAdminServer';
import { obtenerContextoSesion } from '../../../core/sessionContext';

export const prerender = false;

// GET: Listar categorías
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
      .from('categorias')
      .select('*')
      .order('orden', { ascending: true });

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

// POST: Crear categoría
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
    const descripcion = (body.descripcion || '').trim();
    const orden = Number(body.orden) || 1;

    if (!nombre) {
      return new Response(
        JSON.stringify({ ok: false, error: 'El nombre de la categoría es obligatorio.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabaseAdminServer
      .from('categorias')
      .insert({
        nombre,
        descripcion: descripcion || null,
        orden,
        activa: true,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error al crear categoría.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT: Actualizar categoría
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
        JSON.stringify({ ok: false, error: 'ID de categoría inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updateData: Record<string, any> = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre.trim();
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion ? body.descripcion.trim() : null;
    if (body.orden !== undefined) updateData.orden = Number(body.orden);
    if (body.activa !== undefined) updateData.activa = Boolean(body.activa);

    const { data, error } = await supabaseAdminServer
      .from('categorias')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error al actualizar categoría.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE: Eliminar categoría
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
        JSON.stringify({ ok: false, error: 'ID de categoría inválido.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar si hay platos o productos asignados a esta categoría
    const { data: productosAsociados, error: checkError } = await supabaseAdminServer
      .from('productos')
      .select('id, nombre')
      .eq('categoria_id', id);

    if (checkError) throw checkError;

    if (productosAsociados && productosAsociados.length > 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `No puedes eliminar esta categoría porque contiene ${productosAsociados.length} plato(s) asociado(s). Reasigna o elimina los platos primero.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error: deleteError } = await supabaseAdminServer
      .from('categorias')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ ok: true, message: 'Categoría eliminada con éxito.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error al eliminar categoría.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
