# 01. Backup prerequisite

Issue IDs covered: `OPS-001`, prerequisite for `DBSEC-001`  
Production touched: **NO**  
Secrets exposed: **NO**

## Что было сломано

Production cron запускал `pg_dump` с app `DATABASE_URL`. App role не читала все объекты `public`/`auth`, поэтому четыре daily dump завершились permission denied и оставили 0-byte artifacts.

## Как исправлено локально

- `pg_dump` по умолчанию запускается от локального OS-пользователя `postgres` через peer auth; app `DATABASE_URL` больше не используется как fallback.
- Dump пишется в скрытый временный файл с `umask 077`.
- Проверяются exit code, ненулевой размер и `pg_restore --list`.
- Checksum и dump публикуются atomic rename только после validation.
- Failure trap удаляет временные файлы и не обновляет `latest.dump`.
- Off-host encrypted copy оставлена отдельным GO-gated шагом.

## Files changed

- `ops/vps/scripts/backup-postgres-daily.sh`
- `ops/vps/scripts/tests/backup-postgres-daily.test.sh`
- `reports/full-vps-audit-fixes/01_backup_prerequisite.md`

## Commands run

- Локальный shell test с fake `pg_dump`/`pg_restore` для success, command failure, empty dump и invalid dump.
- Синтаксическая проверка `bash -n`.

## Tests passed/failed

- `bash -n` для script и test: **PASS**.
- Fake-tool integration: success, pg_dump failure, empty dump, invalid dump: **PASS**.
- Production dump: **NOT RUN (GO required)**.

## Live acceptance still required after GO

- Сохранить current production script и cron как timestamped snapshot.
- Установить patch, вручную запустить один dump.
- Доказать `size_bytes > 0`, `pg_restore -l` PASS и отсутствие permission denied.
- Проверить checksum и `latest` links.
- Только после этого разрешать применение `DBSEC-001`.

## Rollback plan

До установки: сохранить script и `/etc/cron.d/scholarshiptop-postgres`. При ошибке вернуть оба snapshot, выполнить `systemctl daemon-reload` только если менялись units, затем подтвердить предыдущую cron line. Не считать старые 0-byte files валидным rollback backup.

## Remaining risks

- Валидный новый production dump и restore-check пока **не доказаны**, потому что это изменяет production filesystem и требует GO.
- Off-host encrypted backup и alerting еще не включены.
