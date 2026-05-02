import { NextResponse } from 'next/server';

import type { Database } from '@/types_db';
import { createPublicClient } from '@/utils/supabase/public';

type Row = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'id'
  | 'institution_id'
  | 'award_amount_max'
  | 'award_amount_numeric_sort'
  | 'citizenship_statuses'
  | 'gpa_requirement_min'
  | 'state_codes'
  | 'location_scope'
>;

type InstitutionLite = Pick<
  Database['public']['Tables']['institutions']['Row'],
  'id' | 'state' | 'name'
>;

type BucketSummary = {
  institutionMaxUsd: number | null;
  stateMaxUsd: number | null;
  nationalMaxUsd: number | null;
  totalPotentialUsd: number | null;
  institutionMatchCount: number;
  stateMatchCount: number;
  nationalMatchCount: number;
  totalMatchCount: number;
};

type MatchResponse = {
  institutionA: BucketSummary;
  institutionB: BucketSummary;
};

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function citizenshipAllows(
  row: Row,
  countryCode: string | null | undefined
): boolean {
  const raw = countryCode?.trim();
  if (!raw) return true;
  const c = row.citizenship_statuses;
  if (c == null) return true;
  if (Array.isArray(c) && c.length === 0) return true;
  if (!Array.isArray(c)) return true;
  const needle = raw.toLowerCase();
  return c.some(
    (x) => typeof x === 'string' && x.toLowerCase().includes(needle)
  );
}

function gpaAllows(row: Row, gpa: number | null): boolean {
  if (gpa == null) return true;
  const min = row.gpa_requirement_min;
  if (min == null || Number.isNaN(Number(min))) return true;
  return gpa >= Number(min);
}

function awardUsd(row: Row): number | null {
  const a = row.award_amount_max;
  const b = row.award_amount_numeric_sort;
  const n =
    a != null && !Number.isNaN(Number(a)) && Number(a) > 0
      ? Number(a)
      : b != null && !Number.isNaN(Number(b)) && Number(b) > 0
        ? Number(b)
        : null;
  return n;
}

function maxAwardUsd(rows: Row[]): { max: number | null; count: number } {
  let max: number | null = null;
  for (const r of rows) {
    const v = awardUsd(r);
    if (v != null && (max == null || v > max)) max = v;
  }
  return { max, count: rows.length };
}

function rowHasStateCode(row: Row, stateCode: string | null): boolean {
  if (!stateCode) return false;
  const needle = stateCode.trim().toUpperCase();
  return jsonStringArray(row.state_codes).some((code) => code.toUpperCase() === needle);
}

function rowIsNational(row: Row): boolean {
  const scope = row.location_scope?.trim().toLowerCase();
  if (scope === 'national' || scope === 'nationwide') return true;
  return jsonStringArray(row.state_codes).length === 0;
}

function sumNullable(values: Array<number | null>): number | null {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (nums.length === 0) return null;
  return nums.reduce((acc, value) => acc + value, 0);
}

function summarizeInstitutionBuckets(args: {
  rows: Row[];
  institutionId: string;
  stateCode: string | null;
  countryCode: string | null;
  gpa: number | null;
}): BucketSummary {
  const { rows, institutionId, stateCode, countryCode, gpa } = args;

  const institutionRows: Row[] = [];
  const stateRows: Row[] = [];
  const nationalRows: Row[] = [];

  for (const row of rows) {
    if (!citizenshipAllows(row, countryCode) || !gpaAllows(row, gpa)) continue;

    if (row.institution_id === institutionId) {
      institutionRows.push(row);
      continue;
    }

    if (rowHasStateCode(row, stateCode)) {
      stateRows.push(row);
      continue;
    }

    if (rowIsNational(row)) {
      nationalRows.push(row);
    }
  }

  const institution = maxAwardUsd(institutionRows);
  const state = maxAwardUsd(stateRows);
  const national = maxAwardUsd(nationalRows);

  return {
    institutionMaxUsd: institution.max,
    stateMaxUsd: state.max,
    nationalMaxUsd: national.max,
    totalPotentialUsd: sumNullable([institution.max, state.max, national.max]),
    institutionMatchCount: institution.count,
    stateMatchCount: state.count,
    nationalMatchCount: national.count,
    totalMatchCount: institution.count + state.count + national.count
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const instAId = typeof o.instAId === 'string' ? o.instAId.trim() : '';
  const instBId = typeof o.instBId === 'string' ? o.instBId.trim() : '';
  const countryCode =
    typeof o.countryCode === 'string' ? o.countryCode.trim() : null;
  const gpaRaw = o.gpa;
  const gpa =
    typeof gpaRaw === 'number' && Number.isFinite(gpaRaw)
      ? gpaRaw
      : typeof gpaRaw === 'string' && gpaRaw.trim()
        ? parseFloat(gpaRaw)
        : null;

  if (!instAId || !instBId || instAId === instBId) {
    return NextResponse.json({ error: 'Invalid institutions' }, { status: 400 });
  }

  const supabase = createPublicClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 503 }
    );
  }

  const [{ data: institutions, error: instError }, { data, error }] = await Promise.all([
    supabase
      .from('institutions')
      .select('id, state, name')
      .in('id', [instAId, instBId]),
    (supabase as any)
      .from('scholarships_safe_listing')
      .select(
        'id, institution_id, award_amount_max, award_amount_numeric_sort, citizenship_statuses, gpa_requirement_min, state_codes, location_scope'
      )
      .eq('is_active', true)
  ]);

  if (instError) {
    return NextResponse.json({ error: instError.message }, { status: 500 });
  }

  const instRows = (institutions ?? []) as InstitutionLite[];
  const instById = new Map(instRows.map((row) => [row.id, row]));
  const instA = instById.get(instAId);
  const instB = instById.get(instBId);

  if (!instA || !instB) {
    return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];

  const institutionA = summarizeInstitutionBuckets({
    rows,
    institutionId: instAId,
    stateCode: instA.state?.trim().toUpperCase() || null,
    countryCode,
    gpa
  });

  const institutionB = summarizeInstitutionBuckets({
    rows,
    institutionId: instBId,
    stateCode: instB.state?.trim().toUpperCase() || null,
    countryCode,
    gpa
  });

  return NextResponse.json({
    institutionA,
    institutionB
  } satisfies MatchResponse);
}
