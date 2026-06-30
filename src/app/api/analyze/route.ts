import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const analysisPrompts: Record<string, string> = {
  screening: `Analyze this real estate deal for initial screening. Evaluate:
- Market fundamentals and location quality
- Price per unit/sqft vs market comps
- Preliminary cap rate assessment
- Red flags or deal-breakers
- Overall go/no-go recommendation with confidence score
Provide structured JSON output.`,

  underwriting: `Perform detailed underwriting analysis:
- Validate rent assumptions against market data
- Assess expense ratios and operating efficiency
- Calculate key metrics: Cap Rate, Cash-on-Cash Return, DSCR
- Evaluate value-add potential and upside scenarios
- Risk-adjusted return assessment
Provide structured JSON output.`,

  pro_forma: `Generate a 10-year pro forma projection:
- Annual revenue with growth assumptions (rent growth, vacancy trends)
- Operating expenses with inflation adjustments
- Net Operating Income (NOI) trajectory
- Debt service schedule
- Before-tax cash flow by year
- Exit valuation at year 5 and year 10
Provide structured JSON with yearly arrays.`,

  debt: `Analyze the debt structure and financing:
- Monthly and annual debt service calculations
- Amortization schedule summary
- Debt Service Coverage Ratio (DSCR) analysis
- Loan-to-Value (LTV) assessment
- Break-even occupancy rate
- Refinancing scenarios and optimal timing
Provide structured JSON output.`,

  risk: `Perform comprehensive risk analysis:
- Sensitivity analysis: vary cap rate, vacancy, rent growth, interest rates
- Scenario modeling: base case, upside, downside
- Key risk factors ranked by probability and impact
- Market risk assessment
- Operational risk factors
- Stress test results
Provide structured JSON output.`,

  comps: `Analyze comparable properties and market positioning:
- Comparable sales analysis with adjustments
- Rent comparables and market rent validation
- Market cap rate benchmarking
- Supply/demand dynamics in the submarket
- Competitive positioning assessment
Provide structured JSON output.`,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deal_id } = await request.json();

    if (!deal_id) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    // Fetch the deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('id', deal_id)
      .eq('user_id', user.id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Update deal status to analyzing
    await supabase.from('deals').update({ status: 'analyzing' }).eq('id', deal_id);

    const dealContext = JSON.stringify(deal.deal_data, null, 2);
    const dealSummary = `Property: ${deal.property_address}\nPurchase Price: $${deal.purchase_price.toLocaleString()}\nUnits: ${deal.units || 'N/A'}\nType: ${deal.property_type || 'N/A'}`;

    // Run all 6 analysis types
    const analysisTypes = Object.keys(analysisPrompts) as Array<keyof typeof analysisPrompts>;
    const results: Record<string, unknown> = {};

    for (const analysisType of analysisTypes) {
      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `You are an expert commercial real estate analyst. Analyze the following deal.

Deal Summary:
${dealSummary}

Deal Data:
${dealContext}

${analysisPrompts[analysisType]}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`,
            },
          ],
        });

        const content = message.content[0];
        let parsed: unknown = {};
        if (content.type === 'text') {
          try {
            parsed = JSON.parse(content.text);
          } catch {
            parsed = { raw_analysis: content.text };
          }
        }

        results[analysisType] = parsed;

        // Save individual analysis
        await supabase.from('analyses').insert({
          deal_id,
          analysis_type: analysisType,
          results: parsed,
        });
      } catch (analysisErr) {
        console.error(`Analysis error (${analysisType}):`, analysisErr);
        results[analysisType] = { error: 'Analysis failed for this type' };
      }
    }

    // Update deal status to complete and store summary metrics in deal_data
    const updatedDealData = {
      ...deal.deal_data,
      cap_rate: (results.underwriting as Record<string, number>)?.cap_rate,
      irr: (results.pro_forma as Record<string, number>)?.irr,
      cash_on_cash: (results.underwriting as Record<string, number>)?.cash_on_cash_return,
      dscr: (results.debt as Record<string, number>)?.dscr,
      noi: (results.underwriting as Record<string, number>)?.noi,
    };

    await supabase
      .from('deals')
      .update({ status: 'complete', deal_data: updatedDealData })
      .eq('id', deal_id);

    return NextResponse.json({ results, deal_id });
  } catch (err) {
    console.error('Analysis error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
