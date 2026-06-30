import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

type Deal = Database['public']['Tables']['deals']['Row'];

interface DealResults {
  capRate?: number;
  noi?: number;
  cashOnCash?: number;
  totalReturn?: number;
  purchasePrice?: number;
  [key: string]: unknown;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export default async function DashboardPage() {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: deals } = await supabase
    .from('deals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const allDeals: Deal[] = deals || [];
  const activeDeals = allDeals.filter((d) => d.status === 'active');
  const recentDeals = allDeals.slice(0, 5);

  const capRates: number[] = [];
  let pipelineValue = 0;

  allDeals.forEach((deal) => {
    const results = deal.results as DealResults | null;
    if (results?.capRate && typeof results.capRate === 'number') {
      capRates.push(results.capRate);
    }
    const inputs = deal.inputs as Record<string, unknown> | null;
    if (inputs?.purchasePrice && typeof inputs.purchasePrice === 'number') {
      pipelineValue += inputs.purchasePrice;
    }
  });

  const avgCapRate =
    capRates.length > 0
      ? capRates.reduce((sum, r) => sum + r, 0) / capRates.length
      : 0;

  const stats = [
    {
      label: 'Total Deals',
      value: allDeals.length.toString(),
      sub: `${activeDeals.length} active`,
      icon: (
        <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
        </svg>
      ),
    },
    {
      label: 'Avg Cap Rate',
      value: avgCapRate > 0 ? formatPercent(avgCapRate) : '--',
      sub: `${capRates.length} analyzed`,
      icon: (
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
    {
      label: 'Pipeline Value',
      value: pipelineValue > 0 ? formatCurrency(pipelineValue) : '$0',
      sub: 'total acquisition cost',
      icon: (
        <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-green-100 text-green-700',
    archived: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Here is an overview of your real estate portfolio.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 rounded-lg bg-slate-50 p-3">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Deal
          </Link>
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-300 hover:bg-slate-50 transition-colors"
          >
            View All Deals
          </Link>
        </div>

        {/* Recent Deals */}
        {allDeals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Welcome to RE Analyst</h3>
            <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
              Start by creating your first deal. You can analyze properties, run pro forma projections,
              and get AI-powered insights to make better investment decisions.
            </p>
            <Link
              href="/deals/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Your First Deal
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Recent Deals</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentDeals.map((deal) => {
                const results = deal.results as DealResults | null;
                const inputs = deal.inputs as Record<string, unknown> | null;
                const price = inputs?.purchasePrice as number | undefined;
                return (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {deal.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {deal.address || 'No address'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      {price && (
                        <span className="text-sm font-medium text-slate-700 hidden sm:block">
                          {formatCurrency(price)}
                        </span>
                      )}
                      {results?.capRate && (
                        <span className="text-sm text-slate-600 hidden md:block">
                          {formatPercent(results.capRate)} cap
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                          statusColors[deal.status] || statusColors.draft
                        }`}
                      >
                        {deal.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
