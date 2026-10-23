-- =============================================================================
-- Doña Migue POS - Migración 3: número de ficha por caja (turno)
-- =============================================================================
-- Ejecuta este script en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Qué hace:
--   Agrega la columna `pedidos.numero_ficha`, que es el número de ficha del
--   turno. Se asigna automáticamente al crear el pedido y **se reinicia en 1
--   cada vez que se abre una nueva caja**, porque el consecutivo se calcula
--   sobre los pedidos de esa misma caja (apertura_cajas.id).
--
--   El trigger funciona tanto para el POS web como para la app Android: los
--   dos crean el pedido con la RPC `crear_pedido_pos`, que inserta en
--   `pedidos`, así que la ficha se asigna sola sin tocar el código de la app.
--
-- Nota: la columna `pedidos.numero_mesa` se conserva (la RPC `crear_pedido_pos`
--   sigue esperando el parámetro `p_numero_mesa`), pero el POS web ya no la
--   usa: el número de mesa se reemplaza por la ficha.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columna
-- -----------------------------------------------------------------------------
alter table public.pedidos
  add column if not exists numero_ficha int;

comment on column public.pedidos.numero_ficha is
  'Número de ficha del turno. Se reinicia en 1 en cada caja abierta.';

-- -----------------------------------------------------------------------------
-- 2. Backfill: numerar los pedidos ya existentes de cada caja
-- -----------------------------------------------------------------------------
with numerado as (
  select id,
         row_number() over (partition by apertura_caja_id order by created_at, id) as n
  from public.pedidos
)
update public.pedidos p
set numero_ficha = numerado.n
from numerado
where p.id = numerado.id
  and p.numero_ficha is null;

-- -----------------------------------------------------------------------------
-- 3. Trigger: asigna la ficha al crear el pedido
-- -----------------------------------------------------------------------------
create or replace function public.fn_pedidos_numero_ficha()
returns trigger
language plpgsql
as $$
begin
  if new.numero_ficha is null then
    -- Serializa las altas simultáneas de la misma caja para que dos pedidos
    -- simultáneos no obtengan la misma ficha.
    if new.apertura_caja_id is not null then
      perform pg_advisory_xact_lock(new.apertura_caja_id);
    end if;

    select coalesce(max(p.numero_ficha), 0) + 1
      into new.numero_ficha
      from public.pedidos p
     where p.apertura_caja_id is not distinct from new.apertura_caja_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pedidos_numero_ficha on public.pedidos;

create trigger trg_pedidos_numero_ficha
  before insert on public.pedidos
  for each row execute function public.fn_pedidos_numero_ficha();

-- -----------------------------------------------------------------------------
-- 4. La ficha no se repite dentro de la misma caja
-- -----------------------------------------------------------------------------
create unique index if not exists idx_pedidos_numero_ficha_caja
  on public.pedidos (apertura_caja_id, numero_ficha)
  where numero_ficha is not null;

-- -----------------------------------------------------------------------------
-- 5. Verificación
-- -----------------------------------------------------------------------------
select p.apertura_caja_id, p.numero_ficha, count(*)
from public.pedidos p
where p.numero_ficha is not null
group by p.apertura_caja_id, p.numero_ficha
order by p.apertura_caja_id, p.numero_ficha;

-- -----------------------------------------------------------------------------
-- Rollback
-- -----------------------------------------------------------------------------
-- drop index if exists public.idx_pedidos_numero_ficha_caja;
-- drop trigger if exists trg_pedidos_numero_ficha on public.pedidos;
-- drop function if exists public.fn_pedidos_numero_ficha();
-- alter table public.pedidos drop column if exists numero_ficha;
-- =============================================================================
