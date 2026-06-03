# Auto-Renew Reminder

## Problem

Customer mất domain do quên gia hạn — iNET hiện chỉ gửi 1 email duy nhất 30 ngày
trước khi expire. Với segment SMB có portfolio 5–20 domain, tỷ lệ lapse vẫn cao do
email bị bỏ qua. Cần notification chain đa kênh với cadence 30/14/7/1 ngày.

## Target User

iNET domain hosting customers (SMB segment) — đặc biệt business owner kiêm IT admin,
không có dedicated ops team để theo dõi renewal calendar. Magic link gia hạn 1-click
trong email là UX key để tăng conversion.

## Tech Stack

- **typescript** — Type-safe notification scheduler và template engine
- **postgres** — Domain expiry registry + notification log (dedup, retry state)
- **resend@4** — Transactional email với React Email templates, open-rate tracking
- **cloudflare-workers** — Cron trigger hàng ngày scan expiring domains, gửi batch

**Status:** selected · **Score:** 4.60 · **MVP ID:** MVP-006 · **Owner:** hobv@inet.vn
