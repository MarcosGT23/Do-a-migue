-- =============================================================================
-- Doña Migue POS - Políticas RLS para Supabase
-- =============================================================================
-- Ejecuta este script en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Situación: la base de datos YA tiene los helpers RLS:
--     public.rls_mi_rol()                       -> text  (rol del usuario actual)
--     public.rls_es_admin_o_supervisor()        -> bool  (true para ADMIN/SUPERVISOR)
--     public.rls_tiene_acceso_sucursal(bigint)  -> bool  (ADMIN: siempre; otros: su sucursal)
--     public.rls_auto_enable()
-- pero las tablas quedaron con RLS habilitado SIN políticas, así que el rol
-- `authenticated` lee 0 filas. Eso rompía el login (perfil = null) y las páginas
-- SSR que usan sesion.supabaseSSR.
--
-- Este script crea las políticas usando esos helpers. Es idempotente: puedes
-- volver a ejecutarlo sin problema.
--
-- Acceso definido:
--   * Lectura global (catálogo): categorias, productos.
--   * Lectura por sucursal: sucursales, inventario, apertura_cajas, pedidos,
--     detalle_pedidos, pagos, movimientos_inventario.
--   * usuarios: cada uno ve su fila; ADMIN/SUPERVISOR ven todas.
--   * Escrituras de catálogo/organización: solo ADMIN/SUPERVISOR.
--   * apertura_cajas: INSERT propio (usuario_id = auth.uid()).
--   * pedidos/pagos/detalle/movimientos/inventario/apertura: escritura vía RPC.
-- =============================================================================


-- =============================================================================
-- usuarios
-- =============================================================================
alter table public.usuarios enable row level security;

drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (id = auth.uid() or public.rls_es_admin_o_supervisor());

drop policy if exists usuarios_insert on public.usuarios;
create policy usuarios_insert on public.usuarios
  for insert to authenticated
  with check (public.rls_es_admin_o_supervisor());

drop policy if exists usuarios_update on public.usuarios;
create policy usuarios_update on public.usuarios
  for update to authenticated
  using (public.rls_es_admin_o_supervisor())
  with check (public.rls_es_admin_o_supervisor());

drop policy if exists usuarios_delete on public.usuarios;
create policy usuarios_delete on public.usuarios
  for delete to authenticated
  using (public.rls_es_admin_o_supervisor());


-- =============================================================================
-- sucursales (lectura: solo sucursales accesibles; escritura: admin/supervisor)
-- =============================================================================
alter table public.sucursales enable row level security;

drop policy if exists sucursales_select on public.sucursales;
create policy sucursales_select on public.sucursales
  for select to authenticated
  using (public.rls_tiene_acceso_sucursal(id));

drop policy if exists sucursales_insert on public.sucursales;
create policy sucursales_insert on public.sucursales
  for insert to authenticated
  with check (public.rls_es_admin_o_supervisor());

drop policy if exists sucursales_update on public.sucursales;
create policy sucursales_update on public.sucursales
  for update to authenticated
  using (public.rls_es_admin_o_supervisor())
  with check (public.rls_es_admin_o_supervisor());

drop policy if exists sucursales_delete on public.sucursales;
create policy sucursales_delete on public.sucursales
  for delete to authenticated
  using (public.rls_es_admin_o_supervisor());


-- =============================================================================
-- categorias (catálogo compartido: lectura para todos; escritura admin/supervisor)
-- =============================================================================
alter table public.categorias enable row level security;

drop policy if exists categorias_select on public.categorias;
create policy categorias_select on public.categorias
  for select to authenticated
  using (true);

drop policy if exists categorias_insert on public.categorias;
create policy categorias_insert on public.categorias
  for insert to authenticated
  with check (public.rls_es_admin_o_supervisor());

drop policy if exists categorias_update on public.categorias;
create policy categorias_update on public.categorias
  for update to authenticated
  using (public.rls_es_admin_o_supervisor())
  with check (public.rls_es_admin_o_supervisor());

drop policy if exists categorias_delete on public.categorias;
create policy categorias_delete on public.categorias
  for delete to authenticated
  using (public.rls_es_admin_o_supervisor());


-- =============================================================================
-- productos (catálogo compartido: lectura para todos; escritura admin/supervisor)
-- =============================================================================
alter table public.productos enable row level security;

drop policy if exists productos_select on public.productos;
create policy productos_select on public.productos
  for select to authenticated
  using (true);

