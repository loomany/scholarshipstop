import type { MoreFiltersJson } from '@/lib/scholarships/scholarshipListApiCodec';
import { moreFiltersFromJson, moreFiltersToJson } from '@/lib/scholarships/scholarshipListApiCodec';
import type { MoreFiltersState } from '@/app/scholarships/moreFilters';

export const SAVED_FILTERS_STORAGE_KEY = 'scholarshiptop_saved_filters_v1';
export const SAVED_FILTER_PRESETS_STORAGE_KEY = 'scholarshiptop_saved_filter_presets_v1';
/** Set after local presets were uploaded to the signed-in account (one-time migration). */
export const SAVED_FILTER_PRESETS_ACCOUNT_MIGRATED_KEY =
  'scholarshiptop_saved_filter_presets_account_migrated_v1';
export const SAVED_FILTER_PRESETS_MAX = 4;

export type SavedFilterPreset = {
  id: string;
  name: string;
  snapshot: MoreFiltersJson;
  createdAt: string;
  updatedAt: string;
};

type SavedFilterPresetsPayload = {
  activePresetId: string | null;
  presets: SavedFilterPreset[];
};

export function readSavedFiltersFromStorage(
  bounds: {
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
  }
): MoreFiltersState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVED_FILTERS_STORAGE_KEY);
    if (!raw?.trim()) return null;
    const parsed = JSON.parse(raw) as MoreFiltersJson;
    return moreFiltersFromJson(parsed, bounds);
  } catch {
    return null;
  }
}

export function writeSavedFiltersToStorage(state: MoreFiltersState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SAVED_FILTERS_STORAGE_KEY,
      JSON.stringify(moreFiltersToJson(state))
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearSavedFiltersFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SAVED_FILTERS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `preset_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 64);
}

function normalizePayload(raw: unknown): SavedFilterPresetsPayload {
  if (!raw || typeof raw !== 'object') {
    return { activePresetId: null, presets: [] };
  }
  const src = raw as { activePresetId?: unknown; presets?: unknown };
  const presetsSrc = Array.isArray(src.presets) ? src.presets : [];
  const presets: SavedFilterPreset[] = presetsSrc
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
    .filter((v): v is SavedFilterPreset => Boolean(v))
    .slice(0, SAVED_FILTER_PRESETS_MAX);
  const activePresetIdRaw =
    typeof src.activePresetId === 'string' && src.activePresetId ? src.activePresetId : null;
  const activePresetId =
    activePresetIdRaw && presets.some((p) => p.id === activePresetIdRaw) ? activePresetIdRaw : null;
  return { activePresetId, presets };
}

export function readSavedFilterPresetsFromStorage(): SavedFilterPresetsPayload {
  if (typeof window === 'undefined') return { activePresetId: null, presets: [] };
  try {
    const raw = window.localStorage.getItem(SAVED_FILTER_PRESETS_STORAGE_KEY);
    if (!raw?.trim()) return { activePresetId: null, presets: [] };
    return normalizePayload(JSON.parse(raw));
  } catch {
    return { activePresetId: null, presets: [] };
  }
}

export function writeSavedFilterPresetsToStorage(payload: SavedFilterPresetsPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = normalizePayload(payload);
    window.localStorage.setItem(
      SAVED_FILTER_PRESETS_STORAGE_KEY,
      JSON.stringify(normalized)
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearSavedFilterPresetsFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SAVED_FILTER_PRESETS_STORAGE_KEY);
    window.localStorage.removeItem(SAVED_FILTER_PRESETS_ACCOUNT_MIGRATED_KEY);
  } catch {
    // ignore
  }
}

export function readSavedFilterPresetsAccountMigratedFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SAVED_FILTER_PRESETS_ACCOUNT_MIGRATED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSavedFilterPresetsAccountMigrated(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVED_FILTER_PRESETS_ACCOUNT_MIGRATED_KEY, '1');
  } catch {
    // ignore
  }
}

export function upsertSavedFilterPresetInStorage(
  name: string,
  state: MoreFiltersState
): SavedFilterPresetsPayload {
  const label = sanitizeName(name);
  if (!label) return readSavedFilterPresetsFromStorage();
  const now = new Date().toISOString();
  const current = readSavedFilterPresetsFromStorage();
  const snapshot = moreFiltersToJson(state);
  const existingIdx = current.presets.findIndex(
    (p) => p.name.toLowerCase() === label.toLowerCase()
  );
  let nextPresets = [...current.presets];
  let activePresetId: string | null = null;
  if (existingIdx >= 0) {
    const existing = nextPresets[existingIdx]!;
    nextPresets[existingIdx] = {
      ...existing,
      name: label,
      snapshot,
      updatedAt: now
    };
    activePresetId = existing.id;
  } else {
    const newPreset: SavedFilterPreset = {
      id: randomId(),
      name: label,
      snapshot,
      createdAt: now,
      updatedAt: now
    };
    nextPresets = [newPreset, ...nextPresets];
    if (nextPresets.length > SAVED_FILTER_PRESETS_MAX) {
      nextPresets = nextPresets.slice(0, SAVED_FILTER_PRESETS_MAX);
    }
    activePresetId = newPreset.id;
  }
  const next = { presets: nextPresets, activePresetId };
  writeSavedFilterPresetsToStorage(next);
  return next;
}
