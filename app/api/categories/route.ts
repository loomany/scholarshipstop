import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Active L2 subject categories for browse UI (includes `open_subject` / General).
 * Parent listing filters will use these slugs after `scholarship_categories` is wired.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id,slug,label,level,sort_order,parent_id')
      .eq('is_active', true)
      .eq('level', 2)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message, categories: [] },
        { status: 502 }
      );
    }

    return NextResponse.json({
      categories: data ?? []
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: message, categories: [] },
      { status: 500 }
    );
  }
}
