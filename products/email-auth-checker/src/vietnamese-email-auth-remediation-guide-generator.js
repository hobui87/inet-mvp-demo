// Tạo hướng dẫn fix tiếng Việt kèm DNS record template copy-paste cho SPF/DKIM/DMARC

/**
 * @typedef {Object} RemediationSection
 * @property {string} id - 'spf' | 'dkim' | 'dmarc'
 * @property {string} title
 * @property {'ok'|'warning'|'error'} status
 * @property {string} status_text - Mô tả ngắn trạng thái tiếng Việt
 * @property {string[]} issues - Danh sách vấn đề phát hiện
 * @property {string[]} steps - Các bước khắc phục
 * @property {string|null} dns_template - DNS record mẫu để copy-paste
 * @property {string|null} dns_template_note - Ghi chú thêm về template
 */

/**
 * Tạo hướng dẫn khắc phục đầy đủ tiếng Việt.
 * @param {string} domain
 * @param {object} spf
 * @param {object} dkim
 * @param {object} dmarc
 * @returns {RemediationSection[]}
 */
export function generateRemediationGuide(domain, spf, dkim, dmarc) {
  return [
    _buildSpfGuide(domain, spf),
    _buildDkimGuide(domain, dkim),
    _buildDmarcGuide(domain, dmarc),
  ];
}

// ── SPF Guide ──────────────────────────────────────────────

function _buildSpfGuide(domain, spf) {
  if (!spf.exists) {
    return {
      id: 'spf',
      title: 'SPF (Sender Policy Framework)',
      status: 'error',
      status_text: 'Chưa có SPF record',
      issues: ['Domain chưa có SPF record — bất kỳ ai cũng có thể giả mạo email từ ' + domain],
      steps: [
        'Đăng nhập vào trang quản lý DNS của domain (Cloudflare, cPanel, iNET DNS Manager…)',
        'Tạo một TXT record mới với hostname là @ (hoặc để trống)',
        'Dán nội dung DNS template bên dưới vào trường Value/Content',
        'Lưu lại và chờ 5-30 phút để DNS propagate',
        'Kiểm tra lại bằng cách nhập domain vào tool này',
      ],
      dns_template: `v=spf1 include:_spf.google.com include:sendgrid.net ~all`,
      dns_template_note: `Thay thế các "include:" phù hợp với email provider bạn đang dùng:\n• Google Workspace: include:_spf.google.com\n• Microsoft 365: include:spf.protection.outlook.com\n• Zoho: include:zoho.com\n• Nhà cung cấp khác: xem tài liệu của họ\nĐổi ~all thành -all khi đã xác nhận cấu hình đúng`,
    };
  }

  const issues = [];
  const steps = [];

  if (spf.policy === 'softfail') {
    issues.push('SPF đang dùng ~all (softfail) — email giả mạo chỉ bị đánh dấu, không bị từ chối');
    steps.push('Thay ~all bằng -all trong SPF record để từ chối hoàn toàn email giả mạo');
    steps.push('Trước khi đổi sang -all, hãy đảm bảo tất cả server gửi mail đều đã được liệt kê trong record');
  }
  if (spf.policy === 'neutral') {
    issues.push('SPF đang dùng ?all (neutral) — không có tác dụng bảo vệ');
    steps.push('Thay ?all bằng -all (hoặc ít nhất là ~all) để bật bảo vệ');
  }
  if (spf.too_many_lookups) {
    issues.push(`SPF có ${spf.lookup_count} DNS lookups (vượt giới hạn 10) — có thể gây lỗi "SPF PermError"`);
    steps.push('Gộp nhiều include: thành ít hơn bằng cách dùng dịch vụ như dmarcian.com/spf-survey hoặc mxtoolbox.com/spf');
    steps.push('Hoặc dùng ip4:/ip6: trực tiếp thay vì include: cho các IP cố định');
  }

  if (issues.length === 0) {
    return {
      id: 'spf',
      title: 'SPF (Sender Policy Framework)',
      status: 'ok',
      status_text: 'SPF được cấu hình tốt',
      issues: [],
      steps: ['Không cần hành động. SPF record đang hoạt động đúng với policy ' + spf.policy + '.'],
      dns_template: null,
      dns_template_note: null,
    };
  }

  // Tạo template cải thiện từ record hiện tại
  const improved = spf.record ? spf.record.replace(/[~?+]?all$/i, '-all') : null;

  return {
    id: 'spf',
    title: 'SPF (Sender Policy Framework)',
    status: spf.policy === 'softfail' ? 'warning' : 'error',
    status_text: spf.policy === 'softfail' ? 'SPF softfail (~all)' : spf.policy === 'neutral' ? 'SPF neutral (?all)' : 'SPF có vấn đề',
    issues,
    steps,
    dns_template: improved,
    dns_template_note: 'Đây là SPF record hiện tại của bạn đã được cải thiện. Cập nhật TXT record @ với nội dung trên.',
  };
}

