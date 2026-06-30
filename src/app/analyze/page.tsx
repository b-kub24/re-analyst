'use client';

import Link from 'next/link';
import { useState } from 'react';

// ───────────────────── helpers ─────────────────────
const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

// ───────────────────── types ─────────────────────
interface FormData {
  address: string;
  city: string;
  state: string;
  propertyType: string;
  purchasePrice: number;
  downPaymentPct: number;
  closingCosts: number;
  units: number;
  avgRentPerUnit: number;
  annualTax: number;
  annualInsurance: number;
  maintenancePct: number;
  managementFeePct: number;
  interestRate: number;
  loanTermYears: number;
  amortizationYears: number;
  annualRentGrowth: number;
  annualExpenseGrowth: number;
  annualAppreciation: number;
  vacancyRate: number;
}

interface AnalysisResult {
  // key metrics
  noi: number;
  capRate: number;
  cashOnCash: number;
  dscr: number;
  annualCashFlow: number;
  monthlyPayment: number;
  annualDebtService: number;
  totalCashInvested: number;
  grm: number;
  breakEvenOccupancy: number;
  equityMultiple: number;
  irr: number;
  dealScore: number;
  loanAmount: number;
  grossAnnualIncome: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  proForma: ProFormaYear[];
}

interface ProFormaYear {
  year: number;
  grossIncome: number;
  vacancy: number;
  effectiveIncome: number;
  opex: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  propertyValue: number;
  equity: number;
  coc: number;
}

// ───────────────────── defaults ─────────────────────
const defaultForm: FormData = {
  address: '',
  city: '',
  state: '',
  propertyType: 'Multifamily',
  purchasePrice: 500000,
  downPaymentPct: 25,
  closingCosts: 10000,
  units: 4,
  avgRentPerUnit: 1200,
  annualTax: 6000,
  annualInsurance: 2400,
  maintenancePct: 5,
  managementFeePct: 8,
  interestRate: 7.0,
  loanTermYears: 30,
  amortizationYears: 30,
  annualRentGrowth: 3,
  annualExpenseGrowth: 2,
  annualAppreciation: 3,
  vacancyRate: 5,
};

