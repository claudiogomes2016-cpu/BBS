#!/usr/bin/env bash
# Spins up a throwaway PostgreSQL, applies every migration and runs the RLS /
# ledger test suite. Usage: npm run test:db   (requires PostgreSQL 15+ binaries)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$DATA"; RUNAS=(runuser -u postgres --); fi
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -w start >/dev/null
PSQL=("${RUNAS[@]}" "$PGBIN/psql" -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$HERE/auth_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ applying $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "→ running tests"
"${PSQL[@]}" -f "$HERE/rls_and_ledger_test.sql"
echo "✔ database tests passed"
