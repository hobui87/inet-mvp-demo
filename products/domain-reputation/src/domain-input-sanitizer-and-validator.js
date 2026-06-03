// Chuẩn hoá + validate domain đầu vào trước khi query blocklist
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
// IP address phải bị reject — DNSBL chỉ hỗ trợ domain name, không phải IP notation
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Loại bỏ protocol, trailing slash, lowercase → validate regex.
 * @param {string} input
 * @returns {string} domain đã chuẩn hoá
 * @throws {ValidationError}
 */
export function sanitizeAndValidateDomain(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new ValidationError('Domain không được để trống');
  }

  let domain = input.trim().toLowerCase();
  // Strip protocol
  domain = domain.replace(/^https?:\/\//i, '');
  // Strip path, query, hash
  domain = domain.split('/')[0].split('?')[0].split('#')[0];

  if (IP_REGEX.test(domain)) {
    throw new ValidationError(`"${domain}" là địa chỉ IP, vui lòng nhập tên miền`);
  }

  if (!DOMAIN_REGEX.test(domain)) {
    throw new ValidationError(`"${domain}" không phải domain hợp lệ`);
  }

  return domain;
}