// ── DKIM Guide ─────────────────────────────────────────────

function _buildDkimGuide(domain, dkim) {
  if (dkim.exists) {
    return {
      id: 'dkim',
      title: 'DKIM (DomainKeys Identified Mail)',
      status: 'ok',
      status_text: `DKIM đang hoạt động (selector: ${dkim.selectors_found.join(', ')})`,
      issues: [],
      steps: ['Không cần hành động. DKIM đã được cấu hình đúng.'],
      dns_template: null,
      dns_template_note: null,
    };
  }

  return {
    id: 'dkim',
    title: 'DKIM (DomainKeys Identified Mail)',
    status: 'error',
    status_text: 'Không tìm thấy DKIM record',
    issues: [
      'Không tìm thấy DKIM record với 8 selector phổ biến (default, google, k1, s1, selector1, selector2, mail, smtp)',
      'Email từ domain có thể bị từ chối hoặc vào spam vì thiếu chữ ký số',
      'Lưu ý: domain có thể dùng selector tùy chỉnh không nằm trong danh sách kiểm tra',
    ],
    steps: [
      'Liên hệ nhà cung cấp email/hosting để lấy thông tin DKIM key và selector name',
      'Google Workspace: Admin Console → Apps → Gmail → Authenticate email → Generate key',
      'Microsoft 365: Admin Center → Settings → Domains → chọn domain → DKIM tab',
      'Hosting cPanel: Email → Email Deliverability → Manage → Install DKIM',
      'Tạo TXT record theo hướng dẫn của nhà cung cấp, format như DNS template bên dưới',
    ],
    dns_template: `[selector]._domainkey.${domain}  TXT  "v=DKIM1; k=rsa; p=<PUBLIC_KEY_FROM_PROVIDER>"`,
    dns_template_note: 'Thay [selector] bằng tên selector từ nhà cung cấp (vd: google, default, s1…)\nThay <PUBLIC_KEY_FROM_PROVIDER> bằng public key thực tế được cung cấp',
  };
}

// ── DMARC Guide ────────────────────────────────────────────

function _buildDmarcGuide(domain, dmarc) {
  if (!dmarc.exists) {
    return {
      id: 'dmarc',
      title: 'DMARC (Domain-based Message Authentication)',
      status: 'error',
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

  if (dmarc.policy === 'reject') {
    const issues = [];
    if (!dmarc.rua) issues.push('Chưa có rua= để nhận báo cáo tổng hợp');
    return {
      id: 'dmarc',
      title: 'DMARC (Domain-based Message Authentication)',
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

  if (dmarc.policy === 'quarantine') {
    return {
      id: 'dmarc',
      title: 'DMARC (Domain-based Message Authentication)',
      status: 'warning',
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

  // policy = 'none'
  return {
    id: 'dmarc',
    title: 'DMARC (Domain-based Message Authentication)',
    status: 'warning',
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
