const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;

export const supabaseUrl =
  env?.PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env?.PUBLIC_SUPABASE_URL : undefined);

export const supabaseAnonKey =
  env?.PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env?.PUBLIC_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl) {
  throw new Error('Falta configurar PUBLIC_SUPABASE_URL.');
}

if (!supabaseAnonKey || supabaseAnonKey === '******') {
  throw new Error('Falta configurar PUBLIC_SUPABASE_ANON_KEY con la clave pública vigente de Supabase.');
}
