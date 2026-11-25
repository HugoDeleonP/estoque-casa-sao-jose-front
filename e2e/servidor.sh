#!/usr/bin/env bash
# Sobe a API (com o build do front) num banco TEMPORÁRIO, para o teste ponta a ponta.
# Usado pelo webServer do playwright.config.ts; nunca toca o banco local nem o de produção.
set -euo pipefail
BACKEND="${BACKEND_DIR:-$(cd "$(dirname "$0")/../../estoque-casa-sao-jose-backend" && pwd)}"
TMP="$(mktemp -d)"
export ESTOQUE_DB_PATH="$TMP/e2e.db" ESTOQUE_DEBUG=false ESTOQUE_PORT="${E2E_PORT:-8790}" \
       ESTOQUE_FRONT_DIST="$(cd "$(dirname "$0")/.." && pwd)/dist" \
       ESTOQUE_SECRET_KEY="e2e-$(date +%s%N)" ESTOQUE_BCRYPT_ROUNDS=4
cd "$BACKEND"
uv run python -m estoque_doacoes.scripts.seed
uv run python "$OLDPWD/e2e/preparar_usuarios.py"
exec uv run estoque-doacoes
