// Builder hướng dẫn khắc phục SPF tiếng Việt + DNS template copy-paste

/**
 * @param {string} domain
 * @param {object} spf
 * @returns {import('./vietnamese-email-auth-remediation-guide-generator.js').RemediationSection}
 */
export function buildSpfGuide(domain, spf) {
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
