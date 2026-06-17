# Backlog — Ý Tưởng Chưa Build

Nơi capture mọi ý tưởng raw. Chưa cam kết build — chỉ cần đủ rõ để đánh giá tiếp sau.

## Ý Tưởng

| ID | Ý tưởng | Problem solve | Target user | Tech stack dự kiến | Ngày thêm | Ghi chú |
|----|---------|---------------|-------------|-------------------|-----------|---------|
| BL-001 | Domain Bulk Manager | Quản lý hàng loạt domain (renew, DNS, transfer) cho reseller và enterprise không có giao diện batch | Reseller, Enterprise iNET | Node.js, REST API, React table | 2026-05-22 | Đang thăm dò nhu cầu với sales team |

## Cách Dùng

**Thêm ý tưởng mới:**
1. Tạo ID theo format `BL-XXX` (tăng dần)
2. Điền đủ 7 cột — cột "Tech stack dự kiến" có thể bỏ trống nếu chưa rõ
3. Commit message: `feat(pipeline): add BL-XXX <tên ý tưởng> to backlog`

**Chuyển sang Building:**
- Khi quyết định bắt đầu build → di chuyển row sang [`01-building.md`](01-building.md)
- Xóa row khỏi bảng này, thêm ghi chú "→ Building YYYY-MM-DD" vào cột "Ghi chú" trước khi xóa (để git history dễ trace)

**Tiêu chí đưa vào Backlog:**
- Có thể mô tả vấn đề trong 1 câu
- Xác định được target user cụ thể
- Không cần có giải pháp hoàn chỉnh

> **Lưu ý:** Tránh commit thông tin nhạy cảm (tên khách hàng cụ thể, doanh thu thực tế) — dùng placeholder.
