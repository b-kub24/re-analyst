import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: deals, error } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deals });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { property_address, purchase_price, units, property_type, deal_data } = body;

    if (!property_address || !purchase_price) {
      return NextResponse.json({ error: 'Property address and purchase price are required' }, { status: 400 });
    }

    // Check deal limits based on subscription tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tierLimits: Record<string, number> = { free: 3, starter: 15, pro: 999, enterprise: 999 };
    const limit = tierLimits[profile?.subscription_tier || 'free'];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth);

    if ((count || 0) >= limit) {
      return NextResponse.json(
        { error: 'Monthly deal limit reached. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        user_id: user.id,
        property_address,
        purchase_price,
        units: units || null,
        property_type: property_type || null,
        status: 'draft',
        deal_data: deal_data || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deal }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