// ───────────────────── calculations ─────────────────────
function analyze(f: FormData): AnalysisResult {
  const grossAnnualIncome = f.units * f.avgRentPerUnit * 12;
  const vacancyLoss = grossAnnualIncome * (f.vacancyRate / 100);
  const effectiveGrossIncome = grossAnnualIncome - vacancyLoss;

  const maintenance = f.purchasePrice * (f.maintenancePct / 100);
  const managementFee = effectiveGrossIncome * (f.managementFeePct / 100);
  const operatingExpenses = f.annualTax + f.annualInsurance + maintenance + managementFee;

  const noi = effectiveGrossIncome - operatingExpenses;
  const capRate = f.purchasePrice > 0 ? noi / f.purchasePrice : 0;

  const downPayment = f.purchasePrice * (f.downPaymentPct / 100);
  const loanAmount = f.purchasePrice - downPayment;
  const totalCashInvested = downPayment + f.closingCosts;

  // Monthly mortgage (P&I)
  const monthlyRate = f.interestRate / 100 / 12;
  const numPayments = f.amortizationYears * 12;
  let monthlyPayment = 0;
  if (monthlyRate > 0 && numPayments > 0 && loanAmount > 0) {
    monthlyPayment =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }
  const annualDebtService = monthlyPayment * 12;

  const annualCashFlow = noi - annualDebtService;
  const cashOnCash = totalCashInvested > 0 ? annualCashFlow / totalCashInvested : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const grm = grossAnnualIncome > 0 ? f.purchasePrice / grossAnnualIncome : 0;
  const breakEvenOccupancy =
    grossAnnualIncome > 0 ? (operatingExpenses + annualDebtService) / grossAnnualIncome : 0;

  // Remaining balance after loan term
  function remainingBalance(principal: number, rate: number, totalN: number, paymentsN: number) {
    if (rate === 0 || totalN === 0) return principal - (principal / totalN) * paymentsN;
    const r = rate / 12;
    return principal * (Math.pow(1 + r, paymentsN) - (Math.pow(1 + r, paymentsN) - 1) / (1 - 1 / Math.pow(1 + r, totalN)));
  }

  // 10-year pro forma
  const proForma: ProFormaYear[] = [];
  let cumCashFlow = 0;
  const irrCashFlows: number[] = [-totalCashInvested];

  for (let yr = 1; yr <= 10; yr++) {
    const gi = grossAnnualIncome * Math.pow(1 + f.annualRentGrowth / 100, yr - 1);
    const vac = gi * (f.vacancyRate / 100);
    const ei = gi - vac;
    const maint = f.purchasePrice * (f.maintenancePct / 100) * Math.pow(1 + f.annualExpenseGrowth / 100, yr - 1);
    const mgmt = ei * (f.managementFeePct / 100);
    const tax = f.annualTax * Math.pow(1 + f.annualExpenseGrowth / 100, yr - 1);
    const ins = f.annualInsurance * Math.pow(1 + f.annualExpenseGrowth / 100, yr - 1);
    const opex = tax + ins + maint + mgmt;
    const yearNoi = ei - opex;
    const cf = yearNoi - annualDebtService;
    const pv = f.purchasePrice * Math.pow(1 + f.annualAppreciation / 100, yr);

    // rough equity = value - remaining loan balance
    const paymentsMade = yr * 12;
    const r = f.interestRate / 100;
    let bal = loanAmount;
    if (r > 0 && numPayments > 0) {
      const mr = r / 12;
      bal =
        loanAmount *
        ((Math.pow(1 + mr, numPayments) - Math.pow(1 + mr, paymentsMade)) /
          (Math.pow(1 + mr, numPayments) - 1));
    } else if (numPayments > 0) {
      bal = loanAmount * (1 - paymentsMade / numPayments);
    }
    const equity = pv - Math.max(bal, 0);

    cumCashFlow += cf;

    proForma.push({
      year: yr,
      grossIncome: gi,
      vacancy: vac,
      effectiveIncome: ei,
      opex,
      noi: yearNoi,
      debtService: annualDebtService,
      cashFlow: cf,
      propertyValue: pv,
      equity,
      coc: totalCashInvested > 0 ? cf / totalCashInvested : 0,
    });

    irrCashFlows.push(cf + (yr === 10 ? pv - Math.max(bal, 0) : 0));
  }

  // equity multiple
  const totalCashReceived = cumCashFlow + (proForma[9]?.equity || 0);
  const equityMultiple = totalCashInvested > 0 ? totalCashReceived / totalCashInvested : 0;

  // simple IRR (Newton's method)
  let irr = 0.1;
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < irrCashFlows.length; t++) {
      npv += irrCashFlows[t] / Math.pow(1 + irr, t);
      dnpv -= (t * irrCashFlows[t]) / Math.pow(1 + irr, t + 1);
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const newIrr = irr - npv / dnpv;
    if (Math.abs(newIrr - irr) < 1e-8) {
      irr = newIrr;
      break;
    }
    irr = newIrr;
  }
  if (!isFinite(irr) || isNaN(irr)) irr = 0;

  // deal score (0-100)
  let score = 0;
  if (capRate >= 0.08) score += 20;
  else if (capRate >= 0.06) score += 15;
  else if (capRate >= 0.04) score += 8;
  else score += 2;

  if (cashOnCash >= 0.12) score += 20;
  else if (cashOnCash >= 0.08) score += 15;
  else if (cashOnCash >= 0.05) score += 8;
  else if (cashOnCash > 0) score += 3;

  if (dscr >= 1.5) score += 20;
  else if (dscr >= 1.25) score += 15;
  else if (dscr >= 1.0) score += 8;
  else score += 0;

  if (irr >= 0.15) score += 20;
  else if (irr >= 0.10) score += 15;
  else if (irr >= 0.05) score += 8;
  else if (irr > 0) score += 3;

  if (breakEvenOccupancy <= 0.75) score += 10;
  else if (breakEvenOccupancy <= 0.85) score += 7;
  else if (breakEvenOccupancy <= 0.95) score += 3;
  else score += 0;

  if (equityMultiple >= 2.5) score += 10;
  else if (equityMultiple >= 2.0) score += 7;
  else if (equityMultiple >= 1.5) score += 4;
  else score += 1;

  return {
    noi,
    capRate,
    cashOnCash,
    dscr,
    annualCashFlow,
    monthlyPayment,
    annualDebtService,
    totalCashInvested,
    grm,
    breakEvenOccupancy,
    equityMultiple,
    irr,
    dealScore: Math.min(score, 100),
    loanAmount,
    grossAnnualIncome,
    effectiveGrossIncome,
    operatingExpenses,
    proForma,
  };
}

