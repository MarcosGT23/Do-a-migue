import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.PUBLIC_SUPABASE_URL) ||
  'https://chtfqkriruyxvjxmmazl.supabase.co';

const getServiceRoleKey = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY) return import.meta.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    if (import.meta.env.SUPABASE_SERVICE_ROLE_KEY) return import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (typeof process !== 'undefined' && process?.env?.SUPABASE_SERVICE_ROLE_KEY) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodGZxa3JpcnV5eHZqeG1tYXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTU4MywiZXhwIjoyMDg2OTU1NTgzfQ.NScTGLzAYPgWz93t4xKKXK3Gr4NlBwHZ3-OYQIfGRNs';
};

const serviceRoleKey = getServiceRoleKey();

/**
 * Cliente EXCLUSIVO de servidor (Astro SSR y endpoints de /api).
 * Utiliza la Service Role Key para eludir RLS en consultas administrativas.
 * NUNCA importar en componentes React cliente.
 */
export const supabaseAdminServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseSSR = supabaseAdminServer;

