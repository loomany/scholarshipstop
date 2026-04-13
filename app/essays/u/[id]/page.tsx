import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import {
  interviewThemesMeetStrongDraftThreshold,
  parseInterviewProgressFromJson
} from '@/lib/essay/interviewDraftProgressGate';
import {
  shouldApplyTrialFeatureQuotas,
  trialQuotaSnapshotFromProfile
} from '@/lib/payments/trialFeatureQuotas';
import type { Json, Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';
import {
  getSubscription,
  getUserDetails,
  getUserSubscriptionStatus
} from '@/utils/supabase/queries';

import EssayResultClient from './EssayResultClient';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export type EssayVersionRow = Pick<
  Tables<'essay_results'>,
  'id' | 'content' | 'grinder_notes' | 'created_at' | 'version'
>;

export const dynamic = 'force-dynamic';

const ESSAY_RESULT_PAGE_DESC =
  'Edit your scholarship essay, run an AI authenticity check, revise by snippet, and save versions — your private workspace on ScholarshipTop.';

export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  const title = 'Your Generated Essay | ScholarshipTop';
  return {
    title,
    description: ESSAY_RESULT_PAGE_DESC,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: ESSAY_RESULT_PAGE_DESC,
      type: 'website'
    },
    twitter: {
      card: 'summary',
      title,
      description: ESSAY_RESULT_PAGE_DESC
    }
  };
}

export default async function EssayResultPage({
  params,
  searchParams
}: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }

  const sp = searchParams ? await searchParams : {};
  const mentorPreviewFlag =
    sp.mentorPreview === '1' ||
    (Array.isArray(sp.mentorPreview) && sp.mentorPreview[0] === '1');

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/signin');
  }

  type ResultRow = EssayVersionRow & {
    response_id: string | null;
    essay_chat_id: string | null;
    draft_quality_tier?: string | null;
  };

  let row: ResultRow | null = null;
  let error: { message: string } | null = null;

  const fullSelect =
    'id, content, grinder_notes, created_at, version, response_id, essay_chat_id, draft_quality_tier';
  const legacySelect =
    'id, content, grinder_notes, created_at, version, response_id, essay_chat_id';

  const first = (await (supabase as any)
    .from('essay_results')
    .select(fullSelect)
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()) as {
    data: ResultRow | null;
    error: { message: string } | null;
  };

  if (
    first.error?.message &&
    /draft_quality_tier|schema cache/i.test(first.error.message)
  ) {
    const second = (await (supabase as any)
      .from('essay_results')
      .select(legacySelect)
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()) as {
      data: ResultRow | null;
      error: { message: string } | null;
    };
    row = second.data;
    error = second.error;
  } else {
    row = first.data;
    error = first.error;
  }

  if (error || !row) {
    notFound();
  }

  let vQuery = (supabase as any)
    .from('essay_results')
    .select('id, content, grinder_notes, created_at, version')
    .eq('user_id', user.id)
    .order('version', { ascending: true });

  if (row.response_id) {
    vQuery = vQuery.eq('response_id', row.response_id);
  } else if (row.essay_chat_id) {
    vQuery = vQuery.eq('essay_chat_id', row.essay_chat_id);
  } else {
    vQuery = vQuery.eq('id', row.id);
  }

  const { data: versionRows, error: vErr } = (await vQuery) as {
    data: EssayVersionRow[] | null;
    error: { message: string } | null;
  };

  const essayVersions: EssayVersionRow[] =
    !vErr && Array.isArray(versionRows) && versionRows.length > 0
      ? versionRows
      : [
          {
            id: row.id,
            content: row.content,
            grinder_notes: row.grinder_notes,
            created_at: row.created_at,
            version: row.version
          }
        ];

  const currentEssay: EssayVersionRow = {
    id: row.id,
    content: row.content,
    grinder_notes: row.grinder_notes,
    created_at: row.created_at,
    version: row.version
  };

  const essayChainKey = row.response_id ?? row.essay_chat_id ?? row.id;

  const draftFromDb =
    row.draft_quality_tier === 'preview' ||
    row.draft_quality_tier === 'standard'
      ? row.draft_quality_tier
      : null;
  /** Until the column exists in all envs — also driven by ?mentorPreview=1 after preview generation. */
  const draftQualityTier =
    draftFromDb ??
    (mentorPreviewFlag && row.essay_chat_id ? 'preview' : null);

  /**
   * `draft_quality_tier` is fixed at generation time. If the user later fills the mentor chat
   * past the strong threshold, we must not keep showing the “Early draft” nag as if topics were
   * still below 85%.
   */
  let mentorChatMeetsStrongDraft = false;
  if (row.essay_chat_id) {
    const { data: chatProgressRow } = (await (supabase as any)
      .from('essay_chats')
      .select('progress')
      .eq('id', row.essay_chat_id)
      .eq('user_id', user.id)
      .maybeSingle()) as {
      data: { progress: unknown } | null;
    };
    const raw = chatProgressRow?.progress;
    if (raw != null) {
      mentorChatMeetsStrongDraft = interviewThemesMeetStrongDraftThreshold(
        parseInterviewProgressFromJson(raw as Json)
      );
    }
  }

  const hasSubscription = await getUserSubscriptionStatus(supabase, user.id);

  const [profile, subscription] = await Promise.all([
    getUserDetails(supabase, user.id),
    getSubscription(user.id)
  ]);
  const trialQuotasApply = shouldApplyTrialFeatureQuotas(profile, subscription);
  const trialFeatureQuota = trialQuotaSnapshotFromProfile(profile, trialQuotasApply);

  return (
    <EssayResultClient
      currentEssay={currentEssay}
      essayVersions={essayVersions}
      essayChainKey={essayChainKey}
      draftQualityTier={draftQualityTier}
      mentorChatMeetsStrongDraft={mentorChatMeetsStrongDraft}
      essayChatId={row.essay_chat_id}
      hasSubscription={hasSubscription}
      trialFeatureQuota={trialFeatureQuota}
    />
  );
}
