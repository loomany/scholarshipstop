-- AI Essay Mentor: scholarship context + gated LLM interview (setup messages are hardcoded).

ALTER TABLE public.essay_chats
  ADD COLUMN IF NOT EXISTS scholarship_title text,
  ADD COLUMN IF NOT EXISTS mentor_interview_started boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentor_profile_prompt_sent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.essay_chats.scholarship_title IS
  'Optional grant title when user opened /essay from a scholarship detail link.';
COMMENT ON COLUMN public.essay_chats.mentor_interview_started IS
  'When true, user messages are handled by the LLM interviewer (after hardcoded onboarding).';
COMMENT ON COLUMN public.essay_chats.mentor_profile_prompt_sent IS
  'True after the optional profile snapshot assistant message was appended.';

-- Existing conversations already past the welcome: skip setup on next message.
UPDATE public.essay_chats
SET mentor_interview_started = true
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(messages::jsonb) = 'array' THEN messages::jsonb
      ELSE '[]'::jsonb
    END
  ) AS elem
  WHERE elem->>'role' = 'user'
);
