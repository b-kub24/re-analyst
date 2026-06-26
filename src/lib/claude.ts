import Anthropic from '@anthropic-ai/sdk';

// ---------------------------------------------------------------------------
// Client initialization
// ---------------------------------------------------------------------------

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('Missing required environment variable: ANTHROPIC_API_KEY');
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = 'claude-opus-4-5';
const MAX_TOKENS = 4096;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DealData {
  id: string;
  name: string;
  address?: string | null;
  property_type?: string | null;
  status: string;
  inputs: Record<string, unknown>;
  results?: Record<string, unknown> | null;
}

export interface AnalysisResult {
  content: string;
  tokens_used: number;
  model: string;
}

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

const PROMPT_TEMPLATES: Record<string, (deal: DealData) => string> = {
  investment_summary: (deal: DealData) => `
You are a senior real estate investment analyst with 20+ years of experience in commercial and residential property analysis. 

Analyze the following real estate deal and produce a comprehensive investment thesis report.

DEAL DATA:
${JSON.stringify(deal, null, 2)}

Your analysis must include:

1. **Executive Summary** (2-3 sentences capturing the investment opportunity)

2. **Financial Metrics Evaluation**
   - IRR: ${(deal.results as Record<string, unknown>)?.irr ?? 'calculate from inputs'} â Is this acceptable for the risk profile?
   - Cash-on-Cash Return: ${(deal.results as Record<string, unknown>)?.coc_return ?? 'calculate from inputs'} â How does it compare to typical market benchmarks (5-8% for stabilized assets)?
   - DSCR: ${(deal.results as Record<string, unknown>)?.dscr ?? 'calculate from inputs'} â Does this meet typical lender requirements of 1.25x?
   - Equity Multiple: ${(deal.results as Record<string, unknown>)?.equity_multiple ?? 'calculate from inputs'} â Is this appropriate for the hold period?
   - Net Operating Income (NOI): ${(deal.inputs as Record<string, unknown>)?.noi ?? 'N/A'}
   - Asking Price: ${(deal.inputs as Record<string, unknown>)?.asking_price ?? 'N/A'}

3. **Market Positioning Assessment**
   - Property type and submarket dynamics
   - Competitive supply and demand factors
   - Location quality assessment

4. **Investment Recommendation**
   - Clear BUY / HOLD / PASS recommendation
   - Top 5 reasons to invest (pros)
   - Top 5 risks or concerns (cons)
   - Suggested offer price range (if applicable)

5. **Key Assumptions to Validate**
   - List 3-5 critical assumptions that must be confirmed through due diligence

Format your response in clear sections with headers. Be specific and quantitative wherever possible.
`.trim(),

  risk_assessment: (deal: DealData) => `
You are a real estate risk analyst specializing in investment property underwriting. Your role is to provide an objective, thorough risk assessment.

DEAL DATA:
${JSON.stringify(deal, null, 2)}

Perform a comprehensive risk assessment across the following categories. For each risk, provide:
- Risk description
- Likelihood (Low / Medium / High)
- Impact (Low / Medium / High)
- Specific mitigation strategy

**RISK CATEGORIES TO ANALYZE:**

1. **Market Risk** (vacancy trends, rent growth assumptions, economic sensitivity)
2. **Financial Risk** (leverage, interest rate sensitivity, debt coverage cushion)
3. **Operational Risk** (management quality, deferred maintenance, CapEx requirements)
4. **Regulatory Risk** (zoning, rent control, environmental, building code compliance)
5. **Execution Risk** (construction timeline risk if value-add, permitting, contractor risk)

**OUTPUT REQUIREMENTS:**
- Overall Risk Score: A single number from 0-100 (0 = no risk, 100 = maximum risk). Be calibrated: a stabilized, low-leverage multifamily in a strong market might score 25-35; a ground-up development in a secondary market might score 65-75.
- Top 5 Most Critical Risks with specific mitigation strategies
- Risk-adjusted return commentary: Given these risks, is the projected return adequate compensation?

Format the output with clear sections and a summary risk score at the top.
`.trim(),

  market_comparison: (deal: DealData) => `
You are a real estate market analyst with deep expertise in property valuation and market intelligence.

DEAL DATA:
${JSON.stringify(deal, null, 2)}

Provide a detailed market comparison and positioning analysis:

1. **Cap Rate Analysis**
   - Current asking cap rate: ${(deal.inputs as Record<string, unknown>)?.cap_rate ?? 'N/A'}
   - How does this compare to market cap rates for similar assets in this property type?
   - Is the property priced at a premium, at market, or at a discount? Why?

2. **Rent Level Assessment**
   - Current rents vs. estimated market rents for the area and property type
   - Rent growth trajectory (is rent growth assumed in the model achievable?)
   - Occupancy assumption reasonableness

3. **Comparable Sales Analysis**
   - What would comparable properties (same type, similar vintage, similar market) trade at?
   - Price per unit / price per square foot benchmarking
   - Price-to-NOI multiple comparison

4. **Competitive Positioning**
   - Strengths of this property vs. competing assets
   - Weaknesses relative to market competition
   - Any competitive advantages (location, amenities, tenant quality, lease structure)

5. **Market Outlook**
   - Short-term (1-2 year) and long-term (5-10 year) market outlook for this property type/location
   - Macro factors that could affect performance

Provide a clear conclusion: Is this deal attractively priced vs. the market, and why?
`.trim(),

  value_add_analysis: (deal: DealData) => `
You are a value-add real estate investment specialist with expertise in renovation-driven returns.

DEAL DATA:
${JSON.stringify(deal, null, 2)}

Analyze the value-add opportunity in this deal:

1. **Renovation Budget Assessment**
   - Renovation budget: ${(deal.inputs as Record<string, unknown>)?.renovation_budget ?? 'N/A'}
   - Is the budget adequate for the planned scope? What is the risk of cost overruns?
   - Cost per unit / per square foot reasonableness

2. **Post-Renovation Value Projection**
   - Projected rent increases after renovation: ${(deal.inputs as Record<string, unknown>)?.post_reno_rent ?? 'N/A'}
   - New stabilized NOI post-renovation
   - Post-renovation value at market cap rate
   - Return on investment (additional value created / renovation cost)

3. **Timeline Analysis**
   - Renovation timeline: ${(deal.inputs as Record<string, unknown>)?.renovation_months ?? 'N/A'} months
   - Lease-up period to stabilization
   - Total time from acquisition to stabilized cash flow
   - Carrying cost during renovation period

4. **Value Creation Waterfall**
   - Forced appreciation from renovation
   - Organic market appreciation
   - Total projected value creation
   - Profit margin on the value-add play

5. **Recommendation**
   - Is the value-add spread (reward) worth the execution risk?
   - What is the minimum rent increase needed to justify the renovation cost?
   - GO / NO-GO recommendation with rationale

Provide specific numbers and a clear recommendation.
`.trim(),

  exit_strategy: (deal: DealData) => `
You are a real estate portfolio strategist with expertise in investment exit planning and capital markets.

DEAL DATA:
${JSON.stringify(deal, null, 2)}

Provide a comprehensive exit strategy analysis:

1. **Hold Period Analysis**
   - Recommended hold period: ${(deal.inputs as Record<string, unknown>)?.hold_years ?? 'N/A'} years
   - Optimal hold period based on tax efficiency, market cycle, and return optimization
   - Year-by-year cash flow and equity build trajectory

2. **Exit Cap Rate Sensitivity**
   - Assumed exit cap rate: ${(deal.inputs as Record<string, unknown>)?.exit_cap_rate ?? 'N/A'}
   - Projected sale price at assumed exit cap rate
   - Sensitivity: What happens to returns if exit cap rate is 50bps / 100bps higher than assumed?
   - How does this affect the equity multiple and IRR?

3. **Exit Options Analysis**
   Evaluate each exit path:
   - **Traditional Sale**: Timeline, likely buyer pool, market liquidity
   - **1031 Exchange**: Tax deferral benefits, replacement property considerations
   - **Refinance & Hold**: Cash-out refi to return equity while maintaining ownership
   - **Sale-Leaseback** (if applicable): Monetizing the real estate while retaining operations

4. **Optimal Exit Timing**
   - Market cycle considerations (when to sell)
   - Interest rate environment impact on buyer pool and cap rates
   - Tax considerations (depreciation recapture, capital gains timing)

5. **Exit Strategy Recommendation**
   - Recommended primary exit strategy
   - Trigger events that would indicate time to sell (cap rate compression, rent plateau, market cycle peak)
   - Projected net proceeds after debt payoff and transaction costs
   - Net IRR and equity multiple at recommended exit

Provide clear, actionable recommendations with specific numbers.
`.trim(),

  sensitivity_analysis: (deal: DealData) => `
You are a quantitative real estate analyst specializing in financial modeling and scenario analysis.

DEAL DATA:
${JSON.stringify(deal, null, 2)}

Generate a comprehensive sensitivity analysis for this investment:

1. **IRR Sensitivity Matrix**
   Create a 6x6 matrix showing IRR under combinations of:
   - Exit Cap Rates: 4.0%, 4.5%, 5.0%, 5.5%, 6.0%, 7.0%
   - Annual Rent Growth Rates: 0%, 1%, 2%, 3%, 4%, 5%
   
   Format this as a clear table. Highlight:
   - The base case cell (current assumptions)
   - Cells where IRR meets the minimum threshold (typically 12-15%)
   - Cells where IRR falls below acceptable levels

2. **Cash-on-Cash Return Sensitivity**
   Show how CoC return varies with:
   - Vacancy rate: 3%, 5%, 8%, 10%, 15%
   - Interest rate: current rate Â±0.5%, Â±1.0%, Â±1.5%

3. **Break-Even Analysis**
   - Minimum rent growth needed to achieve target IRR
   - Maximum vacancy rate the deal can sustain before going cash-flow negative
   - Maximum interest rate increase before DSCR falls below 1.20x

4. **Scenario Analysis**
   Three scenarios with full return projections:
   - **Bear Case**: 25th percentile outcomes (higher vacancy, lower rent growth, higher cap rates)
   - **Base Case**: Current underwriting assumptions
   - **Bull Case**: 75th percentile outcomes (tight vacancy, strong rent growth, cap rate compression)
   
   For each scenario provide: IRR, CoC Return, Equity Multiple, and Exit Value.

5. **Key Risk Thresholds**
   - At what rent decline does the deal break even?
   - What vacancy rate makes the deal cash-flow negative?
   - What cap rate expansion makes the deal a loss at exit?

Present all data in clearly formatted tables. Include commentary on which variables have the most impact on returns.
`.trim(),
};

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

