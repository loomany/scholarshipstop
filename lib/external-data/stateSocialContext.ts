import 'server-only';

import { US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';

import { loadStateSocialContextRecords } from './loadStaticEnrichment';
import type { StateSocialContext } from './types';

let byCodeCache: Map<string, StateSocialContext> | null = null;
let byNameCache: Map<string, StateSocialContext> | null = null;

function ensureIndexes(): void {
  if (byCodeCache && byNameCache) return;
  byCodeCache = new Map();
  byNameCache = new Map();

  for (const row of loadStateSocialContextRecords()) {
    const code = row.state_code?.trim().toUpperCase();
    if (code) byCodeCache.set(code, row);
    const name = row.state_name?.trim().toLowerCase();
    if (name) byNameCache.set(name, row);
  }
}

export function getStateSocialContext(
  stateCodeOrName: string | null | undefined
): StateSocialContext | null {
  const raw = stateCodeOrName?.trim();
  if (!raw) return null;

  ensureIndexes();

  const upper = raw.toUpperCase();
  if (upper.length === 2) {
    return byCodeCache!.get(upper) ?? null;
  }

  const codeFromName = US_STATE_NAME_TO_CODE[raw];
  if (codeFromName) return byCodeCache!.get(codeFromName) ?? null;

  return byNameCache!.get(raw.toLowerCase()) ?? null;
}
