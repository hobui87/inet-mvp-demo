# weekly-friday-training — iNET Innovation Lab

Internal product incubator: solo inventor xây MVP/SaaS, demo cho stakeholder **mỗi thứ 6**, đánh giá qua scoring rubric, chọn sản phẩm có tiềm năng để phát triển thành nguồn doanh thu. Repo cũng chứa setup **Token-First Design System** (viUI token layer cho MVP đa nền tảng).

- **Owner:** hobv@inet.vn
- **Mọi demo dùng dữ liệu thật** (real DNS/API), không mock.
- Tài liệu cho AI agent: [AGENTS.md](AGENTS.md) · Quy tắc dự án: [.claude/rules/](.claude/rules/)

## Yêu cầu môi trường

| Tool | Version | Ghi chú |
|------|---------|---------|
| Node.js | `>=22` | Pin qua [Volta](https://volta.sh) (`22.19.0`) hoặc nvm |
| pnpm | `>=10` | Package manager (monorepo workspace) |

## Cài đặt

```bash
# 1. Cài dependencies cho toàn workspace
pnpm install

# 2. Tạo file .env từ template (điền giá trị thật)
cp .env.example .env
cp products/domain-reputation/.env.example products/domain-reputation/.env
```

> `.env` đã được `.gitignore` — **không commit** giá trị thật. Mỗi product có nhu cầu env riêng đều kèm `.env.example`.

## Chạy local

```bash
# Chạy TẤT CẢ: hub + 4 product server song song
pnpm dev:all

# Hoặc chạy riêng từng phần
pnpm dev:hub          # Demo Hub + Gallery       → http://localhost:9030
pnpm dev:domain-rep   # Domain Reputation        → :9041
pnpm dev:email-auth   # Email Auth Checker        → :9042
pnpm dev:ssl-health   # SSL Health Dashboard      → :9043
pnpm dev:ip-rep       # IP Reputation Checker     → :9044
pnpm dev:dashboard    # MVP Dashboard (Astro)
```

**Demo Hub** (`:9030`) là entry point chung: phục vụ Demo Gallery (`plans/`) và reverse-proxy tới từng product qua `/product/:name/`. Chia sẻ team qua Cloudflare Tunnel: `pnpm start:demo`.

## Sản phẩm

| Product | Port | Trạng thái | Mô tả |
|---------|------|-----------|-------|
| [domain-reputation](products/domain-reputation/) | 9041 | ✅ Built | Kiểm tra reputation domain qua 6 blocklist |
| [email-auth-checker](products/email-auth-checker/) | 9042 | ✅ Built | Kiểm tra SPF/DKIM/DMARC |
| [ssl-health-dashboard](products/ssl-health-dashboard/) | 9043 | ✅ Built | Kiểm tra sức khỏe chứng chỉ SSL/TLS |
| [ip-reputation-checker](products/ip-reputation-checker/) | 9044 | ✅ Built | Kiểm tra reputation IP qua RBL + reverse DNS |
| [auto-renew-reminder](products/auto-renew-reminder/) | — | 💡 Concept | Nhắc gia hạn domain/dịch vụ |
| [dns-proxy-companion](products/dns-proxy-companion/) | — | 💡 Concept | Companion cấu hình DNS proxy |
| [domain-bulk-manager](products/domain-bulk-manager/) | — | 💡 Concept | Quản lý domain hàng loạt |

## Biến môi trường

| Biến | Scope | Bắt buộc | Mục đích |
|------|-------|----------|----------|
| `GITHUB_MIRROR_TOKEN` | root `.env` | Chỉ khi mirror | PAT để push mirror lên GitHub (script `scripts/github-mirror-push-...`) |
| `GOOGLE_SAFE_BROWSING_API_KEY` | `products/domain-reputation/.env` | Không (degrade) | GSB blocklist v5; thiếu → badge `[no key]`, app vẫn chạy |
| `PORT` | mỗi product | Không | Override port mặc định của product |

Khi deploy production, các biến trên cần được set trên server (xem `scripts/server-initial-setup-*.sh` và GitHub Secrets cho deploy pipeline).

## Thêm product mới

1. Tạo thư mục `products/<ten-product>/` với `package.json` (`"name": "<ten-product>"`, scripts `dev`/`start`).
2. Server lắng nghe port riêng (dải `904x`), expose `GET /api/health`.
3. Đăng ký port vào `PRODUCT_PORTS` trong [friday-demo-hub-server-plans-static-and-product-proxy.js](friday-demo-hub-server-plans-static-and-product-proxy.js) — proxy `/product/<ten-product>/` sẽ tự hoạt động.
4. Thêm script `dev:<slug>` vào [package.json](package.json) và bổ sung vào `dev:all`.
5. Nếu cần env: tạo `products/<ten-product>/.env.example` + cập nhật bảng biến môi trường ở trên.
6. Viết `products/<ten-product>/README.md` (tech stack, cách chạy, API, link plan).
7. Thêm card vào [plans/index.html](plans/index.html) (Demo Gallery) — xem quy tắc trong `.claude/rules/development-rules.md`.

## Cấu trúc repo

```
.
├── products/        # Các MVP (mỗi product 1 workspace package)
├── dashboard/       # MVP Dashboard (Astro)
├── plans/           # Plan theo product + Demo Gallery (index.html)
├── docs/            # Tài liệu (đang được tập trung hoá)
├── evaluation/      # Đánh giá product (rubric + session report)
├── scripts/         # Setup server, deploy, tunnel, mirror
├── .github/         # GitHub Actions deploy pipeline
└── friday-demo-hub-server-...js   # Demo Hub (entry point :9030)
```

## Liên kết

- Demo Gallery: [plans/index.html](plans/index.html)
- Active plans: [plans/260508-0811-inet-innovation-lab](plans/260508-0811-inet-innovation-lab/plan.md) · [plans/260511-0817-inet-design-token-layer](plans/260511-0817-inet-design-token-layer/plan.md)
