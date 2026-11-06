#!/usr/bin/env bash
# Testa o site no modo LOJA REAL contra um PostgreSQL local, sem precisar de conta no Supabase.
# Requer: PostgreSQL 15+, Node, Playwright, Python 3. Variáveis PGHOST/PGPORT/PGUSER para o psql.
set -euo pipefail
cd "$(dirname "$0")/.."
export DB=fanjoy_live_$$
SITE_PORT=${SITE_PORT:-8091}; BRIDGE_PORT=${BRIDGE_PORT:-8099}
psql -X -q -c "create database $DB" >/dev/null
cleanup() { kill ${BRIDGE_PID:-} ${SITE_PID:-} 2>/dev/null || true; psql -X -q -c "drop database if exists $DB" >/dev/null; }
trap cleanup EXIT
for f in supabase/tests/local-auth-shim.sql supabase/migrations/*.sql supabase/seed.sql; do
  psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null
done
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" >/dev/null <<'SQL'
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'lilian@fanjoy.test'), ('00000000-0000-0000-0000-00000000000b', 'cliente@fanjoy.test');
insert into public.staff values ('00000000-0000-0000-0000-00000000000a', 'Lilian', 'dona');
SQL
node tests/live/bridge.cjs "$BRIDGE_PORT" "$DB" >/dev/null & BRIDGE_PID=$!
python3 -m http.server "$SITE_PORT" >/dev/null 2>&1 & SITE_PID=$!
sleep 1
SITE=http://localhost:$SITE_PORT BRIDGE=http://localhost:$BRIDGE_PORT node tests/e2e-live.cjs
