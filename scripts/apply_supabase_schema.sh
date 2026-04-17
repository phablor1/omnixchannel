#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_FILE="$ROOT_DIR/supabase/schema.sql"

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Erro: schema não encontrado em $SCHEMA_FILE" >&2
  exit 1
fi

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Erro: defina SUPABASE_DB_URL com a connection string Postgres do Supabase." >&2
  echo "Exemplo: export SUPABASE_DB_URL='postgresql://postgres:<senha>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require'" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Erro: psql não encontrado. Instale o cliente Postgres para aplicar o schema." >&2
  exit 1
fi

echo "Aplicando schema em: supabase/schema.sql"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"
echo "Schema aplicado com sucesso."