/**
 * Runs a Claude AI analysis on a real estate deal using one of six predefined
 * analysis types.
 *
 * @param dealData - The deal object including inputs and any existing results.
 * @param analysisType - One of: investment_summary, risk_assessment, market_comparison,
 *                       value_add_analysis, exit_strategy, sensitivity_analysis
 * @returns The analysis content, token usage, and model name.
 */
export async function analyze(
  dealData: DealData,
  analysisType: string
): Promise<AnalysisResult> {
  const promptBuilder = PROMPT_TEMPLATES[analysisType];

  if (!promptBuilder) {
    throw new Error(
      `Unknown analysis type: "${analysisType}". Valid types are: ${Object.keys(PROMPT_TEMPLATES).join(', ')}`
    );
  }

  const prompt = promptBuilder(dealData);

  const message = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    system:
      'You are a professional real estate investment analyst. Provide detailed, quantitative, actionable analysis. Always use specific numbers from the deal data provided. Format responses clearly with headers and structured sections. Be direct and opinionated â investors need clear recommendations, not vague commentary.',
  });

  const contentBlock = message.content[0];
  const content = contentBlock.type === 'text' ? contentBlock.text : '';
  const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

  return {
    content,
    tokens_used: tokensUsed,
    model: message.model,
  };
}
