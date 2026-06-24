#!/usr/bin/env bash
set -euo pipefail
echo "postgresql_active=$(systemctl is-active postgresql)"
echo "listen_5432:"
ss -tlnp | grep 5432 || true
echo "db_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='scholarshiptop_prod'")"
echo "app_user=$(sudo -u postgres psql -tAc "SELECT rolname||' super='||rolsuper::text FROM pg_roles WHERE rolname='scholarshiptop_app'")"
echo "backup_dir=$(ls -ld /opt/scholarshiptop-db-backups)"
echo "backup_cron=$(test -f /etc/cron.d/scholarshiptop-postgres && echo installed || echo missing)"
echo "postgres_env=$(test -f /opt/scholarshiptop/env/postgres.env && echo exists || echo missing)"
