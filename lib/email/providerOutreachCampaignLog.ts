import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';

import { normalizeMarketingEmail } from '@/lib/email/normalizeMarketingEmail';

export const DEFAULT_PROVIDER_OUTREACH_CAMPAIGN_KEY =
  'provider-partnership-spring-2026';

export function resolveProviderOutreachCampaignKey(): string {
  const raw = process.env.PROVIDER_OUTREACH_CAMPAIGN_KEY?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_PROVIDER_OUTREACH_CAMPAIGN_KEY;
}

export function createProviderOutreachLogClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * True if this email was already sent for this campaign (sequential re-runs safe).
 */
export async function providerOutreachLogExists(
  supabase: SupabaseClient<Database>,
  email: string,
  campaignKey: string
): Promise<{ ok: true; exists: boolean } | { ok: false; message: string }> {
  const norm = normalizeMarketingEmail(email);
  const { data, error } = await supabase
    .from('provider_outreach_log')
    .select('id')
    .eq('email', norm)
    .eq('campaign_key', campaignKey)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, exists: Boolean(data?.id) };
}

/**
 * Call after Resend HTTP 200. Unique (email, campaign_key) makes parallel double-insert safe.
 */
export async function providerOutreachLogInsertSent(
  supabase: SupabaseClient<Database>,
  email: string,
  campaignKey: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const norm = normalizeMarketingEmail(email);
  const { error } = await supabase.from('provider_outreach_log').insert({
    email: norm,
    campaign_key: campaignKey
  });

  if (!error) return { ok: true };
  if (error.code === '23505') return { ok: true };
  return { ok: false, message: error.message };
}
