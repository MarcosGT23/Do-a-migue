-- =============================================================================
-- Doña Migue POS - Migración 2: cortes múltiples por línea
-- =============================================================================
-- Ejecuta este script en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Qué cambia:
--   Antes, `detalle_pedidos.tipo_corte` guardaba un solo corte
--   ('COSTILLA'). Ahora guarda una lista separada por comas:
--   ('COSTILLA,MATAHAMBRE'), que es lo que permite la selección múltiple
--   de cortes en el POS (un "Mixto" puede llevar costilla + matahambre).
--
-- La marca que viaja dentro de las notas pasa a ser:
--   ~corte=COSTILLA,MATAHAMBRE~
-- (una sola marca con la lista, en lugar de una marca por corte).
--
-- Esta migración es idempotente: se puede aplicar sobre una base que todavía
-- no tenga la columna, o sobre una que ya tenga la versión de un solo corte.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columna tipo_corte
-- -----------------------------------------------------------------------------
alter table public.detalle_pedidos
  add column if not exists tipo_corte text;

comment on column public.detalle_pedidos.tipo_corte is
  'Cortes elegidos en el POS, separados por comas: COMPLETO | COSTILLA | MATAHAMBRE | COLITA | CHULETA';

-- -----------------------------------------------------------------------------
-- 2. Solo se admiten los cortes del POS (ahora pueden ser varios)
-- -----------------------------------------------------------------------------
alter table public.detalle_pedidos
  drop constraint if exists detalle_pedidos_tipo_corte_check;

alter table public.detalle_pedidos
  add constraint detalle_pedidos_tipo_corte_check
  check (
    tipo_corte is null
    or tipo_corte ~ '^(COMPLETO|COSTILLA|MATAHAMBRE|COLITA|CHULETA)(,(COMPLETO|COSTILLA|MATAHAMBRE|COLITA|CHULETA))*$'
  );

-- -----------------------------------------------------------------------------
-- 3. Trigger: extrae la marca ~corte=A,B~ de las notas
-- -----------------------------------------------------------------------------
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

drop trigger if exists trg_detalle_pedidos_tipo_corte on public.detalle_pedidos;

create trigger trg_detalle_pedidos_tipo_corte
  before insert or update on public.detalle_pedidos
  for each row execute function public.fn_detalle_pedidos_tipo_corte();

-- -----------------------------------------------------------------------------
-- 4. Verificación
-- -----------------------------------------------------------------------------
select tipo_corte, count(*)
from public.detalle_pedidos
where tipo_corte is not null
group by tipo_corte
order by tipo_corte;

-- -----------------------------------------------------------------------------
-- Rollback (deshacer los cortes múltiples)
-- -----------------------------------------------------------------------------
-- update public.detalle_pedidos
-- set tipo_corte = split_part(tipo_corte, ',', 1)
-- where tipo_corte like '%,%';
--
-- alter table public.detalle_pedidos
--   drop constraint if exists detalle_pedidos_tipo_corte_check;
--
-- alter table public.detalle_pedidos
--   add constraint detalle_pedidos_tipo_corte_check
--   check (
--     tipo_corte is null
--     or tipo_corte in ('COMPLETO', 'COSTILLA', 'MATAHAMBRE', 'CHULETA')
--   );
--
-- create or replace function public.fn_detalle_pedidos_tipo_corte()
-- returns trigger language plpgsql as $$
-- declare v_corte text;
-- begin
--   if new.notas is not null and new.notas ~ '~corte=[A-Z]+~' then
--     v_corte := substring(new.notas from '~corte=([A-Z]+)~');
--     new.notas := trim(regexp_replace(new.notas, '~corte=[A-Z]+~\s*', '', 'g'));
--     if new.tipo_corte is null
--        and v_corte in ('COMPLETO','COSTILLA','MATAHAMBRE','CHULETA') then
--       new.tipo_corte := v_corte;
--     end if;
--   end if;
--   return new;
-- end;
-- $$;
--
-- Nota (app Android):
--   La RPC `editar_pedido_pos` borra y reinserta las filas de detalle_pedidos.
--   Para que el corte sobreviva a una edición desde la app Android hay que
--   aplicar también la versión actualizada de la RPC en:
--     android-pos-cajero/supabase/editar-pedido-pos.sql
-- =============================================================================
