/**
 * Structured logs for registration → verify email → admin Telegram.
 * Search server logs for `[reg-pipeline]`.
 */

export type RegistrationPipelineStage =
  | 'UserRegistered'
  | 'EmailSent'
  | 'EmailConfirmed'
  | 'TelegramNotificationSent';

export function logRegistrationPipeline(
  stage: RegistrationPipelineStage,
  detail: Record<string, unknown>
): void {
  console.info('[reg-pipeline]', stage, detail);
}
