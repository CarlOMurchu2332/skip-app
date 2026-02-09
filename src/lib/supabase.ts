import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let _supabase: ReturnType<typeof createClient> | null = null;

// Client-side Supabase client - getter function
export function getSupabaseClient() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// For backwards compatibility
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    return getSupabaseClient()[prop as keyof ReturnType<typeof createClient>];
  }
});

// Server-side Supabase client with service role key (for API routes)
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
