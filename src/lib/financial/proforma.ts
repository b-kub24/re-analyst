import {
  generateAmortizationSchedule,
  generateInterestOnlySchedule,
  type AmortizationSchedule,
} from './amortization';

// âââ Input types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface DealInputs {
  asking_price: number;
  current_noi: number;
  gross_income: number;
  vacancy_rate: number;
  operating_expenses: {
    property_tax: number;
    insurance: number;
    maintenance: number;
    management_fee_pct: number;
    utilities: number;
    other: number;
  };
  financing: {
    loan_amount: number;
    interest_rate: number;
    term_years: number;
    amortization_years: number;
    loan_type: 'fixed' | 'variable' | 'interest-only';
  };
  value_add: {
    renovation_budget: number;
    timeline_months: number;
    rent_increase_pct: number;
    expense_reduction_pct: number;
    exit_cap_rate: number;
  };
  assumptions?: {
    rent_growth_rate?: number;    // default 3%
    expense_growth_rate?: number; // default 2.5%
    vacancy_rate?: number;        // default from inputs
  };
}

// âââ Output types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface ProFormaYear {
  year: number;
  grossRevenue: number;
  vacancyLoss: number;
  effectiveRevenue: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  equityValue: number;
  irr: number;  // IRR if sold at end of this year
  cashOnCash: number;
}

export interface ProFormaResults {
  years: ProFormaYear[];
  equity_multiple: number;
  irr_10yr: number;
  total_cash_flow: number;
  exit_value: number;
  total_return: number;
  cash_on_cash_avg: number;
  dscr: ProFormaYear[];  // one entry per year, reusing ProFormaYear
}

// âââ IRR solver (Newton-Raphson with bisection fallback) âââââââââââââââââââââ

/**
 * Computes the Net Present Value of a cash flow series for a given rate.
 * cashFlows[0] is the initial investment (typically negative).
 */
