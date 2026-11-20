import { createClient } from '@supabase/supabase-js';

// Default to production Supabase project so Vercel builds connect seamlessly without missing env variables
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://ltzihnyknfnaodgljnup.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_GJ-ptA_673qClnee0OvCIQ_jmA9j-zQ';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
