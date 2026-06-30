'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const PROPERTY_TYPES = [
  'Multifamily',
  'Single Family',
  'Office',
  'Retail',
  'Industrial',
  'Mixed Use',
  'Land',
  'Hotel/Hospitality',
  'Self Storage',
  'Mobile Home Park',
] as const;

interface DealInputs {
  asking_price: string;
  down_payment_pct: string;
  interest_rate: string;
  loan_term: string;
  gross_rental_income: string;
  vacancy_rate: string;
  operating_expenses: string;
  cap_rate: string;
  hold_years: string;
  exit_cap_rate: string;
  renovation_budget: string;
  units: string;
  square_footage: string;
}

const DEFAULT_INPUTS: DealInputs = {
  asking_price: '',
  down_payment_pct: '25',
  interest_rate: '7.0',
  loan_term: '30',
  gross_rental_income: '',
  vacancy_rate: '5',
  operating_expenses: '',
  cap_rate: '',
  hold_years: '5',
  exit_cap_rate: '',
  renovation_budget: '0',
  units: '',
  square_footage: '',
};

export default function NewDealPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [inputs, setInputs] = useState<DealInputs>(DEFAULT_INPUTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateInput(key: keyof DealInputs, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Deal name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const numericInputs: Record<string, number> = {};
      for (const [k, v] of Object.entries(inputs)) {
        const num = parseFloat(v);
        if (!isNaN(num)) numericInputs[k] = num;
      }

      const { data, error: insertError } = await supabase
        .from('deals')
        .insert({
          user_id: user.id,
          name: name.trim(),
          address: address.trim() || null,
          property_type: propertyType || null,
          status: 'active',
          inputs: numericInputs,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      router.push(`/deals/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal.');
    } finally {
      setSaving(false);
    }
  }

  const inputField = (
    label: string,
    key: keyof DealInputs,
    opts?: { prefix?: string; suffix?: string; placeholder?: string }
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="relative">
        {opts?.prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {opts.prefix}
          </span>
        )}
        <input
          type="number"
          step="any"
          value={inputs[key]}
          onChange={(e) => updateInput(key, e.target.value)}
          placeholder={opts?.placeholder ?? '0'}
          className={`w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${opts?.prefix ? 'pl-7' : ''} ${opts?.suffix ? 'pr-8' : ''}`}
        />
        {opts?.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {opts.suffix}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => router.push('/deals')}
            className="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
          >
            ← Back to Deals
          </button>
          <h1 className="text-3xl font-bold">Create New Deal</h1>
          <p className="text-gray-400 mt-1">Enter property details and financial assumptions.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Property Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Deal Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sunset Apartments"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, ST"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Property Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {inputField('Units', 'units', { placeholder: 'e.g. 12' })}
              {inputField('Square Footage', 'square_footage', { suffix: 'sqft' })}
            </div>
          </section>

          {/* Financial Assumptions */}
          <section className="bg-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Acquisition & Financing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inputField('Asking Price', 'asking_price', { prefix: '$', placeholder: '500000' })}
              {inputField('Down Payment', 'down_payment_pct', { suffix: '%' })}
              {inputField('Interest Rate', 'interest_rate', { suffix: '%' })}
              {inputField('Loan Term', 'loan_term', { suffix: 'yrs' })}
              {inputField('Renovation Budget', 'renovation_budget', { prefix: '$' })}
            </div>
          </section>

          <section className="bg-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Income & Expenses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inputField('Gross Rental Income (Annual)', 'gross_rental_income', { prefix: '$' })}
              {inputField('Vacancy Rate', 'vacancy_rate', { suffix: '%' })}
              {inputField('Operating Expenses (Annual)', 'operating_expenses', { prefix: '$' })}
              {inputField('Cap Rate', 'cap_rate', { suffix: '%' })}
            </div>
          </section>

          <section className="bg-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-2">Exit Assumptions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inputField('Hold Period', 'hold_years', { suffix: 'yrs' })}
              {inputField('Exit Cap Rate', 'exit_cap_rate', { suffix: '%' })}
            </div>
          </section>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/deals')}
              className="px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
