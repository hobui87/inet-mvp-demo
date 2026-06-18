// Builder hướng dẫn khắc phục DMARC tiếng Việt + DNS template + validation depth

const TITLE = 'DMARC (Domain-based Message Authentication)';

/**
 * @param {string} domain
 * @param {object} dmarc
 * @returns {import('./vietnamese-email-auth-remediation-guide-generator.js').RemediationSection}
 */
export function buildDmarcGuide(domain, dmarc) {
  if (!dmarc.exists) return _absentGuide(domain);

  // Lỗi cấu hình nghiêm trọng được ưu tiên cảnh báo trước policy
  if (dmarc.record_count > 1) {
    return {
      id: 'dmarc', title: TITLE, status: 'error',
      status_text: `${dmarc.record_count} bản ghi DMARC — vô hiệu hóa DMARC`,
      issues: [
        `Tìm thấy ${dmarc.record_count} bản ghi DMARC tại _dmarc.${domain}`,
        'RFC 7489 yêu cầu CHỈ 1 bản ghi DMARC — nhiều bản ghi khiến receiver bỏ qua hoàn toàn DMARC',
      ],
      steps: [
        `Vào DNS, liệt kê tất cả TXT record tại _dmarc.${domain}`,
        'Xóa các bản ghi DMARC thừa, chỉ giữ lại DUY NHẤT một bản ghi đúng',
        'Kiểm tra lại sau khi DNS propagate',
      ],
      dns_template: `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@${domain}; adkim=s; aspf=s`,
      dns_template_note: `Giữ DUY NHẤT một TXT record tại _dmarc.${domain} với nội dung trên`,
    };
  }

  if (dmarc.pct_nonsense) {
    return {
      id: 'dmarc', title: TITLE, status: 'error',
      status_text: 'DMARC pct=0 — không áp policy cho email nào',
      issues: [
        `DMARC có p=${dmarc.policy} nhưng pct=0 — không có email nào thực sự bị áp policy`,
        'Cấu hình này vô nghĩa: domain coi như không được DMARC bảo vệ',
      ],
      steps: [
        'Bỏ tag pct=0 (mặc định pct=100) hoặc đặt pct=100 để áp policy cho toàn bộ email',
        'Nếu muốn triển khai dần, dùng pct=25 rồi tăng lên 100',
      ],
      dns_template: `v=DMARC1; p=${dmarc.policy}; pct=100; rua=mailto:dmarc-reports@${domain}; adkim=s; aspf=s`,
      dns_template_note: `Cập nhật TXT record _dmarc.${domain} — bỏ pct=0`,
    };
  }

  if (dmarc.policy === 'reject') return _rejectGuide(domain, dmarc);
  if (dmarc.policy === 'quarantine') return _quarantineGuide(domain, dmarc);
  return _noneGuide(domain);
}

function _absentGuide(domain) {
  return {
    id: 'dmarc', title: TITLE, status: 'error',
    status_text: 'Chưa có DMARC record',
    issues: [
      'Domain chưa có DMARC record — không có cơ chế báo cáo khi email bị giả mạo',
      'Không có policy để hướng dẫn mail server nhận xử lý email fail SPF/DKIM',
    ],
    steps: [
      'Tạo TXT record với hostname: _dmarc (hoặc _dmarc.' + domain + ')',
      'Dán DNS template bên dưới vào trường Value/Content',
      'Bắt đầu với p=none để thu thập báo cáo trước khi enforce',
      'Sau 2-4 tuần phân tích báo cáo, nâng lên p=quarantine rồi p=reject',
    ],
    dns_template: `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}; ruf=mailto:dmarc-forensic@${domain}; adkim=r; aspf=r`,
    dns_template_note: `Hostname của record này là: _dmarc.${domain}\nThay email rua/ruf bằng địa chỉ email bạn muốn nhận báo cáo\nLộ trình khuyến nghị:\n1. p=none → Theo dõi 2-4 tuần\n2. p=quarantine; pct=25 → Tăng dần lên 100\n3. p=reject → Bảo vệ hoàn toàn`,
  };
}

function _rejectGuide(domain, dmarc) {
  const issues = [];
  if (!dmarc.rua) issues.push('Chưa có rua= để nhận báo cáo tổng hợp');
  return {
    id: 'dmarc', title: TITLE,
    status: issues.length ? 'warning' : 'ok',
    status_text: 'DMARC reject — bảo vệ tối đa',
    issues,
    steps: issues.length
      ? ['Thêm rua=mailto:dmarc-reports@' + domain + ' vào DMARC record để nhận báo cáo']
      : ['Không cần hành động. DMARC đang ở mức bảo vệ cao nhất (p=reject).'],
    dns_template: issues.length
      ? `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@${domain}; adkim=s; aspf=s`
      : null,
    dns_template_note: issues.length ? `Cập nhật TXT record _dmarc.${domain} với nội dung trên` : null,
  };
}

function _quarantineGuide(domain, dmarc) {
  return {
    id: 'dmarc', title: TITLE, status: 'warning',
    status_text: 'DMARC quarantine — chưa ở mức tối đa',
    issues: ['DMARC p=quarantine chỉ đưa email giả mạo vào spam, chưa từ chối hoàn toàn'],
    steps: [
      'Kiểm tra báo cáo DMARC (rua) để đảm bảo không có email hợp lệ bị ảnh hưởng',
      'Nâng pct từ ' + (dmarc.pct ?? 100) + '% lên 100% nếu chưa đạt',
      'Sau khi pct=100 ổn định, đổi p=quarantine thành p=reject',
    ],
    dns_template: `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@${domain}; adkim=s; aspf=s`,
    dns_template_note: `Cập nhật TXT record _dmarc.${domain} khi sẵn sàng nâng lên reject`,
  };
}

function _noneGuide(domain) {
  return {
    id: 'dmarc', title: TITLE, status: 'warning',
    status_text: 'DMARC p=none — chỉ theo dõi, chưa bảo vệ',
    issues: [
      'DMARC p=none không chặn email giả mạo — chỉ gửi báo cáo',
      'Domain vẫn có thể bị spoofing dù đã có DMARC record',
    ],
    steps: [
      'Phân tích báo cáo rua (nếu đã cấu hình) để xác định tất cả nguồn gửi mail hợp lệ',
      'Đảm bảo SPF và DKIM đã đúng cho tất cả server gửi mail',
      'Nâng lên p=quarantine; pct=25 và tăng dần',
      'Mục tiêu cuối: p=reject; pct=100',
    ],
    dns_template: `v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc-reports@${domain}; adkim=r; aspf=r`,
    dns_template_note: `Cập nhật TXT record _dmarc.${domain} — bắt đầu với pct=25 để test trước`,
  };
}
