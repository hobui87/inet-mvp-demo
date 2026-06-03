// Validate và sanitize domain input trước khi thực hiện DNS lookup
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Chuẩn hoá và validate domain đầu vào.
 * Strip protocol, path, query → lowercase → validate regex.
 * @param {string} input
 * @returns {string} domain đã chuẩn hoá
 * @throws {ValidationError}
 */
export function validateDomain(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new ValidationError('Domain không được để trống');
  }

  let domain = input.trim().toLowerCase();
  // Strip protocol
  domain = domain.replace(/^https?:\/\//i, '');
  // Strip path, query, hash
  domain = domain.split('/')[0].split('?')[0].split('#')[0];
  // Strip trailing dot
  domain = domain.replace(/\.$/, '');

  if (IP_REGEX.test(domain)) {
    throw new ValidationError(`"${domain}" là địa chỉ IP, vui lòng nhập tên miền`);
  }

  if (!DOMAIN_REGEX.test(domain)) {
    throw new ValidationError(`"${domain}" không phải tên miền hợp lệ`);
  }

  if (domain.length > 253) {
    throw new ValidationError('Tên miền quá dài (tối đa 253 ký tự)');
  }

  return domain;
}
