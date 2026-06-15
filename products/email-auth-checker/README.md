# N22 Email Authentication Health Checker

Công cụ nội bộ kiểm tra cấu hình xác thực email của domain (SPF, DKIM, DMARC). Trả về score + grade kèm hướng dẫn khắc phục bằng Tiếng Việt.

## Tech Stack

- **Backend**: Hono (Node.js), port `9042`
- **Frontend**: Vanilla HTML/JS/CSS trong `public/`, single-page
- **DNS lookup**: `dns.promises` (Node built-in) — query SPF (TXT), DKIM (selector), DMARC (`_dmarc`)
- **Workspace**: pnpm monorepo (package `email-auth-checker`)

## Chạy local

```bash
# Từ root monorepo
pnpm dev:email-auth

# Hoặc từ thư mục product
cd products/email-auth-checker
pnpm dev
```

Mở browser: `http://localhost:9042`

## API

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/health` | Health check → `{ ok: true, port: 9042 }` |
| `POST /api/check` | Body `{ "domain": "inet.vn" }` → score, grade, kết quả SPF/DKIM/DMARC + remediation guide |

`POST /api/check` trả `400` nếu domain không hợp lệ hoặc body không phải JSON.

## Biến môi trường

Không bắt buộc. Có thể override port qua `PORT` (mặc định `9042`).

## Demo

Domain demo được override cứng trong `src/demo-domain-overrides-for-friday-presentation.js` → kết quả nhất quán khi present, không phụ thuộc DNS thật.

## Liên kết

- Plan: [260528-1417-n22-email-authentication-health-checker](../../plans/260528-1417-n22-email-authentication-health-checker/plan.md)
- Demo gallery: [plans/index.html](../../plans/index.html)
