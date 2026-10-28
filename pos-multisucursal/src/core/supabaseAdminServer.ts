import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from './supabaseConfig';

const getServiceRoleKey = (): string => {
  const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  const key =
    env?.SUPABASE_SECRET_KEY ||
    env?.SUPABASE_SERVICE_ROLE_KEY ||
    (typeof process !== 'undefined'
      ? process.env?.SUPABASE_SECRET_KEY || process.env?.SUPABASE_SERVICE_ROLE_KEY
      : undefined);

  if (!key || key === '******') {
    throw new Error('Falta configurar SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY en el servidor.');
  }

  return key;
};

const serviceRoleKey = getServiceRoleKey();

/**
 * Cliente EXCLUSIVO de servidor (Astro SSR y endpoints de /api).
 * Utiliza la clave secreta para eludir RLS en consultas administrativas.
 * NUNCA importar en componentes React cliente.
 */
export const supabaseAdminServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseSSR = supabaseAdminServer;
