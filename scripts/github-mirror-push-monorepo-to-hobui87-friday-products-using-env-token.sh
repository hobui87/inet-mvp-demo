#!/usr/bin/env bash
# Push weekly-friday-training monorepo to GitHub using GITHUB_MIRROR_TOKEN from .env
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

REMOTE_URL="https://${GITHUB_MIRROR_TOKEN}@github.com/hobui87/friday-products.git"

# Set authenticated remote URL temporarily
git remote set-url origin "$REMOTE_URL"

echo "Pushing to github.com/hobui87/friday-products..."
git push -u origin main

# Remove token from remote URL after push (security)
git remote set-url origin "https://github.com/hobui87/friday-products.git"
echo "Done. Token removed from remote URL."
