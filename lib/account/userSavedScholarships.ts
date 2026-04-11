import type { Database } from '@/types_db';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Telegram `callback_data` max 64 bytes; `gs:` + UUID = 39 chars. */
export const TELEGRAM_GRANT_SAVE_CALLBACK_PREFIX = 'gs:' as const;
export const TELEGRAM_GRANT_SAVED_ACK_PREFIX = 'gx:' as const;

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyScholarshipUuid(s: string): boolean {
  return UUID_V4_RE.test(s.trim());
}

export async function userHasSavedScholarship(
  admin: SupabaseClient<Database>,
  userId: string,
  scholarshipId: string
): Promise<boolean> {
  const { data } = await (admin as any)
    .from('user_saved_scholarships')
    .select('scholarship_id')
    .eq('user_id', userId)
    .eq('scholarship_id', scholarshipId)
    .maybeSingle();
  return data != null;
}

export async function addUserSavedScholarship(
  admin: SupabaseClient<Database>,
  userId: string,
  scholarshipId: string
): Promise<boolean> {
  const { error } = await (admin as any).from('user_saved_scholarships').insert({
    user_id: userId,
    scholarship_id: scholarshipId
  });
  if (error && error.code !== '23505') {
    console.error('[user-saved-scholarships] insert', error.message);
    return false;
  }
  return true;
}
