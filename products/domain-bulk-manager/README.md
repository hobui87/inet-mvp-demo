# Domain Bulk Manager

## Problem

Customer có >50 domain cần bulk operations — transfer, DNS update hàng loạt, contact
update đồng bộ — nhưng iNET portal chỉ hỗ trợ single-domain workflow. Reseller và
enterprise mất hàng giờ thực hiện thủ công từng domain một, tăng tỷ lệ lỗi và churn.

## Target User

Resellers và enterprise customers quản lý portfolio lớn (50–500 domain) — cần CSV
import, bulk action queue với preview + confirm step, và audit log chi tiết cho mỗi
operation để compliance nội bộ.

## Tech Stack

- **next.js@15** — App Router, Server Actions cho bulk mutation với progress streaming
- **typescript** — Type-safe domain operation models, CSV parser, validation pipeline
- **postgres** — Job queue cho bulk operations, audit log, rollback state

**Status:** backlog · **MVP ID:** MVP-008 · **Owner:** hobv@inet.vn
