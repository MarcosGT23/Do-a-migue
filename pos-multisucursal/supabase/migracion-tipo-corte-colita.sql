-- =============================================================================
-- Doña Migue POS - Migración: agregar corte COLITA a detalle_pedidos
-- =============================================================================
-- Ejecuta este script en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Objetivo:
--   Permitir el nuevo tipo de corte 'COLITA' en la columna detalle_pedidos.tipo_corte
--   y en el trigger que extrae los cortes desde las notas.
-- =============================================================================

-- 1. Actualizar el constraint check para admitir COLITA
alter table public.detalle_pedidos
  drop constraint if exists detalle_pedidos_tipo_corte_check;

alter table public.detalle_pedidos
  add constraint detalle_pedidos_tipo_corte_check
  check (
    tipo_corte is null
    or tipo_corte ~ '^(COMPLETO|COSTILLA|MATAHAMBRE|COLITA|CHULETA)(,(COMPLETO|COSTILLA|MATAHAMBRE|COLITA|CHULETA))*$'
  );

-- 2. Actualizar el trigger para reconocer COLITA
create or replace function public.fn_detalle_pedidos_tipo_corte()
returns trigger
language plpgsql
as $$
declare
  v_lista text;
  v_parte text;
  v_cortes text[] := '{}';
begin
  if new.notas is not null and new.notas ~ '~corte=[A-Z]+(,[A-Z]+)*~' then
    v_lista := substring(new.notas from '~corte=([A-Z]+(,[A-Z]+)*)~');
    new.notas := trim(regexp_replace(new.notas, '~corte=[A-Z]+(,[A-Z]+)*~\s*', '', 'g'));

    -- Se descartan los valores que no son cortes válidos del POS
    foreach v_parte in array string_to_array(v_lista, ',')
    loop
      if v_parte in ('COMPLETO', 'COSTILLA', 'MATAHAMBRE', 'COLITA', 'CHULETA') then
        v_cortes := array_append(v_cortes, v_parte);
      end if;
    end loop;

    if new.tipo_corte is null and array_length(v_cortes, 1) > 0 then
      new.tipo_corte := array_to_string(v_cortes, ',');
    end if;
  end if;

  return new;
end;
$$;
