import {
  createBrowserClient,
  createServerClient as createSSRServerClient,
  type CookieOptions,
} from '@supabase/ssr';

// ---------------------------------------------------------------------------
// Database type stub (unchanged)
// ---------------------------------------------------------------------------
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
export interface Database {
  public: {
    Tables: {
      profiles: { Row: { id: string; email: string; full_name: string | null; avatar_url: string | null; stripe_customer_id: string | null; plan: 'free' | 'starter' | 'professional' | 'enterprise'; created_at: string; updated_at: string; }; Insert: { id: string; email: string; full_name?: string | null; avatar_url?: string | null; stripe_customer_id?: string | null; plan?: 'free' | 'starter' | 'professional' | 'enterprise'; created_at?: string; updated_at?: string; }; Update: { id?: string; email?: string; full_name?: string | null; avatar_url?: string | null; stripe_customer_id?: string | null; plan?: 'free' | 'starter' | 'professional' | 'enterprise'; updated_at?: string; }; };
      deals: { Row: { id: string; user_id: string; name: string; address: string | null; property_type: string | null; status: 'draft' | 'active' | 'archived'; inputs: Json; results: Json | null; created_at: string; updated_at: string; }; Insert: { id?: string; user_id: string; name: string; address?: string | null; property_type?: string | null; status?: 'draft' | 'active' | 'archived'; inputs?: Json; results?: Json | null; created_at?: string; updated_at?: string; }; Update: { id?: string; user_id?: string; name?: string; address?: string | null; property_type?: string | null; status?: 'draft' | 'active' | 'archived'; inputs?: Json; results?: Json | null; updated_at?: string; }; };
      analyses: { Row: { id: string; deal_id: string; user_id: string; analysis_type: string; content: string; tokens_used: number; model: string; created_at: string; }; Insert: { id?: string; deal_id: string; user_id: string; analysis_type: string; content: string; tokens_used?: number; model?: string; created_at?: string; }; Update: { id?: string; deal_id?: string; user_id?: string; analysis_type?: string; content?: string; tokens_used?: number; model?: string; }; };
      subscriptions: { Row: { id: string; user_id: string; stripe_customer_id: string; stripe_subscription_id: string | null; stripe_price_id: string | null; status: string; current_period_start: string | null; current_period_end: string | null; cancel_at_period_end: boolean; created_at: string; updated_at: string; }; Insert: { id?: string; user_id: string; stripe_customer_id: string; stripe_subscription_id?: string | null; stripe_price_id?: string | null; status?: string; current_period_start?: string | null; current_period_end?: string | null; cancel_at_period_end?: boolean; created_at?: string; updated_at?: string; }; Update: { id?: string; user_id?: string; stripe_customer_id?: string; stripe_subscription_id?: string | null; stripe_price_id?: string | null; status?: string; current_period_start?: string | null; current_period_end?: string | null; cancel_at_period_end?: boolean; updated_at?: string; }; };
      usage: { Row: { id: string; user_id: string; period_start: string; period_end: string; deals_created: number; analyses_run: number; exports_generated: number; created_at: string; updated_at: string; }; Insert: { id?: string; user_id: string; period_start: string; period_end: string; deals_created?: number; analyses_run?: number; exports_generated?: number; created_at?: string; updated_at?: string; }; Update: { id?: string; user_id?: string; period_start?: string; period_end?: string; deals_created?: number; analyses_run?: number; exports_generated?: number; updated_at?: string; }; };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// Browser client (singleton pattern for client components)
// ---------------------------------------------------------------------------
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// ---------------------------------------------------------------------------
// Server client (for Server Components, Route Handlers, Server Actions)
// NOTE: cookies is imported dynamically to avoid breaking client bundles
// ---------------------------------------------------------------------------
export async function createServerClient() {
  const { cookies } = await import('next/headers');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const cookieStore = await cookies();
  return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }); } catch {} },
      remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
    },
  });
}
