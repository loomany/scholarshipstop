/**
 * Signed-in saves: `user_saved_scholarships` (Telegram “Saved scholarships”, cross-device).
 * Guests use `savedScholarships.ts` (localStorage) only.
 */

export async function fetchUserSavedScholarshipIds(): Promise<string[] | null> {
  const res = await fetch('/api/account/saved-scholarships', {
    credentials: 'include'
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { scholarshipIds?: string[] };
  return body.scholarshipIds ?? [];
}

export async function postUserSavedScholarship(scholarshipId: string): Promise<boolean> {
  const res = await fetch('/api/account/saved-scholarships', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scholarshipId })
  });
  return res.ok;
}

export async function deleteUserSavedScholarship(scholarshipId: string): Promise<boolean> {
  const res = await fetch(
    `/api/account/saved-scholarships?id=${encodeURIComponent(scholarshipId)}`,
    { method: 'DELETE', credentials: 'include' }
  );
  return res.ok;
}
