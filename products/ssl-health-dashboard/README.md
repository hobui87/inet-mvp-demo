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

Toàn bộ kết quả lấy từ cert thật (không mock, không override). Các domain `badssl.com` phục vụ sẵn cert thật cho từng kịch bản, dùng trực tiếp khi present:

| Domain | Kịch bản (real cert) |
|--------|----------------------|
| `expired.badssl.com` | Cert hết hạn → `status: expired`, score `0`, grade `F` |
| `self-signed.badssl.com` | Cert self-signed → `selfSigned: true` (phát hiện qua fingerprint issuer chain), `status: self_signed`, score `40`, grade `D` |
| `inet.vn` | Cert hợp lệ → score theo số ngày còn lại |

## Liên kết

- Demo gallery: [plans/index.html](../../plans/index.html)
