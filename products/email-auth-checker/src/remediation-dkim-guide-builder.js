// Builder hướng dẫn khắc phục DKIM tiếng Việt — xử lý 3-state + cảnh báo chất lượng key

const TITLE = 'DKIM (DomainKeys Identified Mail)';

/**
 * @param {string} domain
 * @param {object} dkim
 * @returns {import('./vietnamese-email-auth-remediation-guide-generator.js').RemediationSection}
 */
export function buildDkimGuide(domain, dkim) {
  const status = dkim.status ?? (dkim.exists ? 'found' : 'inconclusive');

  if (status === 'found') return _foundGuide(dkim);
  if (status === 'inconclusive') return _inconclusiveGuide(domain, dkim);
  return _absentGuide(domain, dkim);
}

/** DKIM tìm thấy — kiểm tra chất lượng key (revoked / RSA yếu / test mode). */
function _foundGuide(dkim) {
  const issues = [];
  const steps = [];

  if (dkim.revoked) {
    issues.push('Public key DKIM rỗng (p=) — key đã bị thu hồi, chữ ký DKIM không còn hiệu lực');
    steps.push('Tạo lại cặp khóa DKIM mới từ email provider và cập nhật public key vào DNS');
  }
  if (dkim.key_type === 'rsa' && typeof dkim.key_bits === 'number' && dkim.key_bits < 2048) {
    issues.push(`Key RSA ${dkim.key_bits}-bit yếu — nên nâng lên tối thiểu 2048-bit`);
    steps.push('Yêu cầu provider tạo lại DKIM key 2048-bit và thay public key trong TXT record');
  }
  if (dkim.test_mode) {
    issues.push('DKIM đang ở chế độ test (t=y) — nhiều receiver sẽ bỏ qua kết quả xác thực');
    steps.push('Gỡ tag t=y khỏi DKIM record khi đã xác nhận cấu hình hoạt động đúng');
  }

  if (issues.length === 0) {
    return {
      id: 'dkim', title: TITLE, status: 'ok',
      status_text: `DKIM đang hoạt động (selector: ${dkim.selectors_found.join(', ')})`,
      issues: [], steps: ['Không cần hành động. DKIM đã được cấu hình đúng.'],
      dns_template: null, dns_template_note: null,
    };
  }

  return {
    id: 'dkim', title: TITLE, status: dkim.revoked ? 'error' : 'warning',
    status_text: dkim.revoked ? 'DKIM key đã bị thu hồi' : 'DKIM hoạt động nhưng cần cải thiện',
    issues, steps, dns_template: null, dns_template_note: null,
  };
}

/** DKIM chưa xác định — hướng dẫn nhập selector thủ công. */
function _inconclusiveGuide(domain, dkim) {
  return {
    id: 'dkim', title: TITLE, status: 'warning',
    status_text: 'Chưa xác định được DKIM',
    issues: [
      `Đã thử ${dkim.selectors_checked.length} selector phổ biến nhưng không tìm thấy DKIM`,
      'Domain có thể dùng selector riêng (vd Amazon SES, Brevo, Mailchimp dùng selector ngẫu nhiên) — chưa thể kết luận là thiếu DKIM',
    ],
    steps: [
      'Mở một email đã gửi từ domain này, xem phần "Show original"/header gốc',
      'Tìm dòng DKIM-Signature và lấy giá trị s= (đó là selector)',
      'Dán selector hoặc cả header vào mục "Nâng cao" của tool rồi kiểm tra lại',
      'Hoặc hỏi nhà cung cấp email về selector DKIM đang dùng',
    ],
    dns_template: null, dns_template_note: null,
  };
}

/** DKIM xác nhận không tồn tại (user đã nhập selector mà vẫn miss). */
function _absentGuide(domain, dkim) {
  return {
    id: 'dkim', title: TITLE, status: 'error',
    status_text: 'Không tìm thấy DKIM (đã xác nhận)',
    issues: [
      `Selector "${dkim.selectors_checked.join(', ')}" không có DKIM record cho domain này`,
      'Email từ domain có thể bị từ chối hoặc vào spam vì thiếu chữ ký số',
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
