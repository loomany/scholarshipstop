-- Rename fallback L2: grants without a specific subject are "general / open subject", not "uncategorized".
-- Idempotent: safe if seed already used open_subject.

UPDATE public.categories
SET
  slug = 'open_subject',
  label = 'General / open subject'
WHERE slug = 'uncategorized'
  AND level = 2;
