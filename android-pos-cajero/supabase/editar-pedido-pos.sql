-- =============================================================================
-- Doña Migue POS - RPC editar_pedido_pos
-- =============================================================================
-- Ejecuta este script en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Replica la lógica del endpoint web /api/pedidos/editar.ts pero como función
-- SECURITY DEFINER, para que la app Android (rol `authenticated`) pueda editar
-- pedidos sin usar la service_role key.
--
-- La función:
--   1. Valida que el usuario exista, esté activo y NO sea MESERO.
--   2. Bloquea la edición si el pedido está ANULADO o si ya tiene pagos en una
--      caja CERRADA.
--   3. Ajusta el inventario según la diferencia de cantidades (antiguo vs nuevo).
--   4. Reemplaza las filas de detalle_pedidos y recalcula subtotal/descuento/total.
--   5. Actualiza el pedido y, si existe, el pago asociado (monto y método).
--
-- IMPORTANTE (corte de carne por línea):
--   - `detalle_pedidos.subtotal` es una columna GENERATED. Insertarla explícitamente
--     hace fallar la función con 428C9 ("cannot insert a non-DEFAULT value into
--     column subtotal"). Por eso aquí NUNCA se inserta: el propio motor la calcula.
--   - `detalle_pedidos.tipo_corte` guarda los cortes elegidos en el POS web
--     (COMPLETO / COSTILLA / MATAHAMBRE / CHULETA) separados por comas, por
--     ejemplo 'COSTILLA,MATAHAMBRE'. Como la app Android todavía no envía
--     `tipo_corte`, la función conserva el corte de la línea anterior del mismo
--     producto (y el trigger de la web lo recupera desde la marca
--     `~corte=A,B~` si venía dentro de las notas).
--   - El descuento por ítem tampoco es editable desde Android, así que se
--     conserva el valor previo cuando el que llega es 0.
--
-- Firma:
--   editar_pedido_pos(
--     p_pedido_id        bigint,
--     p_usuario_id       uuid,
--     p_cliente_nombre   text,
--     p_numero_mesa      int,
--     p_descuento_global numeric,
--     p_items            jsonb,   -- [{"producto_id":1,"cantidad":2,"descuento_item":0,"notas":"","precio_unitario":10.0,"tipo_corte":"CHULETA,COSTILLA"}]
--     p_metodo_pago      text     -- opcional, null para no cambiarlo
--   ) RETURNS jsonb
-- =============================================================================

create or replace function public.editar_pedido_pos(
    p_pedido_id bigint,
    p_usuario_id uuid,
    p_cliente_nombre text,
    p_numero_mesa int,
    p_descuento_global numeric,
    p_items jsonb,
    p_metodo_pago text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_rol_usuario rol_usuario;
    v_usuario_activo boolean;
    v_pedido record;
    v_caja_cerrada_exist boolean;
    v_item jsonb;
    v_producto_id bigint;
    v_cantidad int4;
    v_descuento_item numeric(12,2);
    v_notas text;
    v_precio_enviado numeric(12,2);
    v_precio_real numeric(12,2);
    v_producto_activo boolean;
    v_inventario_id bigint;
    v_stock_actual int4;
    v_cant_anterior int4;
    v_cant_nueva int4;
    v_diferencia int4;
    v_subtotal_calculado numeric(12,2) := 0;
    v_total_calculado numeric(12,2);
    v_sucursal_id bigint;
    v_tipo_corte text;
    v_tipo_corte_prev text;
    v_descuento_previo numeric(12,2);
    v_cortes_previos jsonb := '[]'::jsonb;
    v_ord_previo bigint;
    v_tiene_columna_tipo_corte boolean;
begin
    ---------------------------------------------------------------------------
    -- 1. Validar usuario
    ---------------------------------------------------------------------------
    select rol, activo into v_rol_usuario, v_usuario_activo
    from usuarios
    where id = p_usuario_id;

    if not found or not v_usuario_activo then
        raise exception 'El usuario no existe o se encuentra inactivo.';
    end if;

    if v_rol_usuario = 'MESERO' then
        raise exception 'No tienes permisos para editar pedidos. Solicita autorización a Caja o Administración.';
    end if;

    ---------------------------------------------------------------------------
    -- 2. Cargar y validar el pedido
    ---------------------------------------------------------------------------
    select id, sucursal_id, apertura_caja_id, estado
    into v_pedido
    from pedidos
    where id = p_pedido_id
    for update;

    if not found then
        raise exception 'El pedido #% no existe.', p_pedido_id;
    end if;

    if v_pedido.estado = 'ANULADO' then
        raise exception 'No se puede editar un pedido anulado.';
    end if;

    select exists (
        select 1
        from pagos p
        join apertura_cajas ac on ac.id = p.apertura_caja_id
        where p.pedido_id = p_pedido_id
          and ac.estado = 'CERRADA'
    ) into v_caja_cerrada_exist;

    if v_caja_cerrada_exist then
        raise exception 'No se puede editar el pedido #% porque tiene pagos en una caja que ya fue cerrada.', p_pedido_id;
    end if;

    if p_items is null or jsonb_array_length(p_items) = 0 then
        raise exception 'El pedido debe tener al menos un producto.';
    end if;

    v_sucursal_id := v_pedido.sucursal_id;

    ---------------------------------------------------------------------------
    -- 3. Ajustar inventario por diferencias de cantidad
    ---------------------------------------------------------------------------
    -- Cantidad anterior por producto
    for v_item in
        select jsonb_build_object(
                   'producto_id', producto_id,
                   'cantidad', sum(cantidad)
               ) as dato
        from detalle_pedidos
        where pedido_id = p_pedido_id
        group by producto_id
    loop
        v_producto_id := (v_item->>'producto_id')::bigint;
        v_cant_anterior := (v_item->>'cantidad')::int4;

        select coalesce(sum((it->>'cantidad')::int4), 0)
        into v_cant_nueva
        from jsonb_array_elements(p_items) it
        where (it->>'producto_id')::bigint = v_producto_id;

        v_diferencia := v_cant_nueva - v_cant_anterior;
        if v_diferencia <> 0 then
            update inventario
            set stock_actual = greatest(0, stock_actual - v_diferencia),
                updated_at = now()
            where sucursal_id = v_sucursal_id
              and producto_id = v_producto_id;
        end if;
    end loop;

    -- Productos nuevos que no estaban antes
    for v_item in
        select jsonb_build_object(
                   'producto_id', (it->>'producto_id')::bigint,
                   'cantidad', sum((it->>'cantidad')::int4)
               ) as dato
        from jsonb_array_elements(p_items) it
        where (it->>'producto_id')::bigint not in (
            select distinct producto_id from detalle_pedidos where pedido_id = p_pedido_id
        )
        group by (it->>'producto_id')::bigint
    loop
        v_producto_id := (v_item->>'producto_id')::bigint;
        v_cant_nueva := (v_item->>'cantidad')::int4;

        update inventario
        set stock_actual = greatest(0, stock_actual - v_cant_nueva),
            updated_at = now()
        where sucursal_id = v_sucursal_id
          and producto_id = v_producto_id;
    end loop;

    ---------------------------------------------------------------------------
    -- 4. Reemplazar detalle_pedidos y calcular totales
    ---------------------------------------------------------------------------
    -- Guardar los atributos de las líneas actuales que la app Android no puede
    -- editar (corte y descuento), para conservarlos al recrear el detalle.
    select coalesce(
               jsonb_agg(
                   jsonb_build_object(
                       'producto_id', producto_id,
                       'tipo_corte', tipo_corte,
                       'descuento_item', descuento_item
                   ) order by id
               ),
               '[]'::jsonb
           )
    into v_cortes_previos
    from detalle_pedidos
    where pedido_id = p_pedido_id;

    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'detalle_pedidos'
          and column_name = 'tipo_corte'
    ) into v_tiene_columna_tipo_corte;

    delete from detalle_pedidos where pedido_id = p_pedido_id;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_producto_id := (v_item->>'producto_id')::bigint;
        v_cantidad := greatest(1, coalesce((v_item->>'cantidad')::int4, 1));
        v_descuento_item := greatest(0, coalesce((v_item->>'descuento_item')::numeric, 0));
        v_notas := coalesce(v_item->>'notas', '');
        v_precio_enviado := coalesce((v_item->>'precio_unitario')::numeric, 0);
        v_tipo_corte := nullif(trim(coalesce(v_item->>'tipo_corte', '')), '');

        -- Prioridad del corte: 1) explícito en el payload, 2) marca ~corte=A,B~ en
        -- las notas (formato del POS web), 3) el de la línea anterior del mismo
        -- producto (Android todavía no envía el corte).
        if v_tipo_corte is null and v_notas ~ '~corte=[A-Z]+(,[A-Z]+)*~' then
            v_tipo_corte := nullif(substring(v_notas from '~corte=([A-Z]+(,[A-Z]+)*)~'), '');
        end if;

        -- Buscar la línea anterior del mismo producto para heredar corte y descuento
        select e->>'tipo_corte', (e->>'descuento_item')::numeric, t.ord
        into v_tipo_corte_prev, v_descuento_previo, v_ord_previo
        from jsonb_array_elements(v_cortes_previos) with ordinality as t(e, ord)
        where (e->>'producto_id')::bigint = v_producto_id
          and not coalesce((e->>'consumido')::boolean, false)
        order by t.ord
        limit 1;

        if v_tipo_corte is null and v_tipo_corte_prev is not null then
            v_tipo_corte := v_tipo_corte_prev;
        end if;

        -- Normalizar la lista de cortes: solo se conservan los cortes válidos del
        -- POS y sin repeticiones. Ejemplos: 'COSTILLA' -> 'COSTILLA',
        -- 'COSTILLA,MATAHAMBRE' -> 'COSTILLA,MATAHAMBRE', 'X' -> null.
        v_tipo_corte := (
            select string_agg(s.c, ',' order by s.ord)
            from (
                select distinct on (t.c) t.c, t.ord
                from unnest(string_to_array(coalesce(v_tipo_corte, ''), ',')) with ordinality as t(c, ord)
                where t.c in ('COMPLETO', 'COSTILLA', 'MATAHAMBRE', 'CHULETA')
                order by t.c, t.ord
            ) s
        );

        -- Android no permite editar descuentos: si llega 0 se conserva el previo
        if v_descuento_item = 0 and v_descuento_previo is not null and v_descuento_previo > 0 then
            v_descuento_item := v_descuento_previo;
        end if;

        -- Marcar la línea anterior como consumida para no reutilizarla
        if v_ord_previo is not null then
            v_cortes_previos := (
                select jsonb_agg(
                    case when t.ord = v_ord_previo
                         then jsonb_set(e, '{consumido}', 'true'::jsonb)
                         else e end
                    order by t.ord
                )
                from jsonb_array_elements(v_cortes_previos) with ordinality as t(e, ord)
            );
        end if;

        select precio_base, activo into v_precio_real, v_producto_activo
        from productos
        where id = v_producto_id;

        if not found or not v_producto_activo then
            raise exception 'El producto ID % no existe o está inactivo.', v_producto_id;
        end if;

        -- Preferir el precio enviado si viene; si no, el precio real del catálogo.
        if v_precio_enviado <= 0 then
            v_precio_enviado := v_precio_real;
        end if;

        declare
            v_item_subtotal numeric(12,2);
        begin
            v_item_subtotal := greatest(0, (v_cantidad * v_precio_enviado) - v_descuento_item);
            v_subtotal_calculado := v_subtotal_calculado + v_item_subtotal;

            -- `subtotal` es GENERATED: no se inserta, lo calcula Postgres.
            if v_tiene_columna_tipo_corte then
                insert into detalle_pedidos (
                    pedido_id, producto_id, cantidad, precio_unitario, descuento_item, tipo_corte, notas
                ) values (
                    p_pedido_id, v_producto_id, v_cantidad, v_precio_enviado, v_descuento_item, v_tipo_corte, v_notas
                );
            else
                insert into detalle_pedidos (
                    pedido_id, producto_id, cantidad, precio_unitario, descuento_item, notas
                ) values (
                    p_pedido_id, v_producto_id, v_cantidad, v_precio_enviado, v_descuento_item, v_notas
                );
            end if;
        end;
    end loop;

    v_total_calculado := greatest(0, v_subtotal_calculado - greatest(0, coalesce(p_descuento_global, 0)));

    ---------------------------------------------------------------------------
    -- 5. Actualizar pedido y pago
    ---------------------------------------------------------------------------
    update pedidos
    set cliente_nombre = coalesce(nullif(trim(p_cliente_nombre), ''), 'Cliente Mostrador'),
        numero_mesa = p_numero_mesa,
        subtotal = v_subtotal_calculado,
        descuento = greatest(0, coalesce(p_descuento_global, 0)),
        total = v_total_calculado,
        updated_at = now()
    where id = p_pedido_id;

    update pagos
    set monto = v_total_calculado,
        metodo = coalesce(p_metodo_pago, metodo)
    where pedido_id = p_pedido_id;

    return jsonb_build_object(
        'pedido_id', p_pedido_id,
        'subtotal', v_subtotal_calculado,
        'descuento', greatest(0, coalesce(p_descuento_global, 0)),
        'total', v_total_calculado,
        'items', jsonb_array_length(p_items)
    );
end;
$$;

-- Refuerzo (por si el rol necesita ejecutarla explícitamente).
grant execute on function public.editar_pedido_pos(bigint, uuid, text, int, numeric, jsonb, text) to authenticated;
