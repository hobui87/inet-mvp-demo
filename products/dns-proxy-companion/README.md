# DNS Proxy Companion

## Problem

iNET customers cần đổi DNS records hàng loạt nhưng UI hiện tại chậm và không hỗ trợ
bulk operations. Mỗi thay đổi phải thực hiện thủ công từng record một, gây mất thời
gian và tăng tỷ lệ lỗi cho IT admin quản lý nhiều domain cùng lúc.

## Target User

SMB IT admins using iNET DNS hosting — đặc biệt những team quản lý 10–100 domain,
cần propagate DNS changes đồng loạt (ví dụ: migrate nameserver, update SPF/DKIM
records cho toàn bộ portfolio).

## Tech Stack

- **next.js@15** — App Router + Server Actions cho bulk mutation UI
- **postgres** — Lưu trữ job queue và audit log cho mỗi DNS operation
- **cloudflare-workers** — Edge proxy layer gọi iNET DNS API, handle retry + rate-limit

**Status:** building · **MVP ID:** MVP-007 · **Owner:** hobv@inet.vn
