'use client';

import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Get started with basic analysis',
    features: ['3 deals per month', 'AI screening analysis', 'Basic pro forma', 'Email support'],
    cta: 'Current Plan',
    priceId: null,
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    description: 'For active investors',
    features: ['15 deals per month', 'All 6 analysis types', 'Detailed pro forma', 'Debt analysis', 'Priority support'],
    cta: 'Get Started',
    priceId: 'price_starter',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/mo',
    description: 'For professional investors',
    features: [
      'Unlimited deals',
      'All 6 analysis types',
      'Excel export',
      'Portfolio tracking',
      'Sensitivity analysis',
      'Dedicated support',
    ],
    cta: 'Go Pro',
    priceId: 'price_pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$299',
    period: '/mo',
    description: 'For teams and firms',
    features: [
      'Unlimited deals',
      'API access',
      'Team collaboration',
      'Custom models',
      'White-label reports',
      'Account manager',
    ],
    cta: 'Contact Sales',
    priceId: 'price_enterprise',
    highlighted: false,
  },
];

export default function PricingPage() {
  const router = useRouter();

  const handleCheckout = async (priceId: string | null) => {
    if (!priceId) return;
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold text-white">Simple, Transparent Pricing</h1>
            <p className="text-lg text-gray-400">Choose the plan that fits your investment strategy</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 ${
                  plan.highlighted
                    ? 'border-emerald-500 bg-gray-900 shadow-lg shadow-emerald-900/20'
                    : 'border-gray-800 bg-gray-900'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-400">{plan.description}</p>

                <div className="my-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={!plan.priceId}
                  className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : plan.priceId
                        ? 'border border-gray-700 text-white hover:bg-gray-800'
                        : 'cursor-default bg-gray-800 text-gray-500'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
