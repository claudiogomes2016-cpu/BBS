#!/usr/bin/env bash
# Concatenates every migration into supabase/setup.sql, for projects set up by
# pasting into the Supabase SQL Editor. Regenerate after adding a migration.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/supabase/setup.sql"
{
  echo "-- AFFILIATE INTELLIGENCE — full database setup (generated, do not edit)."
  echo "-- Source: supabase/migrations/*.sql  ·  Regenerate: npm run db:bundle"
  echo "-- Paste into Supabase → SQL Editor → Run, on a NEW, EMPTY project."
  for f in "$ROOT"/supabase/migrations/*.sql; do
    echo; echo "-- >>> $(basename "$f")"; cat "$f"
  done
} > "$OUT"
echo "wrote $OUT"
