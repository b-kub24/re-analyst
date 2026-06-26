/**
 * IRR (Internal Rate of Return) calculations using Newton-Raphson method.
 */

/**
 * Calculates the Net Present Value of a series of cash flows at a given rate.
 * Used internally by IRR calculations.
 */
function npvAtRate(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i), 0);
}

/**
 * Calculates the derivative of NPV with respect to rate.
 * Used internally by Newton-Raphson iteration.
 */
function npvDerivative(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((acc, cf, i) => {
    if (i === 0) return acc;
    return acc - (i * cf) / Math.pow(1 + rate, i + 1);
  }, 0);
}

/**
 * Bisection method fallback for IRR when Newton-Raphson fails to converge.
 */
function irrBisection(cashFlows: number[]): number {
  const MAX_ITERATIONS = 1000;
  const TOLERANCE = 1e-7;

  let low = -0.999;
  let high = 10.0;

  while (npvAtRate(high, cashFlows) > 0 && high < 1000) {
    high *= 2;
  }

  if (npvAtRate(low, cashFlows) * npvAtRate(high, cashFlows) > 0) {
    return NaN;
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const npvMid = npvAtRate(mid, cashFlows);

    if (Math.abs(npvMid) < TOLERANCE || (high - low) / 2 < TOLERANCE) {
      return mid;
    }

    if (npvMid * npvAtRate(low, cashFlows) < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return NaN;
}

/**
 * Calculates the Internal Rate of Return (IRR) using the Newton-Raphson method.
 *
 * @param cashFlows - Array of cash flows where index 0 is the initial investment
 *                   (typically negative) and subsequent values are periodic returns.
 * @returns IRR as a decimal (e.g., 0.15 for 15%), or NaN if no convergence.
 *
 * @example
 * // Initial investment of -100,000 with annual returns
 * calculateIRR([-100000, 15000, 20000, 25000, 30000, 80000]) // ~0.2145
 */
export function calculateIRR(cashFlows: number[]): number {
  if (!cashFlows || cashFlows.length < 2) {
    return NaN;
  }

  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) {
    return NaN;
  }

  const MAX_ITERATIONS = 1000;
  const TOLERANCE = 1e-7;

  let rate = 0.1;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const npv = npvAtRate(rate, cashFlows);
    const derivative = npvDerivative(rate, cashFlows);

    if (Math.abs(derivative) < 1e-12) {
      break;
    }

    const newRate = rate - npv / derivative;

    if (Math.abs(newRate - rate) < TOLERANCE) {
      if (newRate <= -1) {
        return NaN;
      }
      return newRate;
    }

    rate = newRate <= -1 ? rate / 2 : newRate;
  }

  return irrBisection(cashFlows);
}

/**
 * Calculates the XIRR (date-weighted IRR) for irregular cash flows.
 *
 * Unlike standard IRR which assumes equally-spaced periods, XIRR accounts
 * for the actual dates of each cash flow using a 365-day year convention.
 *
 * @param cashFlows - Array of cash flow amounts (index 0 must be negative).
 * @param dates - Array of dates corresponding to each cash flow.
 * @returns XIRR as a decimal, or NaN if inputs are invalid or no convergence.
 *
 * @example
 * const flows = [-100000, 25000, 30000, 120000];
 * const dates = [new Date('2023-01-01'), new Date('2023-07-01'), new Date('2024-01-01'), new Date('2025-01-01')];
 * calculateXIRR(flows, dates); // Returns annualized IRR
 */
export function calculateXIRR(cashFlows: number[], dates: Date[]): number {
  if (!cashFlows || !dates || cashFlows.length !== dates.length || cashFlows.length < 2) {
    return NaN;
  }

  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) {
    return NaN;
  }

  const startDate = dates[0];
  const MAX_ITERATIONS = 1000;
  const TOLERANCE = 1e-7;

  function xnpv(rate: number): number {
    return cashFlows.reduce((acc, cf, i) => {
      const days = (dates[i].getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      return acc + cf / Math.pow(1 + rate, years);
    }, 0);
  }

  function xnpvDerivative(rate: number): number {
    return cashFlows.reduce((acc, cf, i) => {
      const days = (dates[i].getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const years = days / 365;
      if (years === 0) return acc;
      return acc - (years * cf) / Math.pow(1 + rate, years + 1);
    }, 0);
  }

  let rate = 0.1;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const npv = xnpv(rate);
    const derivative = xnpvDerivative(rate);

    if (Math.abs(derivative) < 1e-12) {
      break;
    }

    const newRate = rate - npv / derivative;

    if (Math.abs(newRate - rate) < TOLERANCE) {
      if (newRate <= -1) {
        return NaN;
      }
      return newRate;
    }

    rate = newRate <= -1 ? rate / 2 : newRate;
  }

  // Bisection fallback for XIRR
  let low = -0.999;
  let high = 10.0;

  while (xnpv(high) > 0 && high < 1000) {
    high *= 2;
  }

  if (xnpv(low) * xnpv(high) > 0) {
    return NaN;
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const npvMid = xnpv(mid);

    if (Math.abs(npvMid) < TOLERANCE || (high - low) / 2 < TOLERANCE) {
      return mid;
    }

    if (npvMid * xnpv(low) < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return NaN;
}
