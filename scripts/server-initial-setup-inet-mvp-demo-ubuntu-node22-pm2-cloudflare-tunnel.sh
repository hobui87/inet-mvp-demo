#!/usr/bin/env bash
# ============================================================
#  One-time server setup: inet-mvp-demo (huongthao.io.vn)
#  Ubuntu 22.04 | Node 22 | pnpm | PM2 | Cloudflare Tunnel
#  (Không cần Nginx/SSL — Cloudflare xử lý HTTPS)
#
#  Chạy từ local:
#    Get-Content scripts/server-initial-setup-inet-mvp-demo-ubuntu-node22-pm2-cloudflare-tunnel.sh | ssh hobv-vps 'bash -s'
#
#  Sau khi chạy xong, thêm GitHub Secrets tại:
#    https://github.com/hobui87/inet-mvp-demo/settings/secrets/actions
# ============================================================

set -euo pipefail

DEPLOY_DIR="$HOME/inet-mvp-demo"
GITHUB_REPO="hobui87/inet-mvp-demo"
APP_DOMAIN="huongthao.io.vn"
HUB_PORT=9030
OLD_DEPLOY_DIR="$HOME/inet-mvp-demo"

# Thông tin SSH cho GitHub Actions deploy (chỉ in ra hướng dẫn, không hardcode).
# Override khi chạy:  SSH_HOST=1.2.3.4 SSH_USERNAME=user SSH_PORT=22 bash setup.sh
SSH_HOST="${SSH_HOST:-<server-ip>}"
SSH_USERNAME="${SSH_USERNAME:-<server-user>}"
SSH_PORT="${SSH_PORT:-22}"

echo ""
echo "======================================================"
echo "  Setup: ${APP_DOMAIN} → ${DEPLOY_DIR}"
echo "======================================================"

# ── 1. NVM + Node.js 22 ───────────────────────────────────
echo ""
echo "=== [1/9] NVM + Node.js 22 ==="
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm install 22
nvm alias default 22
echo "  Node: $(node --version)"

# ── 2. pnpm + PM2 ─────────────────────────────────────────
echo ""
echo "=== [2/9] pnpm + PM2 ==="
npm install -g pnpm pm2
echo "  pnpm: $(pnpm --version)"
echo "  pm2:  $(pm2 --version)"

# ── 3. GitHub Deploy Key (server → GitHub pull) ───────────
echo ""
echo "=== [3/9] GitHub Deploy Key ==="
DEPLOY_KEY="$HOME/.ssh/github_deploy_friday_products_ed25519"
if [ ! -f "$DEPLOY_KEY" ]; then
  ssh-keygen -t ed25519 -f "$DEPLOY_KEY" -N "" -C "deploy@${APP_DOMAIN}"
fi

# SSH config để dùng deploy key khi kết nối GitHub
GITHUB_HOST_ALIAS="github.com-inet-mvp-demo"
if ! grep -q "$GITHUB_HOST_ALIAS" "$HOME/.ssh/config" 2>/dev/null; then
  cat >> "$HOME/.ssh/config" << EOF

# Deploy key cho inet-mvp-demo
Host ${GITHUB_HOST_ALIAS}
    HostName github.com
    User git
    IdentityFile ${DEPLOY_KEY}
    IdentitiesOnly yes
EOF
fi
chmod 600 "$HOME/.ssh/config"

echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  COPY public key này vào GitHub Deploy Keys:        │"
echo "  │  https://github.com/${GITHUB_REPO}/settings/keys/new │"
echo "  │  Title: deploy-${APP_DOMAIN}  |  Read-only ✓        │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
cat "${DEPLOY_KEY}.pub"
echo ""
read -rp "  → Nhấn ENTER sau khi đã thêm Deploy Key vào GitHub... " _

# Test kết nối
ssh -T -o StrictHostKeyChecking=no "${GITHUB_HOST_ALIAS}" 2>&1 | grep -i "authenticated" || true

# ── 4. Clone repository ───────────────────────────────────
echo ""
echo "=== [4/9] Clone repository ==="
if [ -d "$DEPLOY_DIR/.git" ]; then
  echo "  Đã có git repo tại ${DEPLOY_DIR}, skip clone."
elif [ -d "$DEPLOY_DIR" ]; then
  echo "  Thư mục tồn tại nhưng chưa phải git repo — chuyển đổi..."
  cd "$DEPLOY_DIR"
  git init
  git remote add origin "git@${GITHUB_HOST_ALIAS}:${GITHUB_REPO}.git"
  git fetch --depth=1 origin main
  git reset --hard origin/main
else
  git clone "git@${GITHUB_HOST_ALIAS}:${GITHUB_REPO}.git" "$DEPLOY_DIR"
fi

# ── 5. Install dependencies ───────────────────────────────
echo ""
echo "=== [5/9] Install dependencies ==="
cd "$DEPLOY_DIR"
pnpm install --no-frozen-lockfile
for dir in products/*/; do
  [ -f "${dir}package.json" ] && echo "  → ${dir}" && (cd "$dir" && pnpm install --no-frozen-lockfile)
done

# ── 6. Migrate dữ liệu từ deploy cũ ──────────────────────
echo ""
echo "=== [6/9] Migrate từ deploy cũ ==="

# .env cho domain-reputation
OLD_ENV="${OLD_DEPLOY_DIR}/products/domain-reputation/.env"
NEW_ENV="${DEPLOY_DIR}/products/domain-reputation/.env"
if [ -f "$OLD_ENV" ] && [ ! -f "$NEW_ENV" ]; then
  cp "$OLD_ENV" "$NEW_ENV"
  echo "  ✓ Copied domain-reputation/.env"
elif [ ! -f "$NEW_ENV" ]; then
  echo "  ⚠ Tạo file .env thủ công:"
  echo "    echo 'GOOGLE_SAFE_BROWSING_API_KEY=<key>' > ${NEW_ENV}"
fi

# plans/ content (gitignored, cần copy thủ công)
if [ -d "${OLD_DEPLOY_DIR}/plans" ]; then
  cp -rn "${OLD_DEPLOY_DIR}/plans/." "${DEPLOY_DIR}/plans/" 2>/dev/null && echo "  ✓ Copied plans/ content" || echo "  ~ plans/ đã có content"
fi

# ── 7. PM2 start + auto-startup ──────────────────────────
echo ""
echo "=== [7/9] PM2 start ==="
cd "$DEPLOY_DIR"
if pm2 list | grep -q "hub"; then
  pm2 reload pm2-ecosystem-config-inet-mvp-demo-all-services.cjs --update-env
else
  pm2 start pm2-ecosystem-config-inet-mvp-demo-all-services.cjs
fi
pm2 save

echo ""
echo "  PM2 startup command (chạy lệnh dưới với sudo):"
pm2 startup | grep "sudo"

# ── Summary ───────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  Setup hoàn tất!"
echo "  Cloudflare tunnel → localhost:${HUB_PORT} → ${APP_DOMAIN}"
echo ""
echo "  Thêm GitHub Secrets tại:"
echo "  https://github.com/${GITHUB_REPO}/settings/secrets/actions"
echo ""
echo "  Cần 4 secrets:"
echo "    SSH_HOST=${SSH_HOST}"
echo "    SSH_USERNAME=${SSH_USERNAME}"
echo "    SSH_PORT=${SSH_PORT}"
echo "    SSH_PRIVATE_KEY=<nội dung file ~/.ssh/hobv_vps_ed25519 trên máy local>"
echo "======================================================"
