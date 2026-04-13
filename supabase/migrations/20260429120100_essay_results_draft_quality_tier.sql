-- Ранний черновик интервью (шкалы 50–84%) vs полный пайплайн (все темы ≥85%).
ALTER TABLE public.essay_results
ADD COLUMN IF NOT EXISTS draft_quality_tier text;

ALTER TABLE public.essay_results DROP CONSTRAINT IF EXISTS essay_results_draft_quality_tier_check;

ALTER TABLE public.essay_results
ADD CONSTRAINT essay_results_draft_quality_tier_check
CHECK (
  draft_quality_tier IS NULL
  OR draft_quality_tier IN ('preview', 'standard')
);

COMMENT ON COLUMN public.essay_results.draft_quality_tier IS
  'preview = ранний черновик (не все темы ≥85%); standard = полная генерация; NULL = старые строки';
