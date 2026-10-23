-- =============================================================================
-- Doña Migue POS - Migración: tipo de corte en detalle_pedidos
-- =============================================================================
-- Ejecuta este script en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Objetivo:
--   Guardar el tipo de corte elegido en la burbuja del POS (COMPLETO, COSTILLA,
--   MATAHAMBRE, CHULETA) dentro de detalle_pedidos.tipo_corte.
--
-- ¿Por qué un trigger y no un campo más en la RPC?
--   La RPC `crear_pedido_pos` (compartida con la app Android) solo recibe
--   producto_id, cantidad, descuento_item y notas dentro de p_items. Agregar
--   una clave nueva a ese JSON podría romper la RPC (si internamente usa
--   jsonb_populate_recordset con un tipo compuesto) y su cuerpo no está en el
--   repositorio para poder modificarla con seguridad. Por eso el corte viaja
--   dentro de las notas con la marca `~corte=CHULETA~` y este trigger la
--   extrae a la columna tipo_corte, dejando las notas limpias para cocina.
--
-- Es idempotente: puedes volver a ejecutarlo sin problema.
--
-- Verificación (debe devolver una fila con tipo_corte = 'CHULETA'):
--   select id, producto_id, cantidad, tipo_corte, notas
--   from public.detalle_pedidos
--   where tipo_corte is not null
--   order by id desc limit 10;
--
-- Rollback:
--   drop trigger if exists trg_detalle_pedidos_tipo_corte on public.detalle_pedidos;
--   drop function if exists public.fn_detalle_pedidos_tipo_corte();
--   alter table public.detalle_pedidos drop column if exists tipo_corte;
--
-- Nota (app Android):
--   La RPC `editar_pedido_pos` borra y reinserta las filas de detalle_pedidos.
--   Para que el corte sobreviva a una edición desde la app Android hay que
--   aplicar también la versión actualizada de la RPC en:
--     android-pos-cajero/supabase/editar-pedido-pos.sql
--   (esa versión ya no inserta `subtotal` —que es una columna GENERATED— y
--   conserva el `tipo_corte` de la línea anterior del mismo producto).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Columna tipo_corte
-- -----------------------------------------------------------------------------
alter table public.detalle_pedidos
  add column if not exists tipo_corte text;

comment on column public.detalle_pedidos.tipo_corte is
  'Corte elegido en el POS: COMPLETO | COSTILLA | MATAHAMBRE | CHULETA';

-- -----------------------------------------------------------------------------
-- 2. Solo se admiten los cortes del POS
-- -----------------------------------------------------------------------------
alter table public.detalle_pedidos
  drop constraint if exists detalle_pedidos_tipo_corte_check;

alter table public.detalle_pedidos
  add constraint detalle_pedidos_tipo_corte_check
  check (
    tipo_corte is null
    or tipo_corte in ('COMPLETO', 'COSTILLA', 'MATAHAMBRE', 'CHULETA')
  );

-- -----------------------------------------------------------------------------
-- 3. Trigger: extrae la marca ~corte=XXX~ de las notas
-- -----------------------------------------------------------------------------
create or replace function public.fn_detalle_pedidos_tipo_corte()
returns trigger
language plpgsql
as $$
declare
  v_corte text;
begin
  if new.notas is not null and new.notas ~ '~corte=[A-Z]+~' then
    v_corte := substring(new.notas from '~corte=([A-Z]+)~');
    new.notas := trim(regexp_replace(new.notas, '~corte=[A-Z]+~\s*', '', 'g'));

    if new.tipo_corte is null
       and v_corte in ('COMPLETO', 'COSTILLA', 'MATAHAMBRE', 'CHULETA') then
      new.tipo_corte := v_corte;
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
-- 4. Backfill: pedidos ya creados que todavía tengan la marca en las notas
--    (por ejemplo, creados antes de aplicar este trigger)
-- -----------------------------------------------------------------------------
update public.detalle_pedidos
set tipo_corte = substring(notas from '~corte=([A-Z]+)~')
where tipo_corte is null
  and notas is not null
  and notas ~ '~corte=[A-Z]+~';

update public.detalle_pedidos
set notas = trim(regexp_replace(notas, '~corte=[A-Z]+~\s*', '', 'g'))
where notas is not null
  and notas ~ '~corte=[A-Z]+~';
