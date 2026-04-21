import { NextResponse } from 'next/server';

import type { Json } from '@/types_db';
import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import { createClient } from '@/utils/supabase/server';

type SavedFilterPresetPayload = {
  id: string;
  name: string;
  snapshot: MoreFiltersJson;
  createdAt: string;
  updatedAt: string;
};

type SavedFilterPresetsPayload = {
  activePresetId: string | null;
  presets: SavedFilterPresetPayload[];
};

const MAX_PRESETS = 4;

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 64);
}

function normalizePresetsPayload(raw: unknown): SavedFilterPresetsPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as { activePresetId?: unknown; presets?: unknown };
  const presetsSrc = Array.isArray(src.presets) ? src.presets : [];
  const presets: SavedFilterPresetPayload[] = presetsSrc
    .map((row) => {
      const r = row as Record<string, unknown>;
      const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : randomId();
      const name = sanitizeName(typeof r.name === 'string' ? r.name : '');
      const snapshot = (r.snapshot ?? null) as MoreFiltersJson | null;
      const createdAt =
        typeof r.createdAt === 'string' && r.createdAt ? r.createdAt : new Date().toISOString();
      const updatedAt =
        typeof r.updatedAt === 'string' && r.updatedAt ? r.updatedAt : createdAt;
      if (!name || !snapshot) return null;
      return { id, name, snapshot, createdAt, updatedAt };
    })
    .filter((v): v is SavedFilterPresetPayload => Boolean(v))
    .slice(0, MAX_PRESETS);
  const activePresetId =
    typeof src.activePresetId === 'string' && src.activePresetId ? src.activePresetId : null;
  if (activePresetId && !presets.some((p) => p.id === activePresetId)) {
    return { activePresetId: null, presets };
  }
  return { activePresetId, presets };
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .schema('public')
    .from('profiles')
    .select('saved_filter_presets')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const normalized = normalizePresetsPayload(profile?.saved_filter_presets);
  return NextResponse.json(normalized ?? { activePresetId: null, presets: [] });
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const normalized = normalizePresetsPayload(body);
  if (!normalized) {
    return NextResponse.json({ error: 'Invalid presets payload' }, { status: 400 });
  }

  const { error } = await supabase
    .schema('public')
    .from('profiles')
    .update({ saved_filter_presets: normalized as unknown as Json })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...normalized });
}
