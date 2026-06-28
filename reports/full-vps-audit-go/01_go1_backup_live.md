# Production GO-1 Backup Live Verification

Date: 2026-06-28
Operator: Codex over `ubuntu` SSH with passwordless `sudo`
Branch: `fix/full-vps-audit-p0-p1`
Commit: `338110a`
Production touched: **BACKUP SCRIPT ONLY**
Deploy touched: **NO**
DB migrations applied: **NO**
Env changed: **NO**
Lemon changed: **NO**
DNS/firewall/Nginx changed: **NO**
Secrets exposed: **NO**

## Scope

Only the PostgreSQL backup script, its snapshots, one failed validation attempt and one successful manual backup were touched. No application deploy, database migration, production user flow or payment operation was performed.

## Pre-flight

- Production host: `40559`
- Production time zone observed: UTC
- PostgreSQL service: active, PostgreSQL 17.10
- Peer-auth probe: `postgres` OS user connected to `scholarshiptop_prod` as database role `postgres`
- Cron path: `/etc/cron.d/scholarshiptop-postgres`
- Cron command: `/opt/scholarshiptop/scripts/backup-postgres-daily.sh`

## What changed

- Replaced only `/opt/scholarshiptop/scripts/backup-postgres-daily.sh`.
- Installed mode/owner: `0750`, `root:root`.
- Installed checksum: `e71d6aa61d84091839c415257a44f158c0684e0ff53c4848bf3b5d8d66512c72`.
- Cron was not changed.
- The first reviewed version exposed a permission boundary missed by the mocked test: `postgres` could not open a root-owned temp path. Commit `338110a` makes root open the temp file and streams custom-format `pg_dump` output through the inherited descriptor.
- Corrected local success/failure/empty/invalid tests: PASS.

## Snapshot

- Snapshot directory: `/root/scholarshiptop-go1-backup-snapshot-20260628_151528`
- Script checksum before: `6ffb9c9c77196ae228428e29861c49bab00d5295b9888e8613a3f9a1d89534fb`
- Script snapshot: `backup-postgres-daily.sh.before`
- Cron snapshot: `scholarshiptop-postgres.before`
- User/root crontab snapshots: present (`NO_CRONTAB` markers where applicable)
- Backup directory listing: `backup-dir.before.txt`
- Backup directory: `/opt/scholarshiptop-db-backups`
- Old zero-byte dumps found: **YES, 4**
- Old zero-byte dumps deleted: **NO**
- Previous nonzero cutover dumps: **2**, approximately 212 MB each

## Manual dump result

### Attempt 1

- Exit code: `1`
- Result: failed before dump creation because the `postgres` process could not open the root-owned temp path.
- Log: `manual-backup-run.log`
- Response: stopped, corrected only the backup script, reran local tests, reinstalled the corrected checksum.

### Final attempt

- Command: `/opt/scholarshiptop/scripts/backup-postgres-daily.sh` as root, identical path/environment to cron
- Exit code: `0`
- Dump file: `/opt/scholarshiptop-db-backups/scholarshiptop_prod-20260628T151756Z.dump`
- Dump size: `213575801` bytes
- Checksum: `98c9e70fb2e51899572577ae433d81ecada24d366edac468db72819899883d3c`
- `sha256sum -c`: PASS, exit `0`
- `pg_restore -l`: PASS, exit `0`
- Restore list: 967 lines, 952 non-comment object lines
- `latest.dump`: resolves to the new dump
- `latest.dump.sha256`: resolves to the new checksum file
- Temporary artifacts remaining: `0`

## Logs

- Final isolated run log: `manual-backup-run-retry.log`
- Final run `permission denied|error|failed|fatal` matches: `0`
- Final run warning matches: `0`
- Main historical log retains the disclosed failed attempt and older failures; it was not edited or truncated.

## Rollback

Rollback script source:

```bash
sudo install -m 0755 -o root -g root \
  /root/scholarshiptop-go1-backup-snapshot-20260628_151528/backup-postgres-daily.sh.before \
  /opt/scholarshiptop/scripts/backup-postgres-daily.sh
sudo bash -n /opt/scholarshiptop/scripts/backup-postgres-daily.sh
sudo sha256sum /opt/scholarshiptop/scripts/backup-postgres-daily.sh
```

Expected rollback checksum: `6ffb9c9c77196ae228428e29861c49bab00d5295b9888e8613a3f9a1d89534fb`.

Cron was unchanged. If operational recovery nevertheless requires restoring its snapshot:

```bash
sudo cp -a \
  /root/scholarshiptop-go1-backup-snapshot-20260628_151528/scholarshiptop-postgres.before \
  /etc/cron.d/scholarshiptop-postgres
```

The rollback is prepared but should not be used merely to return to known zero-byte behavior.

## Verdict

```text
GO-1 Backup verdict: PASS
BACKUP_LIVE_VERIFIED: YES
DBSEC_READY_FOR_GO: YES
Production changed: BACKUP SCRIPT ONLY
Snapshot old script/cron: YES
Manual dump exit code: 0
Dump size > 0: YES
pg_restore -l PASS: YES
Checksum generated/verified: YES
Latest links valid: YES
No permission denied in final backup run: YES
Rollback ready: YES
```

## Next allowed stage

`GO-2 Fail-closed deploy`, only after separate approval. GO-2, GO-3, GO-4 and all application/DB/payment/network changes were not started in this task.
