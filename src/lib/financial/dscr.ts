/**
 * Debt Service Coverage Ratio (DSCR) and related lending metric calculations.
 *
 * DSCR is a key metric used by lenders to assess a property's ability to
 * service its debt obligations from operating income.
 */

/**
 * Calculates the Debt Service Coverage Ratio (DSCR).
 *
 * DSCR = Annual NOI / Annual Debt Service
 *
 * A DSCR above 1.0 means the property generates more income than needed
 * to cover its debt payments. Most lenders require a minimum of 1.20-1.25.
 *
 * @param annualNOI - Net Operating Income for the year.
 * @param annualDebtService - Total debt payments (principal + interest) for the year.
 * @returns DSCR as a ratio (e.g., 1.35 means NOI is 135% of debt service).
 *
 * @example
 * calculateDSCR(120000, 90000) // 1.333...
 */
export function calculateDSCR(annualNOI: number, annualDebtService: number): number {
  if (annualDebtService === 0) {
    // No debt â property is unlevered; return Infinity or a very large number
    return annualNOI > 0 ? Infinity : 0;
  }
  return annualNOI / annualDebtService;
}

/**
 * Calculates the Debt Yield.
 *
 * Debt Yield = Annual NOI / Loan Amount
 *
 * Debt yield is a lender metric that measures the income return on the loan
 * independent of cap rates or amortization. Typical minimums range from 7%-10%.
 *
 * @param annualNOI - Net Operating Income for the year.
 * @param loanAmount - The total loan (mortgage) amount.
 * @returns Debt yield as a decimal (e.g., 0.09 for 9%).
 *
 * @example
 * calculateDebtYield(90000, 1000000) // 0.09 (9%)
 */
export function calculateDebtYield(annualNOI: number, loanAmount: number): number {
  if (loanAmount === 0) {
    return 0;
  }
  return annualNOI / loanAmount;
}

/**
 * Calculates the Loan-to-Value (LTV) ratio.
 *
 * LTV = Loan Amount / Property Value
 *
 * Lower LTV means less risk for the lender. Most conventional commercial
 * lenders cap LTV at 65%-80%.
 *
 * @param loanAmount - The total loan (mortgage) amount.
 * @param propertyValue - The appraised or purchase value of the property.
 * @returns LTV as a decimal (e.g., 0.75 for 75%).
 *
 * @example
 * calculateLTV(750000, 1000000) // 0.75
 */
export function calculateLTV(loanAmount: number, propertyValue: number): number {
  if (propertyValue === 0) {
    return 0;
  }
  return loanAmount / propertyValue;
}

/**
 * Calculates the Break-Even Occupancy ratio.
 *
 * Break-Even Occupancy = (Operating Expenses + Debt Service) / Gross Potential Rent
 *
 * This is the minimum occupancy rate at which a property covers all of its
 * operating expenses and debt service. Below this level the property operates
 * at a cash-flow deficit.
 *
 * @param operatingExpenses - Total annual operating expenses (excluding debt service).
 * @param debtService - Total annual debt service (principal + interest).
 * @param grossPotentialRent - The maximum annual rental income at 100% occupancy.
 * @returns Break-even occupancy as a decimal (e.g., 0.82 for 82%).
 *
 * @example
 * calculateBreakEvenOccupancy(60000, 80000, 200000) // 0.70
 */
export function calculateBreakEvenOccupancy(
  operatingExpenses: number,
  debtService: number,
  grossPotentialRent: number
): number {
  if (grossPotentialRent === 0) {
    return 0;
  }
  return (operatingExpenses + debtService) / grossPotentialRent;
}

/**
 * Determines whether a DSCR meets lender requirements.
 *
 * @param dscr - The calculated DSCR value.
 * @param lenderMinimum - The lender's minimum acceptable DSCR (default: 1.25).
 * @returns true if the DSCR meets or exceeds the lender's minimum requirement.
 *
 * @example
 * isDSCRAcceptable(1.30) // true (meets default 1.25 minimum)
 * isDSCRAcceptable(1.10) // false (below default 1.25 minimum)
 * isDSCRAcceptable(1.10, 1.05) // true (meets custom 1.05 minimum)
 */
export function isDSCRAcceptable(dscr: number, lenderMinimum: number = 1.25): boolean {
  if (!isFinite(dscr)) {
    // Infinity (unlevered) is always acceptable
    return dscr > 0;
  }
  return dscr >= lenderMinimum;
}
