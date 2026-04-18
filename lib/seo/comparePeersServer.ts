import { createPublicClient } from '@/utils/supabase/public';
import type { Database } from '@/types_db';

export type ComparePeerRow = {
  peerSlug: string;
  peerName: string;
  compareSlug: string;
};

export async function fetchComparePeersForInstitution(
  institutionId: string | null | undefined
): Promise<ComparePeerRow[]> {
  if (!institutionId?.trim()) return [];
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_compare_peer_institutions', {
    p_institution_id: institutionId,
    p_limit: 3
  });

  if (error) {
    console.error('[compare peers]', error.message);
    return [];
  }

  const rows =
    (data ?? []) as Database['public']['Functions']['get_compare_peer_institutions']['Returns'];
  return rows
    .map((row) => ({
      peerSlug: row.peer_slug,
      peerName: row.peer_name,
      compareSlug: row.compare_slug
    }))
    .filter((r) => r.peerSlug && r.compareSlug);
}
