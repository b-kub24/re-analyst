export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface AmortizationSchedule {
  rows: AmortizationRow[];
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  monthlyPayment: number;
}

/**
 * Returns the monthly P&I payment using the standard annuity formula.
 * Handles 0% interest as a special case (payment = principal / n).
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  amortizationYears: number
): number {
  const n = amortizationYears * 12;
  if (annualRate === 0) {
    return principal / n;
  }
  const r = annualRate / 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Returns the remaining principal balance after termYears years of payments
 * on an amortization schedule of amortizationYears.
 */
export function calculateBalloonPayment(
  principal: number,
  annualRate: number,
  termYears: number,
  amortizationYears: number
): number {
  const n = amortizationYears * 12;
  const t = termYears * 12;
  if (annualRate === 0) {
    const payment = principal / n;
    return principal - payment * t;
  }
  const r = annualRate / 12;
  // Remaining balance formula: P * ((1+r)^n - (1+r)^t) / ((1+r)^n - 1)
  const pow_n = Math.pow(1 + r, n);
  const pow_t = Math.pow(1 + r, t);
  return (principal * (pow_n - pow_t)) / (pow_n - 1);
}

/**
 * Generates a standard P&I amortization schedule.
 * If termYears < amortizationYears, a balloon payment is added to the final month.
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number,
  amortizationYears?: number
): AmortizationSchedule {
  const amortYears = amortizationYears ?? termYears;
  const termMonths = termYears * 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, amortYears);
  const r = annualRate / 12;
  const hasBalloon = amortYears > termYears;

  const rows: AmortizationRow[] = [];
  let balance = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let totalPayment = 0;

  for (let month = 1; month <= termMonths; month++) {
    const interest = balance * r;
    let principalPaid = monthlyPayment - interest;
    let payment = monthlyPayment;

    if (month === termMonths && hasBalloon) {
      // Final month with balloon: add remaining balance on top of regular payment
      const balloon = balance - principalPaid;
      payment = monthlyPayment + Math.max(0, balloon);
      principalPaid = balance;
    } else if (month === termMonths) {
      // Last month without balloon: clean up floating point drift
      principalPaid = balance;
      payment = interest + principalPaid;
    }

    // Guard against floating point overshoot
    if (principalPaid > balance) {
      principalPaid = balance;
      payment = interest + principalPaid;
    }

    balance = Math.max(0, balance - principalPaid);
    cumulativeInterest += interest;
    cumulativePrincipal += principalPaid;
    totalPayment += payment;

    rows.push({
      month,
      payment,
      principal: principalPaid,
      interest,
      balance,
      cumulativeInterest,
      cumulativePrincipal,
    });
  }

  return {
    rows,
    totalPayment,
    totalInterest: cumulativeInterest,
    totalPrincipal: cumulativePrincipal,
    monthlyPayment,
  };
}

/**
 * Generates an interest-only payment schedule.
 * The balance never decreases; full principal is repaid in the final month.
 */
export function generateInterestOnlySchedule(
  principal: number,
  annualRate: number,
  termYears: number
): AmortizationSchedule {
  const termMonths = termYears * 12;
  const r = annualRate / 12;
  const monthlyPayment = principal * r;

  const rows: AmortizationRow[] = [];
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let totalPayment = 0;

  for (let month = 1; month <= termMonths; month++) {
    const interest = principal * r;
    const isLastMonth = month === termMonths;
    // Principal is returned only on final month
    const principalPaid = isLastMonth ? principal : 0;
    const payment = interest + principalPaid;
    const balance = isLastMonth ? 0 : principal;

    cumulativeInterest += interest;
    cumulativePrincipal += principalPaid;
    totalPayment += payment;

    rows.push({
      month,
      payment,
      principal: principalPaid,
      interest,
      balance,
      cumulativeInterest,
      cumulativePrincipal,
    });
  }

  return {
    rows,
    totalPayment,
    totalInterest: cumulativeInterest,
    totalPrincipal: cumulativePrincipal,
    monthlyPayment,
  };
}
