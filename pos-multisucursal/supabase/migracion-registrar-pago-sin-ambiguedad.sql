-- =============================================================================
-- Doña Migue POS - Eliminar la sobrecarga ambigua de registrar_pago_pos
-- =============================================================================
-- Ejecutar en Supabase Dashboard > SQL Editor > New query > Run.
--
-- Web y Android envían p_metodo como texto. Mantener simultáneamente una
-- sobrecarga con public.metodo_pago y otra con text hace que PostgREST no
-- pueda elegir la función. Se conserva la firma text usada por ambas apps.
-- =============================================================================

begin;

drop function if exists public.registrar_pago_pos(
  bigint,
  bigint,
  uuid,
  public.metodo_pago,
  numeric,
  text
);

do $$
begin
  if to_regprocedure(
    'public.registrar_pago_pos(bigint,bigint,uuid,text,numeric,text)'
  ) is null then
    raise exception
      'No existe public.registrar_pago_pos(bigint,bigint,uuid,text,numeric,text); no se puede continuar';
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
