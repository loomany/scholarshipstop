const STORAGE_SCOPE_USER_KEY = 'scholarshiptop_storage_scope_user_v1';

function isBrowser() {
  return typeof window !== 'undefined';
}

function normalizeUserId(userId: string | null | undefined): string | null {
  const trimmed = userId?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export function setScholarshipStorageUserScope(
  userId: string | null | undefined
): void {
  if (!isBrowser()) return;
  const normalized = normalizeUserId(userId);
  try {
    if (normalized) {
      window.localStorage.setItem(STORAGE_SCOPE_USER_KEY, normalized);
    } else {
      window.localStorage.removeItem(STORAGE_SCOPE_USER_KEY);
    }
  } catch {
    // ignore private mode / quota
  }
}

export function getScholarshipStorageUserScope(): string | null {
  if (!isBrowser()) return null;
  try {
    return normalizeUserId(window.localStorage.getItem(STORAGE_SCOPE_USER_KEY));
  } catch {
    return null;
  }
}

export function getScopedScholarshipStorageKey(baseKey: string): string {
  const userId = getScholarshipStorageUserScope();
  return userId ? `${baseKey}::user:${userId}` : `${baseKey}::guest`;
}

export function storageKeyMatchesBase(
  key: string | null,
  baseKey: string
): boolean {
  if (key == null) return true;
  return key === baseKey || key === getScopedScholarshipStorageKey(baseKey) || key.startsWith(`${baseKey}::`);
}

