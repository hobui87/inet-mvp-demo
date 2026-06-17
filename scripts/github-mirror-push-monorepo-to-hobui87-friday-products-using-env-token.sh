#!/usr/bin/env bash
# Push weekly-friday-training monorepo to the GitHub mirror using GITHUB_MIRROR_TOKEN from .env
# Usage: bash scripts/github-mirror-push-monorepo-to-hobui87-friday-products-using-env-token.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

ENV_FILE=".env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env not found" >&2
  exit 1
fi

# Load .env (skip comments and blank lines)
set -a
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
set +a

if [[ -z "${GITHUB_MIRROR_TOKEN:-}" ]]; then
  echo "Error: GITHUB_MIRROR_TOKEN not found in .env" >&2
  exit 1
fi

echo "Token loaded (${GITHUB_MIRROR_TOKEN:0:8}***)"

# Use a dedicated remote so we never clobber 'origin'. The token only ever lives
# in this temporary remote, which is removed on EXIT (success or failure) so it
# is never persisted in .git/config.
MIRROR_REMOTE="mirror"
MIRROR_URL="https://${GITHUB_MIRROR_TOKEN}@github.com/hobui87/friday-products.git"

cleanup() { git remote remove "$MIRROR_REMOTE" >/dev/null 2>&1 || true; }
trap cleanup EXIT

git remote remove "$MIRROR_REMOTE" >/dev/null 2>&1 || true
git remote add "$MIRROR_REMOTE" "$MIRROR_URL"

echo "Pushing to github.com/hobui87/friday-products (remote: $MIRROR_REMOTE)..."
git push "$MIRROR_REMOTE" main

echo "Done. Mirror remote removed (token not persisted)."