drop policy if exists productos_insert on public.productos;
create policy productos_insert on public.productos
  for insert to authenticated
  with check (public.rls_es_admin_o_supervisor());

drop policy if exists productos_update on public.productos;
create policy productos_update on public.productos
  for update to authenticated
  using (public.rls_es_admin_o_supervisor())
  with check (public.rls_es_admin_o_supervisor());

drop policy if exists productos_delete on public.productos;
create policy productos_delete on public.productos
  for delete to authenticated
  using (public.rls_es_admin_o_supervisor());


-- =============================================================================
-- inventario (lectura por sucursal; escritura vía RPC ajustar_inventario_pos)
-- =============================================================================
alter table public.inventario enable row level security;

drop policy if exists inventario_select on public.inventario;
create policy inventario_select on public.inventario
  for select to authenticated
  using (public.rls_tiene_acceso_sucursal(sucursal_id));


-- =============================================================================
-- apertura_cajas (lectura por sucursal; apertura propia; cierre vía RPC)
-- =============================================================================
alter table public.apertura_cajas enable row level security;

drop policy if exists apertura_cajas_select on public.apertura_cajas;
create policy apertura_cajas_select on public.apertura_cajas
  for select to authenticated
  using (public.rls_tiene_acceso_sucursal(sucursal_id));

drop policy if exists apertura_cajas_insert on public.apertura_cajas;
create policy apertura_cajas_insert on public.apertura_cajas
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and public.rls_tiene_acceso_sucursal(sucursal_id)
  );


-- =============================================================================
-- pedidos (lectura por sucursal; escritura vía RPC crear_pedido_pos / anular)
-- =============================================================================
alter table public.pedidos enable row level security;

drop policy if exists pedidos_select on public.pedidos;
create policy pedidos_select on public.pedidos
  for select to authenticated
  using (public.rls_tiene_acceso_sucursal(sucursal_id));


-- =============================================================================
-- detalle_pedidos (lectura ligada a pedidos visibles; escritura vía RPC)
-- =============================================================================
alter table public.detalle_pedidos enable row level security;

drop policy if exists detalle_pedidos_select on public.detalle_pedidos;
create policy detalle_pedidos_select on public.detalle_pedidos
  for select to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = detalle_pedidos.pedido_id
        and public.rls_tiene_acceso_sucursal(p.sucursal_id)
    )
  );


-- =============================================================================
-- pagos (lectura ligada a pedidos visibles; escritura vía RPC registrar_pago)
-- =============================================================================
alter table public.pagos enable row level security;

drop policy if exists pagos_select on public.pagos;
create policy pagos_select on public.pagos
  for select to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = pagos.pedido_id
        and public.rls_tiene_acceso_sucursal(p.sucursal_id)
    )
  );


-- =============================================================================
-- movimientos_inventario (lectura por sucursal; escritura vía RPC)
-- =============================================================================
alter table public.movimientos_inventario enable row level security;

drop policy if exists movimientos_inventario_select on public.movimientos_inventario;
create policy movimientos_inventario_select on public.movimientos_inventario
  for select to authenticated
  using (public.rls_tiene_acceso_sucursal(sucursal_id));


-- =============================================================================
-- usuarios_sucursales (tabla puente; lectura)
-- =============================================================================
alter table public.usuarios_sucursales enable row level security;

drop policy if exists usuarios_sucursales_select on public.usuarios_sucursales;
create policy usuarios_sucursales_select on public.usuarios_sucursales
  for select to authenticated
  using (public.rls_tiene_acceso_sucursal(sucursal_id));


-- =============================================================================
-- Funciones RPC transaccionales -> SECURITY DEFINER
-- =============================================================================
-- crear_pedido_pos, registrar_pago_pos, anular_pedido_pos, cerrar_caja_pos y
-- ajustar_inventario_pos escriben en tablas protegidas por RLS. Para que esas
-- escrituras funcionen deben ejecutarse como SECURITY DEFINER (saltan RLS) y
-- fijar search_path. Este bloque las convierte sin importar su firma; si ya lo
-- eran, no tiene efecto.
-- =============================================================================
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'crear_pedido_pos',
        'registrar_pago_pos',
        'anular_pedido_pos',
        'cerrar_caja_pos',
        'ajustar_inventario_pos'
      )
  loop
    execute format('alter function %s security definer', r.sig);
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $$;


-- =============================================================================
-- Verificación rápida (opcional): debe listar las políticas creadas.
-- =============================================================================
-- select schemaname, tablename, policyname, cmd
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;
