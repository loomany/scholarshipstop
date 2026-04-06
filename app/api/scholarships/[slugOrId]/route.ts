import { NextResponse } from 'next/server';
import { fetchScholarshipBySlugOrId } from '@/lib/scholarships/supabase';

export async function GET(
  _request: Request,
  { params }: { params: { slugOrId: string } }
) {
  const raw = params?.slugOrId;
  if (!raw) {
    return NextResponse.json({ error: 'Missing scholarship parameter' }, { status: 400 });
  }

  try {
    const row = await fetchScholarshipBySlugOrId(decodeURIComponent(raw));
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
