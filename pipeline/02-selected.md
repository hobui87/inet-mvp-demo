# Selected — Sản Phẩm Được Chọn Phát Triển Tiếp

Các MVP đã qua Friday session, đạt ngưỡng scoring và được management approve để phát triển thành sản phẩm thực sự.

## Bảng Theo Dõi

| ID | Tên SP | Ngày chọn | Score | Người sponsor | Repo URL | Phase phát triển | Doanh thu MTD |
|----|--------|-----------|-------|---------------|----------|-----------------|---------------|

> Chưa có sản phẩm nào được Selected. Sau Friday session đầu tiên có kết quả → thêm row vào đây.

## Tiêu Chí Để Vào Bảng Này

Một MVP được chuyển vào đây khi **đồng thời** thỏa mãn:

1. **Weighted score ≥ 3.5/5** theo [`evaluation/scoring-rubric.md`](../evaluation/scoring-rubric.md)
2. **Management approval** — có ít nhất 1 decision maker xác nhận chọn (ghi tên vào cột "Người sponsor")

Nếu score ≥ 3.5 nhưng chưa có management approval → trạng thái là **Parked** (giữ ở [`01-building.md`](01-building.md)).

## Phase Phát Triển Hợp Lệ

| Phase | Ý nghĩa |
|-------|---------|
| `scaling` | Đang mở rộng tính năng, onboard thêm user |
| `GA` | General Availability — sản phẩm stable, đang vận hành chính thức |
| `sunset` | Lên kế hoạch ngừng, đang migrate user |

## Lưu Ý

- Cột "Doanh thu MTD" cập nhật cuối mỗi tháng — dùng placeholder nếu chưa có số thực
- Không commit doanh thu thực tế của khách hàng cụ thể — chỉ aggregate
- Khi sản phẩm chuyển sang `sunset` hoàn toàn → xem xét chuyển sang [`03-retired.md`](03-retired.md)
