import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Cliente seguro para componentes React en el navegador (solo usa anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);