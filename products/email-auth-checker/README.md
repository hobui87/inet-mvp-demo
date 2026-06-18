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

**Field tùy chọn (backward compatible)** cho `POST /api/check`:

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `selector` | string | DKIM selector nhập tay — query thẳng `{selector}._domainkey.{domain}` |
| `dkim_header` | string | Dán raw `DKIM-Signature` header → tự trích `s=` (selector) và `d=` (domain) |

Ưu tiên: `selector` > `dkim_header` > brute-force tự động.

## DKIM 3-state

DKIM không có cơ chế liệt kê selector → brute-force chỉ đoán. Tool phân biệt 3 trạng thái thay vì boolean:

- **`found`**: tìm thấy DKIM record (kèm phân tích key: `key_type`, `key_bits`, `revoked`, `test_mode`).
- **`inconclusive`**: đã thử ~30-40 selector phổ biến (ưu tiên theo MX provider) nhưng không thấy — **chưa kết luận thiếu DKIM** (domain có thể dùng selector riêng như Amazon SES/Brevo/Mailchimp). Scoring tính ~50% (không phạt như thiếu hẳn). Nhập `selector`/`dkim_header` để kiểm tra chính xác.
- **`absent`**: user đã nhập selector cụ thể mà vẫn miss → xác nhận không có DKIM.

DMARC còn phát hiện sâu hơn: nhiều bản ghi (`record_count > 1`), `pct=0` vô nghĩa, alignment strict.

## Verify với DNS thật

```bash
cd products/email-auth-checker
node verify-real-dns.mjs   # cần máy có mạng — probe bộ domain, in score/grade/dkim.status
```

## Biến môi trường

Không bắt buộc. Có thể override port qua `PORT` (mặc định `9042`).

## Dữ liệu

Tool query DNS **thật** cho mọi domain (SPF/DKIM/DMARC) — không còn override demo. Kết quả phản ánh đúng cấu hình hiện tại của domain tại thời điểm kiểm tra.

## Liên kết

- Plan: [260528-1417-n22-email-authentication-health-checker](../../plans/260528-1417-n22-email-authentication-health-checker/plan.md)
- Demo gallery: [plans/index.html](../../plans/index.html)