// ───────────────────── colour helpers ─────────────────────
function metricColor(value: number, good: number, mid: number, invert = false): string {
  if (invert) {
    if (value <= good) return 'text-emerald-400';
    if (value <= mid) return 'text-yellow-400';
    return 'text-red-400';
  }
  if (value >= good) return 'text-emerald-400';
  if (value >= mid) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreBg(s: number) {
  if (s >= 70) return 'from-emerald-600 to-emerald-400';
  if (s >= 50) return 'from-yellow-600 to-yellow-400';
  return 'from-red-600 to-red-400';
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excellent';
  if (s >= 70) return 'Strong';
  if (s >= 55) return 'Fair';
  if (s >= 40) return 'Weak';
  return 'Poor';
}

// ───────────────────── component ─────────────────────
export default function AnalyzePage() {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const set = (key: keyof FormData, val: string | number) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = analyze(form);
    setResult(res);
    setShowResults(true);
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loanAmount = form.purchasePrice - form.purchasePrice * (form.downPaymentPct / 100);

  // ────── field helpers ──────
  const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition';
  const labelCls = 'block text-sm font-medium text-gray-300 mb-1';

  function Field({
    label,
    id,
    value,
    onChange,
    prefix,
    suffix,
    type = 'number',
    placeholder,
  }: {
    label: string;
    id: keyof FormData;
    value: string | number;
    onChange: (v: string) => void;
    prefix?: string;
    suffix?: string;
    type?: string;
    placeholder?: string;
  }) {
    return (
      <div>
        <label htmlFor={id} className={labelCls}>
          {label}
        </label>
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {prefix}
            </span>
          )}
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${inputCls} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-8' : ''}`}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {suffix}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-blue-500">RE</span> Analyst
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm text-gray-400 hover:text-white transition">
              Features
            </Link>
            <Link href="/#pricing" className="text-sm text-gray-400 hover:text-white transition">
              Pricing
            </Link>
            <Link href="/analyze" className="text-sm text-blue-400 font-medium hover:text-blue-300 transition">
              Analyze a Deal
            </Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Page header */}
      <section className="pt-24 pb-6 px-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Analyze a{' '}
            <span className="bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">
              Deal
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Enter your deal details below and get instant financial analysis — Cap Rate, Cash-on-Cash,
            DSCR, IRR, a 10-year pro forma, and an overall Deal Score. No account required.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="px-6 pb-12">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto space-y-8">
          {/* ── Property Info ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🏢</span> Property Information
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <Field
                  label="Property Address"
                  id="address"
                  value={form.address}
                  onChange={(v) => set('address', v)}
                  type="text"
                  placeholder="123 Main St"
                />
              </div>
              <Field
                label="City"
                id="city"
                value={form.city}
                onChange={(v) => set('city', v)}
                type="text"
                placeholder="Austin"
              />
              <Field
                label="State"
                id="state"
                value={form.state}
                onChange={(v) => set('state', v)}
                type="text"
                placeholder="TX"
              />
              <div>
                <label htmlFor="propertyType" className={labelCls}>
                  Property Type
                </label>
                <select
                  id="propertyType"
                  value={form.propertyType}
                  onChange={(e) => set('propertyType', e.target.value)}
                  className={inputCls}
                >
                  <option>Multifamily</option>
                  <option>SFR</option>
                  <option>Mixed Use</option>
                  <option>Commercial</option>
                </select>
              </div>
              <Field
                label="Number of Units"
                id="units"
                value={form.units}
                onChange={(v) => set('units', Number(v))}
              />
            </div>
          </div>

          {/* ── Purchase & Financing ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">💰</span> Purchase &amp; Financing
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field
                label="Purchase Price"
                id="purchasePrice"
                value={form.purchasePrice}
                onChange={(v) => set('purchasePrice', Number(v))}
                prefix="$"
              />
              <Field
                label="Down Payment"
                id="downPaymentPct"
                value={form.downPaymentPct}
                onChange={(v) => set('downPaymentPct', Number(v))}
                suffix="%"
              />
              <Field
                label="Closing Costs"
                id="closingCosts"
                value={form.closingCosts}
                onChange={(v) => set('closingCosts', Number(v))}
                prefix="$"
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="bg-gray-800/50 rounded-lg px-4 py-3 text-sm text-gray-300 flex items-center gap-4 flex-wrap">
                  <span>
                    Loan Amount:{' '}
                    <span className="text-white font-semibold">{fmt(loanAmount)}</span>
                  </span>
                  <span className="text-gray-600">|</span>
                  <span>
                    Down Payment:{' '}
                    <span className="text-white font-semibold">
                      {fmt(form.purchasePrice * (form.downPaymentPct / 100))}
                    </span>
                  </span>
                  <span className="text-gray-600">|</span>
                  <span>
                    Total Cash Needed:{' '}
                    <span className="text-white font-semibold">
                      {fmt(form.purchasePrice * (form.downPaymentPct / 100) + form.closingCosts)}
                    </span>
                  </span>
                </div>
              </div>
              <Field
                label="Interest Rate"
                id="interestRate"
                value={form.interestRate}
                onChange={(v) => set('interestRate', Number(v))}
                suffix="%"
              />
              <Field
                label="Loan Term (years)"
                id="loanTermYears"
                value={form.loanTermYears}
                onChange={(v) => set('loanTermYears', Number(v))}
              />
              <Field
                label="Amortization (years)"
                id="amortizationYears"
                value={form.amortizationYears}
                onChange={(v) => set('amortizationYears', Number(v))}
              />
            </div>
          </div>

          {/* ── Income ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span> Income
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field
                label="Avg Monthly Rent / Unit"
                id="avgRentPerUnit"
                value={form.avgRentPerUnit}
                onChange={(v) => set('avgRentPerUnit', Number(v))}
                prefix="$"
              />
              <Field
                label="Vacancy Rate"
                id="vacancyRate"
                value={form.vacancyRate}
                onChange={(v) => set('vacancyRate', Number(v))}
                suffix="%"
              />
              <div>
                <div className="bg-gray-800/50 rounded-lg px-4 py-3 text-sm text-gray-300 mt-6">
                  Gross Annual Income:{' '}
                  <span className="text-white font-semibold">
                    {fmt(form.units * form.avgRentPerUnit * 12)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Operating Expenses ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🧾</span> Operating Expenses
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field
                label="Annual Property Tax"
                id="annualTax"
                value={form.annualTax}
                onChange={(v) => set('annualTax', Number(v))}
                prefix="$"
              />
              <Field
                label="Annual Insurance"
                id="annualInsurance"
                value={form.annualInsurance}
                onChange={(v) => set('annualInsurance', Number(v))}
                prefix="$"
              />
              <Field
                label="Maintenance (% of value)"
                id="maintenancePct"
                value={form.maintenancePct}
                onChange={(v) => set('maintenancePct', Number(v))}
                suffix="%"
              />
              <Field
                label="Management Fee (% of income)"
                id="managementFeePct"
                value={form.managementFeePct}
                onChange={(v) => set('managementFeePct', Number(v))}
                suffix="%"
              />
            </div>
          </div>

          {/* ── Growth Assumptions ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span> Growth Assumptions
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field
                label="Annual Rent Growth"
                id="annualRentGrowth"
                value={form.annualRentGrowth}
                onChange={(v) => set('annualRentGrowth', Number(v))}
                suffix="%"
              />
              <Field
                label="Annual Expense Growth"
                id="annualExpenseGrowth"
                value={form.annualExpenseGrowth}
                onChange={(v) => set('annualExpenseGrowth', Number(v))}
                suffix="%"
              />
              <Field
                label="Annual Appreciation"
                id="annualAppreciation"
                value={form.annualAppreciation}
                onChange={(v) => set('annualAppreciation', Number(v))}
                suffix="%"
              />
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="text-center">
            <button
              type="submit"
              className="px-12 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-lg font-bold transition shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
            >
              Analyze Deal →
            </button>
          </div>
        </form>
      </section>

      {/* ═══════════════════════ RESULTS ═══════════════════════ */}
      {showResults && result && (
        <section id="results" className="px-6 pb-20 border-t border-gray-800 pt-12">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">Analysis Results</h2>
                <p className="text-gray-400 text-sm">
                  {form.address ? `${form.address}, ` : ''}
                  {form.city ? `${form.city}, ` : ''}
                  {form.state || ''} — {form.propertyType} ({form.units} units)
                </p>
              </div>
              {/* Deal Score */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Deal Score</div>
                  <div className="text-sm font-medium text-gray-300">{scoreLabel(result.dealScore)}</div>
                </div>
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${scoreBg(
                    result.dealScore
                  )} flex items-center justify-center shadow-lg`}
                >
                  <span className="text-2xl font-black text-white">{result.dealScore}</span>
                </div>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                {
                  label: 'Cap Rate',
                  value: pct(result.capRate),
                  color: metricColor(result.capRate, 0.06, 0.04),
                },
                {
                  label: 'Cash-on-Cash',
                  value: pct(result.cashOnCash),
                  color: metricColor(result.cashOnCash, 0.08, 0.04),
                },
                {
                  label: 'DSCR',
                  value: result.dscr.toFixed(2) + 'x',
                  color: metricColor(result.dscr, 1.25, 1.0),
                },
                {
                  label: 'Annual Cash Flow',
                  value: fmt(result.annualCashFlow),
                  color: metricColor(result.annualCashFlow, 1, 0),
                },
                {
                  label: 'NOI',
                  value: fmt(result.noi),
                  color: metricColor(result.noi, 1, 0),
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
                >
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{m.label}</div>
                  <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Secondary Metrics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'IRR (10-yr)', value: pct(result.irr) },
                { label: 'Equity Multiple', value: result.equityMultiple.toFixed(2) + 'x' },
                { label: 'GRM', value: result.grm.toFixed(2) },
                { label: 'Break-Even Occupancy', value: pct(result.breakEvenOccupancy) },
                { label: 'Monthly Payment (P&I)', value: fmt(result.monthlyPayment) },
                { label: 'Annual Debt Service', value: fmt(result.annualDebtService) },
                { label: 'Total Cash Invested', value: fmt(result.totalCashInvested) },
                { label: 'Loan Amount', value: fmt(result.loanAmount) },
              ].map((m) => (
                <div
                  key={m.label}
                  className="bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3 flex justify-between items-center"
                >
                  <span className="text-sm text-gray-400">{m.label}</span>
                  <span className="text-sm font-semibold text-white">{m.value}</span>
                </div>
              ))}
            </div>

            {/* Income / Expense Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Income Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gross Annual Income</span>
                    <span>{fmt(result.grossAnnualIncome)}</span>
                  </div>
                  <div className="flex justify-between text-red-400">
                    <span>Less: Vacancy ({form.vacancyRate}%)</span>
                    <span>-{fmt(result.grossAnnualIncome - result.effectiveGrossIncome)}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 flex justify-between font-semibold">
                    <span>Effective Gross Income</span>
                    <span>{fmt(result.effectiveGrossIncome)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Expense Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Property Tax</span>
                    <span>{fmt(form.annualTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Insurance</span>
                    <span>{fmt(form.annualInsurance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Maintenance ({form.maintenancePct}%)</span>
                    <span>{fmt(form.purchasePrice * (form.maintenancePct / 100))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Management ({form.managementFeePct}%)</span>
                    <span>
                      {fmt(result.effectiveGrossIncome * (form.managementFeePct / 100))}
                    </span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 flex justify-between font-semibold">
                    <span>Total Operating Expenses</span>
                    <span>{fmt(result.operatingExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 10-Year Pro Forma */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-x-auto">
              <h3 className="font-semibold mb-4">10-Year Pro Forma</h3>
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase border-b border-gray-800">
                    <th className="py-2 pr-4 text-left">Year</th>
                    <th className="py-2 px-3 text-right">Gross Income</th>
                    <th className="py-2 px-3 text-right">Op. Expenses</th>
                    <th className="py-2 px-3 text-right">NOI</th>
                    <th className="py-2 px-3 text-right">Debt Service</th>
                    <th className="py-2 px-3 text-right">Cash Flow</th>
                    <th className="py-2 px-3 text-right">CoC</th>
                    <th className="py-2 px-3 text-right">Property Value</th>
                    <th className="py-2 pl-3 text-right">Equity</th>
                  </tr>
                </thead>
                <tbody>
                  {result.proForma.map((yr) => (
                    <tr key={yr.year} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 pr-4 font-medium">{yr.year}</td>
                      <td className="py-2 px-3 text-right">{fmt(yr.grossIncome)}</td>
                      <td className="py-2 px-3 text-right">{fmt(yr.opex)}</td>
                      <td className="py-2 px-3 text-right">{fmt(yr.noi)}</td>
                      <td className="py-2 px-3 text-right">{fmt(yr.debtService)}</td>
                      <td className={`py-2 px-3 text-right font-medium ${yr.cashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(yr.cashFlow)}
                      </td>
                      <td className="py-2 px-3 text-right">{pct(yr.coc)}</td>
                      <td className="py-2 px-3 text-right">{fmt(yr.propertyValue)}</td>
                      <td className="py-2 pl-3 text-right text-blue-400">{fmt(yr.equity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* What the Score Means */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold mb-3">Score Breakdown</h3>
              <p className="text-sm text-gray-400 mb-4">
                The Deal Score is a weighted composite of six key metrics. Here&#39;s how this deal stacks
                up:
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  {
                    metric: 'Cap Rate',
                    val: pct(result.capRate),
                    good: '≥ 6%',
                    status: result.capRate >= 0.06 ? 'good' : result.capRate >= 0.04 ? 'mid' : 'bad',
                  },
                  {
                    metric: 'Cash-on-Cash',
                    val: pct(result.cashOnCash),
                    good: '≥ 8%',
                    status:
                      result.cashOnCash >= 0.08 ? 'good' : result.cashOnCash >= 0.05 ? 'mid' : 'bad',
                  },
                  {
                    metric: 'DSCR',
                    val: result.dscr.toFixed(2) + 'x',
                    good: '≥ 1.25x',
                    status: result.dscr >= 1.25 ? 'good' : result.dscr >= 1.0 ? 'mid' : 'bad',
                  },
                  {
                    metric: 'IRR',
                    val: pct(result.irr),
                    good: '≥ 10%',
                    status: result.irr >= 0.1 ? 'good' : result.irr >= 0.05 ? 'mid' : 'bad',
                  },
                  {
                    metric: 'Break-Even Occ.',
                    val: pct(result.breakEvenOccupancy),
                    good: '≤ 85%',
                    status:
                      result.breakEvenOccupancy <= 0.75
                        ? 'good'
                        : result.breakEvenOccupancy <= 0.85
                        ? 'mid'
                        : 'bad',
                  },
                  {
                    metric: 'Equity Multiple',
                    val: result.equityMultiple.toFixed(2) + 'x',
                    good: '≥ 2.0x',
                    status:
                      result.equityMultiple >= 2.0
                        ? 'good'
                        : result.equityMultiple >= 1.5
                        ? 'mid'
                        : 'bad',
                  },
                ].map((s) => (
                  <div
                    key={s.metric}
                    className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-3"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        s.status === 'good'
                          ? 'bg-emerald-400'
                          : s.status === 'mid'
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.metric}</div>
                      <div className="text-xs text-gray-500">Target: {s.good}</div>
                    </div>
                    <div className="text-sm font-semibold">{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-4">
              <p className="text-gray-400 text-sm mb-4">
                Want AI-powered insights, PDF reports, and portfolio tracking?
              </p>
              <Link
                href="/signup"
                className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-lg font-medium transition"
              >
                Create Free Account →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">© 2024 RE Analyst. All rights reserved.</div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
