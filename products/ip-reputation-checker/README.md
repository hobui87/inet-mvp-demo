# IP Reputation & Reverse DNS Checker

Công cụ nội bộ kiểm tra reputation của địa chỉ IP qua nhiều RBL (DNS blocklist), reverse DNS (PTR) và thông tin ASN. Trả về score + grade kèm lịch sử scan.

## Tech Stack

- **Backend**: Hono (Node.js), port `9044`
- **Frontend**: Vanilla HTML/JS/CSS trong `public/`, single-page
- **DNS lookup**: `dns.promises` — RBL zones, PTR record
- **ASN info**: ip-api.com
- **Persistence**: SQLite (`src/ip-scan-history-sqlite-db.js`) — lưu lịch sử scan
- **Workspace**: pnpm monorepo (package `ip-reputation-checker`)

## Chạy local

```bash
# Từ root monorepo
pnpm dev:ip-rep

# Hoặc từ thư mục product
cd products/ip-reputation-checker
pnpm dev
```

Mở browser: `http://localhost:9044`

## API

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/health` | Health check → `{ ok: true, port: 9044 }` |
| `GET /api/myip` | Phát hiện IP công khai của client (qua `x-forwarded-for` / `x-real-ip`) |
| `POST /api/check` | Body `{ "ip": "1.2.3.4" }` hoặc domain → score, grade, kết quả RBL + PTR + ASN |
| `GET /api/history?limit=20` | Lịch sử scan gần nhất |

## Biến môi trường

Không bắt buộc. Có thể override port qua `PORT` (mặc định `9044`).

## Demo

IP demo được override trong `src/ip-rbl-config.js` (`DEMO_IP_OVERRIDES`) → kết quả nhất quán khi present, không cần query DNS RBL thật.

## Lưu ý

- IP private (RFC 1918) được phát hiện và bỏ qua RBL check.
- Thư mục `data/` (chứa SQLite db) đã được `.gitignore` — không commit dữ liệu scan.

## Liên kết

- Plan: [260603-1404-ip-reputation-checker](../../plans/260603-1404-ip-reputation-checker/plan.md)
- Demo gallery: [plans/index.html](../../plans/index.html)
