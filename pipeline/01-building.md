# Building — MVP Đang Phát Triển

Các MVP đang được build. Cập nhật status sau mỗi Friday session.

## Bảng Theo Dõi

| ID | Tên MVP | Slug | Folder/Repo | Ngày start | Demo dự kiến | Status | Notes |
|----|---------|------|-------------|------------|--------------|--------|-------|
| MVP-001 | Domain Reputation Monitor | domain-reputation | `products/domain-reputation` | 2026-05-08 | 2026-05-29 | demo-ready | Port :9041 |
| MVP-002 | Email Auth Checker | email-auth-checker | `products/email-auth-checker` | 2026-05-08 | 2026-05-29 | demo-ready | Port :9042 |
| MVP-003 | SSL Health Dashboard | ssl-health-dashboard | `products/ssl-health-dashboard` | 2026-05-08 | 2026-05-29 | demo-ready | Port :9043 |
| MVP-004 | IP Reputation Checker | ip-reputation-checker | `products/ip-reputation-checker` | 2026-05-08 | 2026-05-29 | demo-ready | Port :9044 |

**Status hợp lệ:** `in-progress` | `blocked` | `demo-ready`

## Quy Trình

**Thêm MVP mới:**
1. Copy row template, tạo ID theo format `MVP-XXX`
2. Status ban đầu: `in-progress`
3. Tạo folder `products/mvp-{slug}/` hoặc repo riêng nếu cần

**Lifecycle trong bảng này:**
```
Backlog → [bắt đầu build] → in-progress
                          → blocked (có blocker cụ thể, ghi vào Notes)
                          → demo-ready (sẵn sàng demo Friday)
```

**Sau Friday session:**
- Nếu **Selected** → chuyển row sang [`02-selected.md`](02-selected.md)
- Nếu **Retired** → chuyển row sang [`03-retired.md`](03-retired.md)
- Nếu **Parked** → giữ nguyên ở đây, status đổi thành `blocked`, Notes ghi lý do

**Quy tắc blocked:**
- Ghi rõ blocker vào cột Notes (VD: "Chờ API key từ đội vận hành")
- Nếu blocked > 2 tuần không có update → cân nhắc đưa sang Retired

> **Lưu ý:** File này là nguồn sự thật cho trạng thái build hiện tại — cập nhật ngay sau mỗi quyết định, không để lag.
