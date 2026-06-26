import {
  createBrowserClient,
  createServerClient as createSSRServerClient,
  type CookieOptions,
} from '@supabase/ssr';
import { cookies } from 'next/headers';

// ---------------------------------------------------------------------------
// Database type stub
// ---------------------------------------------------------------------------

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          stripe_customer_id: string | null;
          plan: 'free' | 'starter' | 'professional' | 'enterprise';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          plan?: 'free' | 'starter' | 'professional' | 'enterprise';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          plan?: 'free' | 'starter' | 'professional' | 'enterprise';
          updated_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string | null;
          property_type: string | null;
          status: 'draft' | 'active' | 'archived';
          inputs: Json;
          results: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address?: string | null;
          property_type?: string | null;
          status?: 'draft' | 'active' | 'archived';
          inputs?: Json;
          results?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string | null;
          property_type?: string | null;
          status?: 'draft' | 'active' | 'archived';
          inputs?: Json;
          results?: Json | null;
          updated_at?: string;
        };
      };
      analyses: {
        Row: {
          id: string;
          deal_id: string;
          user_id: string;
          analysis_type: string;
          content: string;
          tokens_used: number;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id: string;
          user_id: string;
          analysis_type: string;
          content: string;
          tokens_used?: number;
          model?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          deal_id?: string;
          user_id?: string;
          analysis_type?: string;
          content?: string;
          tokens_used?: number;
          model?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
      };
      usage: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          deals_created: number;
          analyses_run: number;
          exports_generated: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_start: string;
          period_end: string;
          deals_created?: number;
          analyses_run?: number;
          exports_generated?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period_start?: string;
          period_end?: string;
          deals_created?: number;
          analyses_run?: number;
          exports_generated?: number;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ---------------------------------------------------------------------------
// Browser client (singleton pattern for client components)
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase browser client for use in Client Components.
 * Safe to call multiple times â uses the same underlying client instance.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// ---------------------------------------------------------------------------
// Server client (for Server Components, Route Handlers, Server Actions)
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase server client for use in Server Components, Route Handlers,
 * and Server Actions. Reads and writes session cookies via Next.js App Router
 * cookie store.
 *
 * Must be called inside a Server Component or async context where `cookies()`
 * from 'next/headers' is available.
 */
export async function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const cookieStore = await cookies();

  return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // The `set` method may be called from a Server Component.
          // This is expected behavior â the cookie will be set by the
          // middleware on the next request.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // The `remove` method may be called from a Server Component.
          // This is expected behavior â the cookie will be removed by the
          // middleware on the next request.
        }
      },
    },
  });
}
