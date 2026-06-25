-- Stage 4F.1 shadow-only: idempotent oauth_client_id column (additive, no destructive DDL).
-- Note: refreshSession fix is primarily GoTrue v2.181+ (Session model matches restored schema).

ALTER TABLE auth.sessions
  ADD COLUMN IF NOT EXISTS oauth_client_id uuid;

CREATE INDEX IF NOT EXISTS sessions_oauth_client_id_idx ON auth.sessions (oauth_client_id);
