# N5 Domain Reputation Monitor — Demo Domains, Expected Scores & Presentation Script

## 3 Demo Domain (Chip Presets)

Các domain này có **override cứng** trong `src/blocklist-config.js` → kết quả hoàn toàn nhất quán khi demo.

### 1. `inet.vn` — Score 100 (Clean)

| Blocklist | Listed | Weight |
|-----------|--------|--------|
| Spamhaus DBL | ✗ | 30 |
| Google Safe Browsing | ✗ | 25 |
| SURBL | ✗ | 15 |
| Barracuda | ✗ | 15 |
| PhishTank | ✗ | 10 |
| MXToolbox / JunkEmail | ✗ | 5 |

**Score**: 100 · **Grade**: Clean · **Circle color**: Xanh `#16a34a`

---

### 2. `suspicious.info` — Score 70 (Moderate Risk)

| Blocklist | Listed | Weight |
|-----------|--------|--------|
| **Spamhaus DBL** | **✓** | **30** |
| Google Safe Browsing | ✗ | 25 |
| SURBL | ✗ | 15 |
| Barracuda | ✗ | 15 |
| PhishTank | ✗ | 10 |
| MXToolbox / JunkEmail | ✗ | 5 |

**Score**: 100 − 30 = **70** · **Grade**: Moderate Risk · **Circle color**: Vàng `#d97706`

---

### 3. `known-phishing.net` — Score 30 (High Risk)

| Blocklist | Listed | Weight |
|-----------|--------|--------|
| **Spamhaus DBL** | **✓** | **30** |
| **Google Safe Browsing** | **✓** | **25** |
| SURBL | ✗ | 15 |
| **Barracuda** | **✓** | **15** |
| PhishTank | ✗ | 10 |
| MXToolbox / JunkEmail | ✗ | 5 |

**Score**: 100 − 30 − 25 − 15 = **30** · **Grade**: High Risk · **Circle color**: Đỏ `#dc2626`

---

## Kịch bản Demo (3 phút)

```
[Slide 1 — Mở URL sạch]
Mở: http://localhost:9041/?domain=inet.vn
→ "Đây là inet.vn của chúng ta. Score 100 — hoàn toàn sạch, không có blocklist nào list."
→ Chỉ vào circle xanh + action box.

[Slide 2 — Domain đáng ngờ]
Click chip "suspicious.info"
→ "Domain này bị Spamhaus DBL list — mất 30 điểm, xuống 70. Vẫn hoạt động được nhưng cần theo dõi."
→ Chỉ vào card Spamhaus màu đỏ trong grid.

[Slide 3 — Domain nguy hiểm]
Click chip "known-phishing.net"
→ "Domain này bị 3 blocklist cùng lúc — score 30, màu đỏ. Hệ thống mail của người nhận sẽ reject thẳng."
→ Chỉ vào 3 card listed, action box đỏ.

[Q&A note]
"GSB và PhishTank hiện đang mock — badge [mock] trong UI. v2 sẽ tích hợp API thật."
```

## Shareable URLs (gửi team trước demo)

```
http://localhost:9041/?domain=inet.vn
http://localhost:9041/?domain=suspicious.info
http://localhost:9041/?domain=known-phishing.net
```

## Override Config (tham khảo)

Xem: `../src/blocklist-config.js` → `DEMO_DOMAIN_OVERRIDES`

Nếu muốn thêm domain demo khác, thêm entry mới theo pattern:

```js
'my-demo.test': [
  { listed: false, demo: true },  // Spamhaus DBL    weight 30
  { listed: true,  demo: true },  // Google Safe Browsing weight 25
  { listed: false, demo: true },  // SURBL            weight 15
  { listed: false, demo: true },  // Barracuda        weight 15
  { listed: false, demo: true },  // PhishTank        weight 10
  { listed: false, demo: true },  // JunkEmail        weight 5
],
// Score = 100 - 25 = 75 (Moderate)
```