function npv(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

function npvDerivative(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce(
    (acc, cf, t) =>
      t === 0 ? acc : acc - (t * cf) / Math.pow(1 + rate, t + 1),
    0
  );
}

/**
 * Solves for IRR using Newton-Raphson with bisection fallback.
 * Returns NaN if no solution is found.
 * cashFlows[0] must be negative (the initial equity outlay).
 */
function solveIRR(cashFlows: number[]): number {
  const MAX_ITER = 200;
  const TOLERANCE = 1e-9;

  // Newton-Raphson starting near 10%
  let rate = 0.1;
  for (let i = 0; i < MAX_ITER; i++) {
    const f = npv(rate, cashFlows);
    const fp = npvDerivative(rate, cashFlows);
    if (Math.abs(fp) < 1e-14) break;
    const next = rate - f / fp;
    if (Math.abs(next - rate) < TOLERANCE) {
      return next;
    }
    // Clamp to a sane range to avoid divergence
    rate = Math.max(-0.9999, Math.min(100, next));
  }

  // Bisection fallback
  let lo = -0.9999;
  let hi = 10.0;
  const fLo = npv(lo, cashFlows);
  const fHi = npv(hi, cashFlows);
  if (Math.sign(fLo) === Math.sign(fHi)) {
    return NaN;
  }
  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashFlows);
    if (Math.abs(fMid) < TOLERANCE || (hi - lo) / 2 < TOLERANCE) {
      return mid;
    }
    if (Math.sign(fMid) === Math.sign(npv(lo, cashFlows))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// âââ Amortization helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââ

/**
 * Returns the remaining loan balance at the end of a given year (1-indexed).
 * For interest-only loans the balance stays at loanAmount until the term ends.
 */
function loanBalanceAtYear(
  schedule: AmortizationSchedule,
  year: number,
  loanType: DealInputs['financing']['loan_type'],
  loanAmount: number
): number {
  if (loanType === 'interest-only') {
    return loanAmount;
  }
  const lastMonthIndex = Math.min(year * 12, schedule.rows.length) - 1;
  if (lastMonthIndex < 0) return loanAmount;
  return schedule.rows[lastMonthIndex].balance;
}

/**
 * Returns the total debt service payments for a given year.
 * Sums all monthly payment rows in that year's window.
 */
function annualDebtService(schedule: AmortizationSchedule, year: number): number {
  const startMonth = (year - 1) * 12; // 0-indexed inclusive
  const endMonth = Math.min(year * 12, schedule.rows.length); // exclusive
  let total = 0;
  for (let m = startMonth; m < endMonth; m++) {
    total += schedule.rows[m].payment;
  }
  return total;
}

// âââ Main export ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export function generateProForma(inputs: DealInputs): ProFormaResults {
  const {
    asking_price,
    gross_income,
    vacancy_rate,
    operating_expenses,
    financing,
    value_add,
    assumptions = {},
  } = inputs;

  const rentGrowthRate = assumptions.rent_growth_rate ?? 0.03;
  const expenseGrowthRate = assumptions.expense_growth_rate ?? 0.025;
  const effectiveVacancyRate = assumptions.vacancy_rate ?? vacancy_rate;

  const { loan_amount, interest_rate, term_years, amortization_years, loan_type } =
    financing;

  const {
    renovation_budget,
    timeline_months,
    rent_increase_pct,
    expense_reduction_pct,
    exit_cap_rate,
  } = value_add;

  // Equity the investor puts in upfront
  const equityInvested = asking_price - loan_amount + renovation_budget;

  // Build amortization schedule once for the full term
  const amortSchedule: AmortizationSchedule =
    loan_type === 'interest-only'
      ? generateInterestOnlySchedule(loan_amount, interest_rate, term_years)
      : generateAmortizationSchedule(
          loan_amount,
          interest_rate,
          term_years,
          amortization_years
        );

  // Fixed expense base (management fee is calculated as % of effective revenue separately)
  const baseFixedExpenses =
    operating_expenses.property_tax +
    operating_expenses.insurance +
    operating_expenses.maintenance +
    operating_expenses.utilities +
    operating_expenses.other;

  // The year in which the value-add renovation completes (fractional years allowed)
  // e.g. timeline_months = 18 â valueAddYear = 1.5 â uplift applies starting year 2
  const valueAddYear = Math.ceil(timeline_months / 12);

  // Whether the value-add lift has been applied yet (one-time additive bump)
  let valueAddApplied = false;

  // âââ Build year-by-year rows ââââââââââââââââââââââââââââââââââââââââââââââââ
  const years: ProFormaYear[] = [];
  let cumulativeCashFlow = 0;
  // operatingCashFlows[i] = cash flow for year i+1 (0-indexed array)
  const operatingCashFlows: number[] = [];

  for (let year = 1; year <= 10; year++) {
    let grossRevenue: number;
    if (year === 1) {
      grossRevenue = gross_income;
    } else {
      grossRevenue = years[year - 2].grossRevenue * (1 + rentGrowthRate);
    }

    if (!valueAddApplied && year >= valueAddYear) {
      grossRevenue *= 1 + rent_increase_pct / 100;
      valueAddApplied = true;
    }

    const vacancyLoss = grossRevenue * effectiveVacancyRate;
    const effectiveRevenue = grossRevenue - vacancyLoss;

    let fixedExpenses = baseFixedExpenses * Math.pow(1 + expenseGrowthRate, year - 1);

    if (year >= valueAddYear) {
      fixedExpenses *= 1 - expense_reduction_pct / 100;
    }

    const managementFee =
      effectiveRevenue * (operating_expenses.management_fee_pct / 100);
    const totalOperatingExpenses = fixedExpenses + managementFee;

    const noi = effectiveRevenue - totalOperatingExpenses;

    const debtService = annualDebtService(amortSchedule, year);

    const cashFlow = noi - debtService;
    cumulativeCashFlow += cashFlow;
    operatingCashFlows.push(cashFlow);

    const loanBalance = loanBalanceAtYear(amortSchedule, year, loan_type, loan_amount);
    const propertyValue = noi / exit_cap_rate;
    const equityValue = propertyValue - loanBalance;

    const cashOnCash = equityInvested !== 0 ? cashFlow / equityInvested : 0;

    const irrCashFlows: number[] = [-equityInvested];
    for (let y = 0; y < year; y++) {
      if (y < year - 1) {
        irrCashFlows.push(operatingCashFlows[y]);
      } else {
        irrCashFlows.push(operatingCashFlows[y] + equityValue);
      }
    }
    const irrRaw = solveIRR(irrCashFlows);

    years.push({
      year,
      grossRevenue,
      vacancyLoss,
      effectiveRevenue,
      operatingExpenses: totalOperatingExpenses,
      noi,
      debtService,
      cashFlow,
      cumulativeCashFlow,
      equityValue,
      irr: isNaN(irrRaw) ? 0 : irrRaw,
      cashOnCash,
    });
  }

  const year10 = years[9];
  const exitValue = year10.noi / exit_cap_rate;
  const loanBalanceYear10 = loanBalanceAtYear(
    amortSchedule,
    10,
    loan_type,
    loan_amount
  );
  const totalCashFlow = operatingCashFlows.reduce((a, b) => a + b, 0);

  const equityMultiple =
    equityInvested !== 0
      ? (totalCashFlow + exitValue - loanBalanceYear10) / equityInvested
      : 0;

  const irr10yr = year10.irr;

  const totalReturn =
    totalCashFlow + (exitValue - loanBalanceYear10) - equityInvested;

  const cashOnCashAvg =
    years.reduce((sum, y) => sum + y.cashOnCash, 0) / years.length;

  const dscr: ProFormaYear[] = years.map((y) => ({
    ...y,
    cashOnCash: y.debtService !== 0 ? y.noi / y.debtService : 0,
  }));

  return {
    years,
    equity_multiple: equityMultiple,
    irr_10yr: irr10yr,
    total_cash_flow: totalCashFlow,
    exit_value: exitValue,
    total_return: totalReturn,
    cash_on_cash_avg: cashOnCashAvg,
    dscr,
  };
}
