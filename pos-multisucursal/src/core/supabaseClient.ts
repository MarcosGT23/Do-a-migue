import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './supabaseConfig';

export { supabaseAnonKey, supabaseUrl };

// Cliente seguro para componentes React en el navegador (solo usa anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
