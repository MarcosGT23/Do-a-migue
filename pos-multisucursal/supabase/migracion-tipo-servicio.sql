-- =============================================================================
-- Doña Migue POS - Migración: tipo de servicio (mesa | llevar) en pedidos
-- =============================================================================
-- Ejecuta este script en: Supabase Dashboard > SQL Editor > New query > Run
--
-- Objetivo:
--   Guardar si el pedido es para "mesa" (comer en el local) o "llevar" (takeaway).
--   El POS web ya tiene el toggle en la UI (tipoServicio: 'mesa' | 'llevar').
--
-- Es idempotente: puedes volver a ejecutarlo sin problema.
--
-- Rollback:
--   alter table public.pedidos drop column if exists tipo_servicio;
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Columna tipo_servicio
-- -----------------------------------------------------------------------------
alter table public.pedidos
  add column if not exists tipo_servicio text;

comment on column public.pedidos.tipo_servicio is
  'Tipo de servicio: mesa (comer en local) | llevar (takeaway)';

-- -----------------------------------------------------------------------------
-- 2. Constraint: solo valores válidos
-- -----------------------------------------------------------------------------
alter table public.pedidos
  drop constraint if exists pedidos_tipo_servicio_check;

alter table public.pedidos
  add constraint pedidos_tipo_servicio_check
  check (
    tipo_servicio is null
    or tipo_servicio in ('mesa', 'llevar')
  );

-- -----------------------------------------------------------------------------
-- 3. Default: 'mesa' para compatibilidad con pedidos antiguos
-- -----------------------------------------------------------------------------
alter table public.pedidos
  alter column tipo_servicio set default 'mesa';

-- -----------------------------------------------------------------------------
-- 4. Backfill: pedidos existentes sin tipo_servicio -> 'mesa'
-- -----------------------------------------------------------------------------
update public.pedidos
set tipo_servicio = 'mesa'
where tipo_servicio is null;

-- -----------------------------------------------------------------------------
-- 5. Verificación
-- -----------------------------------------------------------------------------
select tipo_servicio, count(*)
from public.pedidos
group by tipo_servicio
order by count desc;