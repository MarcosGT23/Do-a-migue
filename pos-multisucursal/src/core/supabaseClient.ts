import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.PUBLIC_SUPABASE_URL) ||
  'https://chtfqkriruyxvjxmmazl.supabase.co';

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.PUBLIC_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodGZxa3JpcnV5eHZqeG1tYXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzk1ODMsImV4cCI6MjA4Njk1NTU4M30.ql4JMrg9OcJ6DKNpFu3Q2ncw30NMT3ebAWVNT0dhQ18';

// Cliente seguro para componentes React en el navegador (solo usa anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);