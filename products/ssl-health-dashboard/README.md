# SSL Health Dashboard

Công cụ nội bộ kiểm tra sức khỏe chứng chỉ SSL/TLS của domain: ngày hết hạn, issuer, self-signed, protocol. Hỗ trợ quét hàng loạt (tối đa 10 domain) với score + grade.

## Tech Stack

- **Backend**: Hono (Node.js), port `9043`
- **Frontend**: Vanilla HTML/JS/CSS trong `public/`, single-page
- **SSL inspect**: `tls` (Node built-in) qua `src/ssl-certificate-info-fetcher.js`
- **Workspace**: pnpm monorepo (package `ssl-health-dashboard`)

## Chạy local

```bash
# Từ root monorepo
pnpm dev:ssl-health

# Hoặc từ thư mục product
cd products/ssl-health-dashboard
pnpm dev
```

Mở browser: `http://localhost:9043`

## API

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/health` | Health check → `{ ok: true, port: 9043 }` |
| `POST /api/check` | Body `{ "domains": ["inet.vn", ...] }` (tối đa 10) → cert info + health score mỗi domain |

`POST /api/check` trả `400` nếu body không phải JSON hợp lệ.

## Biến môi trường

Không bắt buộc. Có thể override port qua `PORT` (mặc định `9043`).

## Demo

Domain demo (`expired.badssl.com`, `self-signed.badssl.com`) được override cứng trong server → kịch bản cert hết hạn / self-signed nhất quán khi present.

## Liên kết

- Demo gallery: [plans/index.html](../../plans/index.html)
