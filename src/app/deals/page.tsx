'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import DealCard from '@/components/deal-card';
import { Database } from '@/lib/supabase';

type Deal = Database['public']['Tables']['deals']['Row'];
type DealStatus = 'all' | 'draft' | 'active' | 'archived';

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DealStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const res = await fetch('/api/deals');
        if (!res.ok) throw new Error('Failed to fetch deals');
        const data = await res.json();
        setDeals(data.deals || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deals');
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  const filteredDeals = useMemo(() => {
    let result = [...deals];

    if (statusFilter !== 'all') {
      result = result.filter((d) => d.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.address && d.address.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [deals, statusFilter, searchQuery, sortOrder]);

  const statusCounts = useMemo(() => {
    const counts = { all: deals.length, draft: 0, active: 0, archived: 0 };
    deals.forEach((d) => {
      if (d.status in counts) {
        counts[d.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [deals]);

  const statuses: { key: DealStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'active', label: 'Active' },
    { key: 'archived', label: 'Archived' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-slate-600">Loading deals...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage and track your real estate investments.
            </p>
          </div>
          <Link
            href="/deals/new"
            className="mt-4 sm:mt-0 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Deal
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {statuses.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === s.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label} ({statusCounts[s.key]})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or address..."
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Sort */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Deals Grid */}
        {filteredDeals.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 p-12 text-center">
            {deals.length === 0 ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Create Your First Deal</h3>
                <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                  Get started by adding a property deal to analyze. You will be able to run financial projections and AI-powered assessments.
                </p>
                <Link
                  href="/deals/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Deal
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900">No deals match your filters</h3>
                <p className="mt-2 text-sm text-slate-600">Try adjusting your search or filter criteria.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
