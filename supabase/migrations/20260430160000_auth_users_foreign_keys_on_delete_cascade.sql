-- -----------------------------------------------------------------------------
-- Удаление пользователя из auth.users (в т.ч. через Auth Dashboard) должно
-- каскадно убирать связанные строки в public.* без ошибок foreign key.
--
-- Пересоздаёт все внешние ключи на auth.users(id), у которых ещё нет
-- ON DELETE CASCADE (NO ACTION, RESTRICT, SET NULL, SET DEFAULT).
-- Уже настроенные CASCADE не трогаются.
--
-- Охватывает типичные таблицы проекта: profiles, users, customers, subscriptions,
-- essay_chats, questionnaire_responses, essay_results, user_saved_scholarships,
-- grant_notification_deliveries, telegram_* и любые будущие FK на auth.users.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  rec record;
  src_cols text;
  ref_cols text;
  cmd text;
BEGIN
  FOR rec IN
    SELECT
      c.conname,
      n.nspname AS src_schema,
      t.relname AS src_table,
      c.conrelid,
      c.confrelid,
      c.conkey,
      c.confkey,
      c.convalidated,
      c.condeferrable,
      c.condeferred
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_class ft ON ft.oid = c.confrelid
    JOIN pg_namespace fn ON fn.oid = ft.relnamespace
    WHERE c.contype = 'f'
      AND fn.nspname = 'auth'
      AND ft.relname = 'users'
      -- 'c' = CASCADE in pg_constraint.confdeltype
      AND c.confdeltype IS DISTINCT FROM 'c'
  LOOP
    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord)
    INTO src_cols
    FROM unnest(rec.conkey) WITH ORDINALITY AS u(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = rec.conrelid
     AND a.attnum = u.attnum
     AND NOT a.attisdropped;

    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY u.ord)
    INTO ref_cols
    FROM unnest(rec.confkey) WITH ORDINALITY AS u(attnum, ord)
    JOIN pg_attribute a
      ON a.attrelid = rec.confrelid
     AND a.attnum = u.attnum
     AND NOT a.attisdropped;

    IF src_cols IS NULL OR ref_cols IS NULL THEN
      RAISE EXCEPTION 'Could not resolve columns for constraint %', rec.conname;
    END IF;

    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      rec.src_schema, rec.src_table, rec.conname
    );

    cmd := format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %I.%I (%s) ON DELETE CASCADE',
      rec.src_schema,
      rec.src_table,
      rec.conname,
      src_cols,
      'auth',
      'users',
      ref_cols
    );

    IF rec.condeferrable THEN
      IF rec.condeferred THEN
        cmd := cmd || ' DEFERRABLE INITIALLY DEFERRED';
      ELSE
        cmd := cmd || ' DEFERRABLE INITIALLY IMMEDIATE';
      END IF;
    END IF;

    IF NOT rec.convalidated THEN
      cmd := cmd || ' NOT VALID';
    END IF;

    EXECUTE cmd;

    IF NOT rec.convalidated THEN
      EXECUTE format(
        'ALTER TABLE %I.%I VALIDATE CONSTRAINT %I',
        rec.src_schema, rec.src_table, rec.conname
      );
    END IF;

    RAISE NOTICE 'FK % on %.%: ON DELETE CASCADE',
      rec.conname, rec.src_schema, rec.src_table;
  END LOOP;
END $$;
