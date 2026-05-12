/**
 * Detects OpenAI **account billing / plan quota** failures (not TPM/RPM throttling).
 * All such responses are currently HTTP 429 in the official Node SDK as {@link RateLimitError}.
 */
import { RateLimitError } from 'openai';

export const OPENAI_QUOTA_EXCEEDED_LOG_MARK = 'OPENAI_QUOTA_EXCEEDED';

function billingQuotaHeuristicMessage(message: string, nestedMessage: string): boolean {
  const m = `${message} ${nestedMessage}`.toLowerCase();
  if (m.includes('insufficient_quota')) return true;
  if (m.includes('exceeded your current quota')) return true;
  if (m.includes('check your plan and billing')) return true;
  if (m.includes('billing') && m.includes('quota')) return true;
  return false;
}

export function isOpenAiQuotaBilling429Error(error: unknown): boolean {
  if (!(error instanceof RateLimitError)) return false;
  if (error.status !== 429) return false;

  const code = (error.code || '').toString().toLowerCase();
  if (code === 'insufficient_quota') return true;

  const nested = error.error as { code?: string; message?: string } | undefined;
  const nestedCode = (nested?.code || '').toString().toLowerCase();
  if (nestedCode === 'insufficient_quota') return true;

  const msg = error.message || '';
  const nestedMsg =
    typeof nested?.message === 'string' ? nested.message : JSON.stringify(nested?.message ?? '');
  if (billingQuotaHeuristicMessage(msg, nestedMsg)) return true;

  return false;
}
