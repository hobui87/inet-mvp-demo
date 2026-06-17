# Retired — Sản Phẩm Đã Dừng

Lưu trữ các MVP đã được đánh giá và quyết định không phát triển tiếp. Giữ lại để tham khảo và rút kinh nghiệm.

## Bảng Theo Dõi

| ID | Tên SP | Ngày retire | Lý do | Lessons learned | Link demo cuối |
|----|--------|-------------|-------|-----------------|----------------|

> Chưa có sản phẩm nào bị Retired. Sau Friday session có quyết định Retire → thêm row vào đây.

## Khi Nào Đưa Về Đây

Một MVP được chuyển vào bảng này khi xảy ra **một trong các điều kiện** sau:

| Điều kiện | Mô tả |
|-----------|-------|
| **low score** | Weighted score < 3.5 sau Friday scoring session |
| **no fit** | Score đủ nhưng management quyết định không fit với chiến lược iNET hiện tại |
| **superseded** | Một sản phẩm khác đã cover use case này tốt hơn |
| **Parked > 6 tháng** | MVP ở trạng thái Parked trong `01-building.md` quá 6 tháng không có kế hoạch revive |

## Cách Thêm Row

1. Chuyển row từ `01-building.md` hoặc `02-selected.md` sang đây
2. Điền đủ: ngày retire, lý do (dùng keyword ở bảng trên), lessons learned ngắn gọn
3. Đảm bảo có link demo cuối (nếu đã deploy) để team có thể xem lại
4. Commit message: `chore(pipeline): retire MVP-XXX <tên> — <lý do ngắn>`

## Lưu Ý

- Retired không có nghĩa là thất bại — mỗi MVP dù retire đều để lại code, learnings, và context
- Lessons learned từ đây nên được sync vào `docs/tech-stack-catalog.md` nếu có insight về tech
- Không xóa link demo cuối — giữ để audit trail
