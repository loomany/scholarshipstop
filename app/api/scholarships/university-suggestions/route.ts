import { NextResponse } from 'next/server';

import { fetchUniversityAutocompleteSuggestions } from '@/lib/scholarships/universityAutocompleteServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const suggestions = await fetchUniversityAutocompleteSuggestions({
      query: searchParams.get('q') ?? '',
      stateInput: searchParams.get('state'),
      limit: Number.parseInt(searchParams.get('limit') ?? '8', 10)
    });
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load university suggestions.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
