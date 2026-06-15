# N5 Domain Reputation Monitor

Công cụ nội bộ kiểm tra reputation của domain qua 6 blocklist. Trả về score 0–100 với phân loại màu sắc và khuyến nghị hành động.

## Tech Stack

- **Backend**: Hono (Node.js), port `9041`
- **Frontend**: Vanilla HTML/JS/CSS, single-page, dark theme, 3 tabs
- **DNS lookup**: `dns.promises` (Node built-in)
- **Real-time feeds**: Google Safe Browsing API v5, Phishing Army community feed
- **Persistence**: SQLite via `better-sqlite3` — history 30 ngày, tối đa 500 rows
- **Workspace**: pnpm monorepo

## Chạy local

```bash
# Từ root monorepo
pnpm dev:domain-rep

# Hoặc từ thư mục product
cd products/domain-reputation
pnpm dev
```

Mở browser: `http://localhost:9041`

## API

### `GET /api/history?limit=20`

```json
{
  "history": [
    { "id": 1, "domain": "inet.vn", "score": 100, "grade": "clean", "checks": [...], "scanned_at": 1748300000000 }
  ]
}
```

### `POST /api/bulk-check`

```json
// Request
{ "domains": ["inet.vn", "suspicious.info"] }

// Response 200
{
  "results": [
    { "domain": "inet.vn", "score": 100, "grade": "clean", ... },
    { "domain": "suspicious.info", "score": 70, "grade": "moderate", ... }
  ],
  "errors": [],
  "total": 2,
  "duration_ms": 310
}
```

### `POST /api/check`

```json
// Request
{ "domain": "inet.vn" }

// Response 200
{
  "domain": "inet.vn",
  "score": 100,
  "grade": "clean",
  "recommended_action": "Domain sạch. Không cần hành động.",
  "checks": [
    { "id": "spamhaus-dbl", "name": "Spamhaus DBL", "weight": 30, "listed": false },
    ...
  ],
  "duration_ms": 42
}

// Response 400 — domain không hợp lệ
{ "error": "Domain không hợp lệ" }
```

### `GET /api/health`

```json
{ "ok": true, "port": 9041 }
```

## 3 Domain Demo (Demo Thứ 6 29/05)

| Domain | Score | Grade | Kịch bản |
|--------|-------|-------|---------|
| `inet.vn` | 100 | Clean | Domain sạch hoàn toàn |
| `suspicious.info` | 70 | Moderate Risk | Bị list Spamhaus DBL (weight 30) |
| `known-phishing.net` | 30 | High Risk | Bị list Spamhaus + GSB + Barracuda |

> Dữ liệu 3 domain này được **override cứng** trong `src/blocklist-config.js` → kết quả nhất quán, không phụ thuộc DNS thật.

### Shareable URL

```
http://localhost:9041/?domain=inet.vn
```

Mở URL trên → tự động scan và hiển thị kết quả ngay lập tức.

## 6 Blocklists

| Blocklist | Weight | Loại | Ghi chú |
|-----------|--------|------|---------|
| Spamhaus DBL | 30 | DNS real | `dbl.spamhaus.org` |
| Google Safe Browsing | 25 | GSB API v5 real-time | Env var `GOOGLE_SAFE_BROWSING_API_KEY` |
| SURBL | 15 | DNS real | `multi.surbl.org` |
| Barracuda | 15 | DNS real | `b.barracudacentral.org` |
| Phishing Army | 10 | Feed real-time | phishing.army (~144k domains, cập nhật hàng ngày) |
| MXToolbox / JunkEmail | 5 | DNS real | `black.junkemailfilter.com` |

## Score Formula

```
score = 100 - Σ(weight[i] × listed[i])
```

| Range | Grade | Màu |
|-------|-------|-----|
| 85–100 | Clean | Xanh `#16a34a` |
| 60–84 | Moderate Risk | Vàng `#d97706` |
| 0–59 | High Risk | Đỏ `#dc2626` |

## Giới hạn đã biết (MVP)

- Không có history, không có export PDF, không có bulk scan → v2
- Spamhaus free tier có rate limit — test load trước demo nếu nhiều người scan đồng thời
- GSB hiển thị badge `[no key]` nếu thiếu env var `GOOGLE_SAFE_BROWSING_API_KEY`

## Kế hoạch v2

- [x] Integrate GSB API v5 thật + Phishing Army feed
- [x] History 30d (SQLite) — `GET /api/history`, tab Lịch sử
- [x] Bulk scan (tối đa 50 domains) — `POST /api/bulk-check`, tab Quét hàng loạt
- [x] Export CSV kết quả bulk scan
- [ ] Email alert khi domain bị list
- [ ] Public API endpoint với API key
- [ ] Deploy `reputation.inet.vn`

## Liên kết

- Plan: [260522-1659-n5-domain-reputation-monitor](../../plans/260522-1659-n5-domain-reputation-monitor/plan.md)
- Demo gallery: [plans/index.html](../../plans/index.html)
