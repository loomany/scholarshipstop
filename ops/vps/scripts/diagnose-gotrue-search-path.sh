#!/usr/bin/env bash
set -euo pipefail
sudo -u postgres psql -d scholarshiptop_prod -c "show search_path;"
sudo -u postgres psql -d scholarshiptop_prod -c "select to_regclass('auth.identities') as auth_identities, to_regclass('identities') as bare_identities;"
