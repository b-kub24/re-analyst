'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type Deal = Database['public']['Tables']['deals']['Row'];

const ANALYSIS_TYPES = [
  { key: 'investment_summary', label: 'Investment Summary', icon: '📊' },
  { key: 'risk_assessment', label: 'Risk Assessment', icon: '⚠️' },
  { key: 'market_comparison', label: 'Market Comparison', icon: '🏘️' },
  { key: 'value_add_analysis', label: 'Value-Add Analysis', icon: '🔧' },
  { key: 'exit_strategy', label: 'Exit Strategy', icon: '🚪' },
  { key: 'sensitivity_analysis', label: 'Sensitivity Analysis', icon: '📈' },
] as const;

interface Analysis {
  id: string;
  analysis_type: string;
  content: string;
  tokens_used: number;
  model: string;
  created_at: string;
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDeal = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .eq('user_id', user.id)
        .single();

      if (dealError || !dealData) {
        setError('Deal not found.');
        return;
      }
      setDeal(dealData);

      const { data: analysisData } = await supabase
        .from('analyses')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      setAnalyses(analysisData ?? []);
      if (analysisData && analysisData.length > 0) {
        setActiveAnalysis(analysisData[0]);
      }
    } catch {
      setError('Failed to load deal.');
    } finally {
      setLoading(false);
    }
  }, [dealId, router]);

  useEffect(() => { fetchDeal(); }, [fetchDeal]);

  async function runAnalysis(analysisType: string) {
    if (!deal) return;
    setAnalyzing(analysisType);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, analysisType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data = await res.json();
      const newAnalysis: Analysis = data.analysis;
      setAnalyses((prev) => [newAnalysis, ...prev]);
      setActiveAnalysis(newAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(null);
    }
  }

  async function handleDelete() {
    if (!deal || !confirm('Delete this deal? This cannot be undone.')) return;
    const supabase = createClient();
    await supabase.from('deals').delete().eq('id', deal.id);
    router.push('/deals');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error && !deal) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/deals')} className="text-blue-400 hover:underline">
            Back to Deals
          </button>
        </div>
      </div>
    );
  }

  if (!deal) return null;

  const inputs = (deal.inputs ?? {}) as Record<string, number>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/deals')}
              className="text-gray-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1"
            >
              ← Back to Deals
            </button>
            <h1 className="text-3xl font-bold">{deal.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-gray-400 text-sm">
              {deal.address && <span>{deal.address}</span>}
              {deal.property_type && (
                <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{deal.property_type}</span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs ${
                deal.status === 'active' ? 'bg-green-500/20 text-green-400' :
                deal.status === 'archived' ? 'bg-gray-600 text-gray-300' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {deal.status}
              </span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 text-sm border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition"
          >
            Delete Deal
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Deal Info + Analysis Buttons */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
              <div className="space-y-3">
                {inputs.asking_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Asking Price</span>
                    <span className="font-medium">${ inputs.asking_price.toLocaleString()}</span>
                  </div>
                )}
                {inputs.cap_rate && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cap Rate</span>
                    <span className="font-medium">{inputs.cap_rate}%</span>
                  </div>
                )}
                {inputs.gross_rental_income && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gross Income</span>
                    <span className="font-medium">${ inputs.gross_rental_income.toLocaleString()}/yr</span>
                  </div>
                )}
                {inputs.down_payment_pct && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Down Payment</span>
                    <span className="font-medium">{inputs.down_payment_pct}%</span>
                  </div>
                )}
                {inputs.interest_rate && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Interest Rate</span>
                    <span className="font-medium">{inputs.interest_rate}%</span>
                  </div>
                )}
                {inputs.hold_years && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hold Period</span>
                    <span className="font-medium">{inputs.hold_years} yrs</span>
                  </div>
                )}
                {inputs.units && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Units</span>
                    <span className="font-medium">{inputs.units}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Run Analysis */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">AI Analysis</h2>
              <div className="space-y-2">
                {ANALYSIS_TYPES.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => runAnalysis(key)}
                    disabled={analyzing !== null}
                    className="w-full text-left px-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="flex-1">{label}</span>
                    {analyzing === key && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Analysis Results */}
          <div className="lg:col-span-2">
            {analyses.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-12 text-center">
                <p className="text-4xl mb-4">🤖</p>
                <h3 className="text-xl font-semibold mb-2">No Analyses Yet</h3>
                <p className="text-gray-400">
                  Run an AI analysis from the panel on the left to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Analysis tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {analyses.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setActiveAnalysis(a)}
                      className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                        activeAnalysis?.id === a.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {ANALYSIS_TYPES.find((t) => t.key === a.analysis_type)?.label ?? a.analysis_type}
                    </button>
                  ))}
                </div>

                {/* Active analysis content */}
                {activeAnalysis && (
                  <div className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">
                        {ANALYSIS_TYPES.find((t) => t.key === activeAnalysis.analysis_type)?.icon}{' '}
                        {ANALYSIS_TYPES.find((t) => t.key === activeAnalysis.analysis_type)?.label}
                      </h2>
                      <span className="text-xs text-gray-500">
                        {new Date(activeAnalysis.created_at).toLocaleDateString()} · {activeAnalysis.tokens_used} tokens
                      </span>
                    </div>
                    <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                      {activeAnalysis.content}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
