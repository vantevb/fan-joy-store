#!/usr/bin/env bash
# Cria um banco limpo, aplica a migração e o seed e roda os testes.
# Requer PostgreSQL 15+ acessível. Variáveis: PGHOST, PGPORT, PGUSER (padrão: localhost, 5432, postgres).
set -euo pipefail
cd "$(dirname "$0")/.."
DB=fanjoy_teste_$$
psql -X -q -c "create database $DB" >/dev/null
trap 'psql -X -q -c "drop database if exists $DB" >/dev/null' EXIT
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/local-auth-shim.sql >/dev/null
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/migrations/20261107000001_loja.sql >/dev/null
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/seed.sql >/dev/null
out=$(psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/banco.test.sql)
echo "$out"
! grep -q '✗' <<<"$out"
