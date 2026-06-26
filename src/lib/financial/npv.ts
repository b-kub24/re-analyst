/**
 * NPV (Net Present Value) and related time-value-of-money calculations.
 */

/**
 * Calculates the Net Present Value of a series of cash flows.
 *
 * NPV = sum of cashFlow[i] / (1 + rate)^i for i = 0..n
 *
 * Note: cashFlow[0] is typically the initial investment (negative),
 * discounted at period 0 (i.e., not discounted â it's already in present value terms).
 *
 * @param discountRate - The discount rate as a decimal (e.g., 0.10 for 10%).
 * @param cashFlows - Array of periodic cash flows starting at period 0.
 * @returns The net present value.
 *
 * @example
 * calculateNPV(0.10, [-100000, 30000, 40000, 50000, 60000]) // ~$46,795
 */
export function calculateNPV(discountRate: number, cashFlows: number[]): number {
  if (!cashFlows || cashFlows.length === 0) {
    return 0;
  }
  if (discountRate <= -1) {
    throw new RangeError('Discount rate must be greater than -1 (i.e., -100%).');
  }

  return cashFlows.reduce((acc, cf, i) => {
    return acc + cf / Math.pow(1 + discountRate, i);
  }, 0);
}

/**
 * Calculates NPV with variable (non-uniform) time periods.
 *
 * Useful when cash flows do not occur at regular annual intervals.
 *
 * @param discountRate - The annual discount rate as a decimal.
 * @param cashFlows - Array of cash flow amounts.
 * @param periods - Array of time periods (in years) for each cash flow.
 *                  Must have the same length as cashFlows.
 * @returns The modified net present value.
 *
 * @example
 * // Cash flows at months 0, 6, 18, 36
 * calculateModifiedNPV(0.10, [-100000, 20000, 35000, 80000], [0, 0.5, 1.5, 3.0])
 */
export function calculateModifiedNPV(
  discountRate: number,
  cashFlows: number[],
  periods: number[]
): number {
  if (!cashFlows || !periods) {
    return 0;
  }
  if (cashFlows.length !== periods.length) {
    throw new RangeError('cashFlows and periods arrays must have the same length.');
  }
  if (discountRate <= -1) {
    throw new RangeError('Discount rate must be greater than -1 (i.e., -100%).');
  }

  return cashFlows.reduce((acc, cf, i) => {
    return acc + cf / Math.pow(1 + discountRate, periods[i]);
  }, 0);
}

/**
 * Calculates the Present Value of a future lump sum.
 *
 * PV = FV / (1 + rate)^periods
 *
 * @param futureValue - The future value amount.
 * @param rate - The discount rate per period as a decimal (e.g., 0.08 for 8%).
 * @param periods - Number of compounding periods.
 * @returns The present value.
 *
 * @example
 * calculatePresentValue(150000, 0.07, 5) // ~$106,938
 */
export function calculatePresentValue(
  futureValue: number,
  rate: number,
  periods: number
): number {
  if (rate <= -1) {
    throw new RangeError('Rate must be greater than -1.');
  }
  if (periods < 0) {
    throw new RangeError('Periods must be non-negative.');
  }
  if (periods === 0) {
    return futureValue;
  }
  return futureValue / Math.pow(1 + rate, periods);
}

/**
 * Calculates the Future Value of a present lump sum.
 *
 * FV = PV * (1 + rate)^periods
 *
 * @param presentValue - The present value amount.
 * @param rate - The growth rate per period as a decimal (e.g., 0.08 for 8%).
 * @param periods - Number of compounding periods.
 * @returns The future value.
 *
 * @example
 * calculateFutureValue(100000, 0.07, 5) // ~$140,255
 */
export function calculateFutureValue(
  presentValue: number,
  rate: number,
  periods: number
): number {
  if (rate <= -1) {
    throw new RangeError('Rate must be greater than -1.');
  }
  if (periods < 0) {
    throw new RangeError('Periods must be non-negative.');
  }
  return presentValue * Math.pow(1 + rate, periods);
}
