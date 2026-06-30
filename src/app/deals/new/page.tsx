'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface DealFormData {
  property_address: string;
  property_type: string;
  units: number | '';
  year_built: number | '';
  purchase_price: number | '';
  closing_costs: number | '';
  monthly_rent_per_unit: number | '';
  other_income: number | '';
  vacancy_rate: number | '';
  property_taxes: number | '';
  insurance: number | '';
  maintenance: number | '';
  management_fee: number | '';
  other_expenses: number | '';
  loan_amount: number | '';
  interest_rate: number | '';
  loan_term: number | '';
  amortization: number | '';
  rehab_budget: number | '';
  target_rent_increase: number | '';
  rehab_timeline: number | '';
}

const initialFormData: DealFormData = {
  property_address: '', property_type: 'multifamily', units: '', year_built: '',
  purchase_price: '', closing_costs: '', monthly_rent_per_unit: '', other_income: '',
  vacancy_rate: 5, property_taxes: '', insurance: '', maintenance: '', management_fee: '',
  other_expenses: '', loan_amount: '', interest_rate: '', loan_term: 30, amortization: 30,
  rehab_budget: '', target_rent_increase: '', rehab_timeline: '',
};

const steps = [
  'Property Info', 'Purchase', 'Income', 'Expenses', 'Financing', 'Value-Add', 'Review',
];

export default function NewDealPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<DealFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof DealFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-400';

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.property_address && formData.units;
      case 1: return formData.purchase_price;
      case 2: return formData.monthly_rent_per_unit;
      case 3: return formData.property_taxes;
      case 4: return formData.loan_amount && formData.interest_rate;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_address: formData.property_address,
          purchase_price: Number(formData.purchase_price),
          units: Number(formData.units) || null,
          property_type: formData.property_type,
          deal_data: formData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: data.deal.id }),
      });

      router.push(`/deals/${data.deal.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  const fmt = (v: number | '') => v ? `$${Number(v).toLocaleString()}` : '\u2014';

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Property Address *</label>
              <input className={inputClass} placeholder="123 Main St, City, ST 12345" value={formData.property_address} onChange={(e) => update('property_address', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Property Type</label>
              <select className={inputClass} value={formData.property_type} onChange={(e) => update('property_type', e.target.value)}>
                <option value="multifamily">Multifamily</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="industrial">Industrial</option>
                <option value="mixed_use">Mixed Use</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Number of Units *</label>
                <input className={inputClass} type="number" placeholder="24" value={formData.units} onChange={(e) => update('units', e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div>
                <label className={labelClass}>Year Built</label>
                <input className={inputClass} type="number" placeholder="1985" value={formData.year_built} onChange={(e) => update('year_built', e.target.value ? Number(e.target.value) : '')} />
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Purchase Price *</label>
              <input className={inputClass} type="number" placeholder="2500000" value={formData.purchase_price} onChange={(e) => update('purchase_price', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Closing Costs</label>
              <input className={inputClass} type="number" placeholder="50000" value={formData.closing_costs} onChange={(e) => update('closing_costs', e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Monthly Rent per Unit *</label>
              <input className={inputClass} type="number" placeholder="1200" value={formData.monthly_rent_per_unit} onChange={(e) => update('monthly_rent_per_unit', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Other Monthly Income</label>
              <input className={inputClass} type="number" placeholder="500" value={formData.other_income} onChange={(e) => update('other_income', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Vacancy Rate (%)</label>
              <input className={inputClass} type="number" placeholder="5" value={formData.vacancy_rate} onChange={(e) => update('vacancy_rate', e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Annual Property Taxes *</label>
              <input className={inputClass} type="number" placeholder="35000" value={formData.property_taxes} onChange={(e) => update('property_taxes', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Annual Insurance</label>
              <input className={inputClass} type="number" placeholder="12000" value={formData.insurance} onChange={(e) => update('insurance', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Annual Maintenance</label>
              <input className={inputClass} type="number" placeholder="15000" value={formData.maintenance} onChange={(e) => update('maintenance', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Management Fee (%)</label>
              <input className={inputClass} type="number" placeholder="8" value={formData.management_fee} onChange={(e) => update('management_fee', e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Loan Amount *</label>
              <input className={inputClass} type="number" placeholder="1875000" value={formData.loan_amount} onChange={(e) => update('loan_amount', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Interest Rate (%) *</label>
              <input className={inputClass} type="number" step="0.01" placeholder="6.5" value={formData.interest_rate} onChange={(e) => update('interest_rate', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Loan Term (years)</label>
                <input className={inputClass} type="number" placeholder="30" value={formData.loan_term} onChange={(e) => update('loan_term', e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div>
                <label className={labelClass}>Amortization (years)</label>
                <input className={inputClass} type="number" placeholder="30" value={formData.amortization} onChange={(e) => update('amortization', e.target.value ? Number(e.target.value) : '')} />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Rehab Budget</label>
              <input className={inputClass} type="number" placeholder="200000" value={formData.rehab_budget} onChange={(e) => update('rehab_budget', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Target Rent Increase (%)</label>
              <input className={inputClass} type="number" placeholder="15" value={formData.target_rent_increase} onChange={(e) => update('target_rent_increase', e.target.value ? Number(e.target.value) : '')} />
            </div>
            <div>
              <label className={labelClass}>Rehab Timeline (months)</label>
              <input className={inputClass} type="number" placeholder="12" value={formData.rehab_timeline} onChange={(e) => update('rehab_timeline', e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Address', formData.property_address],
              ['Type', formData.property_type],
              ['Units', formData.units],
              ['Purchase Price', fmt(formData.purchase_price)],
              ['Loan Amount', fmt(formData.loan_amount)],
              ['Interest Rate', formData.interest_rate ? `${formData.interest_rate}%` : '\u2014'],
              ['Monthly Rent/Unit', fmt(formData.monthly_rent_per_unit)],
              ['Rehab Budget', fmt(formData.rehab_budget)],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-gray-800/50 p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-white">{value || '\u2014'}</p>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-3xl font-bold text-white">New Deal Analysis</h1>
          <p className="mb-8 text-gray-400">Enter your deal details for AI-powered analysis</p>

          <div className="mb-8 flex items-center gap-1">
            {steps.map((step, i) => (
              <div key={step} className="flex flex-1 flex-col items-center">
                <div className={`mb-1 h-1 w-full rounded-full ${i <= currentStep ? 'bg-emerald-500' : 'bg-gray-800'}`} />
                <span className={`text-xs ${i === currentStep ? 'text-emerald-400' : 'text-gray-600'}`}>{step}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-800 bg-red-900/20 p-4 text-sm text-red-400">{error}</div>
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">{steps[currentStep]}</h2>
            {renderStep()}
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setCurrentStep((s) => s - 1)} disabled={currentStep === 0}
              className="rounded-lg border border-gray-700 px-6 py-2.5 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30">
              Back
            </button>
            {currentStep < steps.length - 1 ? (
              <button onClick={() => setCurrentStep((s) => s + 1)} disabled={!canProceed()}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                Continue
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                {submitting ? 'Analyzing...' : 'Submit & Analyze'}
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
