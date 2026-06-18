// Trích selector (s=) và domain (d=) từ raw DKIM-Signature header người dùng paste vào.
// Cách đáng tin nhất để tìm DKIM cho domain dùng token selector ngẫu nhiên (SES/Brevo/Mailchimp).

const MAX_HEADER_LENGTH = 4096; // chống abuse input lớn
const SELECTOR_CHARSET = /^[a-z0-9._-]{1,128}$/i;
const DOMAIN_CHARSET = /^[a-z0-9.-]{1,253}$/i;

/**
 * @typedef {Object} ParsedDkimHeader
 * @property {string|null} selector - giá trị s=
 * @property {string|null} domain - giá trị d=
 */

/**
 * Parse raw DKIM-Signature header, trích s= và d=.
 * @param {string} raw - nội dung header (có thể có/không prefix "DKIM-Signature:")
 * @returns {ParsedDkimHeader|null} null nếu không có selector hợp lệ
 */
export function parseDkimHeader(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const text = raw.slice(0, MAX_HEADER_LENGTH);

  const selector = _extractTag(text, 's');
  const domain = _extractTag(text, 'd');

  const validSelector = selector && SELECTOR_CHARSET.test(selector) ? selector : null;
  const validDomain = domain && DOMAIN_CHARSET.test(domain) ? domain.toLowerCase() : null;

  if (!validSelector) return null;
  return { selector: validSelector, domain: validDomain };
}

/**
 * Trích giá trị 1 tag DKIM (vd s=, d=). Tag cách nhau bằng ';', value tới ';' hoặc khoảng trắng.
 * @param {string} text
 * @param {string} tag - tên tag 1 ký tự
 * @returns {string|null}
 */
function _extractTag(text, tag) {
  // \b<tag>\s*=\s*<value> — value không chứa ; hoặc whitespace
  const re = new RegExp(`(?:^|[;\\s])${tag}\\s*=\\s*([^;\\s]+)`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}
