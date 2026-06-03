#!/usr/bin/env bash
# Friday demo startup script — bash version (Git Bash / WSL / macOS)
# Usage  : bash scripts/start-friday-demo-server-and-cloudflared-tunnel.sh
# PS1    : .\scripts\start-friday-demo-server-and-cloudflared-tunnel.ps1
#
# Starts:
#   [1] Domain Reputation Monitor  — Hono, port 9041
#   [2] Friday Demo Hub server     — Hono, port 9030  (plans/ gallery + /product/* proxy)
#   [3] Cloudflared tunnel         — exposes port 9030 via https://friday.binhnguyen.io.vn

set -uo pipefail

# Script lives in scripts/ — project root is one level up
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=9030
TUNNEL_CONFIG="$HOME/.cloudflared/config-friday.yml"

# ANSI colors
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'
RED='\033[0;31m';   GRAY='\033[0;37m'; NC='\033[0m'

echo -e "${CYAN}=== iNET Friday Demo Server ===${NC}"
echo -e "${GRAY}Root     : $PROJECT_ROOT${NC}"
echo -e "${GRAY}Hub port : $PORT${NC}"
echo -e "${GREEN}URL      : https://friday.binhnguyen.io.vn${NC}"
echo ""

# Kill any process holding the given port (cross-platform)
kill_port() {
  local port=$1
  if command -v lsof &>/dev/null; then
    # Linux / macOS
    lsof -ti:"$port" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
  else
    # Git Bash / WSL on Windows — extract PID from netstat, use taskkill
    local pid
    pid=$(netstat -ano 2>/dev/null \
      | awk -v p=":$port" '$2 ~ p && /LISTEN/{print $5; exit}')
    if [[ -n "$pid" ]]; then
      taskkill //F //PID "$pid" &>/dev/null || true
    fi
  fi
}

# Check and free port before starting hub server
if command -v lsof &>/dev/null && lsof -ti:"$PORT" &>/dev/null; then
  echo -e "${YELLOW}[WARN] Port $PORT dang duoc dung. Tat process cu...${NC}"
  kill_port "$PORT"
  sleep 1
elif netstat -ano 2>/dev/null | awk -v p=":$PORT" '$2 ~ p && /LISTEN/{found=1} END{exit !found}'; then
  echo -e "${YELLOW}[WARN] Port $PORT dang duoc dung. Tat process cu...${NC}"
  kill_port "$PORT"
  sleep 1
fi

# Track background PIDs for cleanup
REP_PID=""
HUB_PID=""

cleanup() {
  echo -e "\n${RED}[STOP] Dang tat servers...${NC}"
  [[ -n "$REP_PID" ]] && kill "$REP_PID" 2>/dev/null || true
  [[ -n "$HUB_PID" ]] && kill "$HUB_PID" 2>/dev/null || true
  # Kill remaining child processes spawned by this shell
  jobs -p | xargs -r kill 2>/dev/null || true
  echo -e "${GRAY}[DONE] Da dung tat ca server.${NC}"
}
trap cleanup EXIT INT TERM

# Helper: wait until port is listening or timeout (cross-platform)
wait_port() {
  local port=$1 timeout=${2:-15} elapsed=0
  while [ $elapsed -lt $timeout ]; do
    if command -v lsof &>/dev/null && lsof -ti:"$port" &>/dev/null; then
      return 0
    elif netstat -ano 2>/dev/null | awk -v p=":$port" '$2 ~ p && /LISTEN/{found=1} END{exit !found}'; then
      return 0
    fi
    sleep 0.5; elapsed=$((elapsed + 1))
  done
  return 1
}

# [1/3] Domain Reputation Monitor — Hono API + frontend (port 9041)
echo -e "${YELLOW}[1/3] Khoi dong Domain Reputation Monitor (port 9041)...${NC}"
(cd "$PROJECT_ROOT" && pnpm dev:domain-rep) &
REP_PID=$!

if ! wait_port 9041 15; then
  echo -e "${RED}[ERROR] Domain Reputation Monitor khong start duoc (port 9041 timeout).${NC}"
  kill "$REP_PID" 2>/dev/null; exit 1
fi
echo -e "${GREEN}        Domain Reputation Monitor OK (port 9041)${NC}"

# [2/3] Hub server — serve plans/ + reverse-proxy /product/* (port 9030)
echo -e "${YELLOW}[2/3] Khoi dong Hub server (port $PORT)...${NC}"
(cd "$PROJECT_ROOT" && pnpm dev:hub) &
HUB_PID=$!

if ! wait_port "$PORT" 10; then
  echo -e "${RED}[ERROR] Hub server khong start duoc (port $PORT timeout).${NC}"
  kill "$REP_PID" "$HUB_PID" 2>/dev/null; exit 1
fi
echo -e "${GREEN}        Hub server OK (port $PORT)${NC}"

echo ""
echo -e "${GREEN}[OK] Tat ca servers dang chay:${NC}"
echo -e "${CYAN}     Demo Gallery  : https://friday.binhnguyen.io.vn/${NC}"
echo -e "${CYAN}     Domain Monitor: https://friday.binhnguyen.io.vn/product/domain-reputation/${NC}"
echo ""

# Open browser — cross-platform (xdg-open / macOS open / WSL cmd.exe)
_URL="https://friday.binhnguyen.io.vn"
if command -v xdg-open &>/dev/null; then
  xdg-open "$_URL" &>/dev/null &
elif command -v open &>/dev/null; then
  open "$_URL" &
elif command -v cmd.exe &>/dev/null; then
  cmd.exe /c start "$_URL" &>/dev/null &
fi

# [3/3] Cloudflared tunnel (blocking — giu terminal mo)
echo -e "${YELLOW}[3/3] Khoi dong cloudflared tunnel...${NC}"
echo -e "${GRAY}Nhan Ctrl+C de dung tat ca.${NC}"
echo ""

cloudflared tunnel --config "$TUNNEL_CONFIG" run friday
