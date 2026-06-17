# Scoring Rubric — Tiêu Chí Đánh Giá MVP

Dùng trong Friday Demo Day để stakeholders chấm điểm. Áp dụng nhất quán cho mọi MVP.

---

## Bảng Tiêu Chí

| Tiêu chí | Trọng số | Mô tả | Thang điểm 1–5 |
|----------|----------|-------|----------------|
| **Business Potential (BP)** | 30% | Doanh thu tiềm năng, market size, monetization model rõ ràng | 1 = không khả thi về doanh thu → 5 = high revenue potential, thị trường lớn |
| **Strategic Fit (SF)** | 30% | Bổ sung dịch vụ core iNET (hosting, domain, email, cloud) — không trùng lặp, không đi ngược roadmap | 1 = không liên quan đến iNET → 5 = core complement, tăng cường giá trị hệ sinh thái |
| **UX Quality (UX)** | 25% | Cạnh tranh được trên thị trường, phù hợp brand iNET, UX không gây friction | 1 = tệ, khó dùng → 5 = delightful, user muốn dùng lại |
| **Tech Fit (TF)** | 15% | Team iNET maintain được lâu dài, không over-engineer, stack quen thuộc | 1 = quá phức tạp, không ai maintain được → 5 = stack quen thuộc, dễ onboard |

---

## Công Thức Tính

```
weighted_score = 0.30 × BP + 0.30 × SF + 0.25 × UX + 0.15 × TF
```

**Ví dụ:** BP=4, SF=3, UX=4, TF=5
```
weighted_score = 0.30×4 + 0.30×3 + 0.25×4 + 0.15×5
              = 1.20 + 0.90 + 1.00 + 0.75
              = 3.85  ✓ (≥ 3.5 → đủ điều kiện Selected)
```

---

## Ngưỡng Quyết Định

| Kết quả | Điều kiện |
|---------|-----------|
| **Selected** | `weighted_score ≥ 3.5` **VÀ** có management approval |
| **Parked** | `weighted_score ≥ 3.5` nhưng chưa có management approval, hoặc cần thêm data |
| **Retired** | `weighted_score < 3.5` hoặc management quyết định không fit |

---

## Hướng Dẫn Người Chấm

**Ai chấm:** Tất cả stakeholders có mặt tại Friday Demo Day (dev, design, leadership, internal customers). Tối thiểu 3 người.

**Chấm khi nào:** Sau phần Live Demo + Q&A (bước 4 trong Demo Day format). Mỗi người chấm độc lập, không tham khảo người khác trước.

**Độ chính xác:**
- Dùng số nguyên 1–5, không dùng số thập phân khi chấm
- Nếu không đủ thông tin để chấm một tiêu chí → ghi `?` và nêu câu hỏi cần Inventor trả lời
- Tổng hợp: lấy **trung bình cộng** điểm của tất cả scorers cho từng tiêu chí, rồi tính weighted_score

**Ghi lại:** Điền vào [`evaluation/session-report-template.md`](session-report-template.md) ngay sau session.
