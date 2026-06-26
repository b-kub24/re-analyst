import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Stripe client initialization
// ---------------------------------------------------------------------------

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

export interface Plan {
  priceId: string;
  name: string;
  dealsPerMonth: number;
  analysesPerMonth: number;
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  FREE: {
    priceId: process.env.STRIPE_PRICE_ID_FREE ?? '',
    name: 'Free',
    dealsPerMonth: 3,
    analysesPerMonth: 5,
    features: [
      'Up to 3 deals per month',
      '5 AI analyses per month',
      'Basic financial calculations',
      'PDF & Excel exports',
      'Email support',
    ],
  },
  STARTER: {
    priceId: process.env.STRIPE_PRICE_ID_STARTER ?? '',
    name: 'Starter',
    dealsPerMonth: 15,
    analysesPerMonth: 30,
    features: [
      'Up to 15 deals per month',
      '30 AI analyses per month',
      'Full financial modeling suite',
      'Pro Forma & amortization schedules',
      'PDF & Excel exports',
      'Priority email support',
    ],
  },
  PROFESSIONAL: {
    priceId: process.env.STRIPE_PRICE_ID_PROFESSIONAL ?? '',
    name: 'Professional',
    dealsPerMonth: 100,
    analysesPerMonth: 200,
    features: [
      'Up to 100 deals per month',
      '200 AI analyses per month',
      'Advanced sensitivity analysis',
      'Market comparison reports',
      'Value-add & exit strategy analysis',
      'Bulk exports',
      'API access',
      'Priority chat support',
    ],
  },
  ENTERPRISE: {
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? '',
    name: 'Enterprise',
    dealsPerMonth: Infinity,
    analysesPerMonth: Infinity,
    features: [
      'Unlimited deals',
      'Unlimited AI analyses',
      'Custom financial models',
      'White-label reports',
      'SSO / SAML integration',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom API integrations',
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// Plan lookup helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Plan object associated with a given Stripe price ID.
 * Returns undefined if no match is found.
 *
 * @param priceId - The Stripe price ID to look up.
 */
export function getPlanFromPriceId(priceId: string): Plan | undefined {
  return Object.values(PLANS).find((plan) => plan.priceId === priceId);
}

/**
 * Returns the plan key (e.g. 'PROFESSIONAL') for a given Stripe price ID.
 * Returns 'FREE' as fallback if no match is found.
 *
 * @param priceId - The Stripe price ID to look up.
 */
export function getPlanKeyFromPriceId(priceId: string): string {
  const entry = Object.entries(PLANS).find(([, plan]) => plan.priceId === priceId);
  return entry ? entry[0] : 'FREE';
}

// ---------------------------------------------------------------------------
// Customer management
// ---------------------------------------------------------------------------

/**
 * Retrieves an existing Stripe customer for a user, or creates a new one
 * if none exists. The Stripe customer ID is persisted in the Supabase
 * subscriptions table to avoid duplicate customer creation.
 *
 * @param userId - The Supabase user UUID.
 * @param email - The user's email address (used when creating a new customer).
 * @returns The Stripe customer ID.
 */
export async function createOrRetrieveCustomer(
  userId: string,
  email: string
): Promise<string> {
  const supabase = await createServerClient();

  // Check if we already have a Stripe customer ID stored for this user
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to fetch subscription record: ${fetchError.message}`);
  }

  if (subscription?.stripe_customer_id) {
    // Verify the customer still exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(subscription.stripe_customer_id);
      if (!customer.deleted) {
        return subscription.stripe_customer_id;
      }
    } catch {
      // Customer not found in Stripe â fall through to create a new one
    }
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // Upsert the subscription record with the new customer ID
  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customer.id,
        status: 'incomplete',
        cancel_at_period_end: false,
      },
      { onConflict: 'user_id' }
    );

  if (upsertError) {
    throw new Error(`Failed to store Stripe customer ID: ${upsertError.message}`);
  }

  return customer.id;
}
