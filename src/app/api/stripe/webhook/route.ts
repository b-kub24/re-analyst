import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const planMap: Record<string, string> = {
  price_starter: 'starter',
  price_pro: 'pro',
  price_enterprise: 'enterprise',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = planMap[priceId] || 'starter';

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan,
          status: 'active',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });

        await supabase.from('profiles').update({ subscription_tier: plan }).eq('id', userId);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const { data } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .single();

        if (data) {
          const priceId = sub.items.data[0]?.price.id;
          const plan = planMap[priceId] || 'free';
          await supabase.from('subscriptions').update({
            plan,
            status: sub.status === 'active' ? 'active' : 'past_due',
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          }).eq('stripe_subscription_id', sub.id);
          await supabase.from('profiles').update({ subscription_tier: plan }).eq('id', data.user_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { data } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', sub.id)
          .single();

        if (data) {
          await supabase.from('subscriptions').update({ status: 'canceled', plan: 'free' }).eq('stripe_subscription_id', sub.id);
          await supabase.from('profiles').update({ subscription_tier: 'free' }).eq('id', data.user_id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
