'use client';

import Link from 'next/link';

interface Deal {
  id: string;
  property_address: string;
  purchase_price: number;
  status: 'draft' | 'analyzing' | 'complete';
  deal_data: {
    units?: number;
    cap_rate?: number;
    irr?: number;
    property_type?: string;
  };
  created_at: string;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  analyzing: 'bg-yellow-900/50 text-yellow-400',
  complete: 'bg-emerald-900/50 text-emerald-400',
};

export default function DealCard({ deal }: { deal: Deal }) {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="block rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-emerald-800 hover:shadow-lg hover:shadow-emerald-900/10"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-semibold text-white">{deal.property_address}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[deal.status]}`}>
          {deal.status}
        </span>
      </div>

      <p className="mb-4 text-2xl font-bold text-white">{formatter.format(deal.purchase_price)}</p>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-gray-800/50 p-2">
          <p className="text-xs text-gray-500">Cap Rate</p>
          <p className="text-sm font-medium text-white">{deal.deal_data.cap_rate ? `${deal.deal_data.cap_rate.toFixed(1)}%` : '—'}</p>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-2">
          <p className="text-xs text-gray-500">IRR</p>
          <p className="text-sm font-medium text-white">{deal.deal_data.irr ? `${deal.deal_data.irr.toFixed(1)}%` : '—'}</p>
        </div>
        <div className="rounded-lg bg-gray-800/50 p-2">
          <p className="text-xs text-gray-500">Units</p>
          <p className="text-sm font-medium text-white">{deal.deal_data.units ?? '—'}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        {new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
    </Link>
  );
}
