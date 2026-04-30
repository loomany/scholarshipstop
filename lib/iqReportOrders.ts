import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { AssessmentResult } from '@/lib/iqAssessmentTypes';

export type IqReportOrderRow = {
  id: string;
  access_token: string;
  email: string;
  assessment_result: AssessmentResult;
  status: 'pending' | 'paid' | 'email_sent';
  lemon_order_id: string | null;
  lemon_checkout_email: string | null;
  raw_payload: unknown;
  paid_at: string | null;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

let adminClient: SupabaseClient | null | undefined;

export function getIqReportAdminClient(): SupabaseClient {
  if (adminClient !== undefined) {
    if (!adminClient) throw new Error('Supabase admin client is not configured.');
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    adminClient = null;
    throw new Error('Supabase admin client is not configured.');
  }

  adminClient = createClient(url, key);
  return adminClient;
}

export function createIqReportAccessToken() {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

export function normalizeIqReportEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidIqReportEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getIqReportUrl(accessToken: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/+$/, '') ||
    'https://scholarshiptop.com';
  return `${base}/iq/report/${encodeURIComponent(accessToken)}`;
}
