import { supabaseAdminServer } from './supabaseAdminServer';

/**
 * La columna `pedidos.numero_ficha` se agrega con una migración SQL que el
 * negocio ejecuta en el panel de Supabase (ver supabase/migracion-numero-ficha.sql).
 * Hasta que se aplique, el POS debe seguir funcionando: por eso consultamos si
 * la columna existe y, si no, se trabaja sin ella.
 *
 * El resultado se cachea 60 segundos para no repetir la consulta en cada
 * request, pero así el POS detecta la migración sin necesidad de reiniciar.
 */
const TTL_MS = 60_000;

let cache: { valor: boolean; expira: number } | null = null;

export async function existeColumnaNumeroFicha(): Promise<boolean> {
  const ahora = Date.now();
  if (cache && cache.expira > ahora) return cache.valor;

  let valor = false;
  try {
    const { error } = await supabaseAdminServer
      .from('pedidos')
      .select('numero_ficha')
      .limit(1);
    valor = !error;
  } catch {
    valor = false;
  }

  cache = { valor, expira: ahora + TTL_MS };
  return valor;
}

/** Reinicia la caché (útil en pruebas o tras aplicar la migración en caliente). */
export function resetCacheColumnaNumeroFicha(): void {
  cache = null;
}
