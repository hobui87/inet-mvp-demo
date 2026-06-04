// Validate và normalize IPv4/IPv6 đầu vào — từ chối private/reserved IPs
// Hỗ trợ cả IP trực tiếp lẫn domain name thông qua validateAndNormalizeInput

import { isIPv4, isIPv6 } from 'node:net';

export class ValidationError extends Error {}

// Private + reserved ranges — RBL query với các IP này vô nghĩa và có thể gây DNS leak
const PRIVATE_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,           // link-local
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,     // ULA IPv6
  /^fe80:/i,               // link-local IPv6
];

export function isPrivateIp(ip) {
  return PRIVATE_PATTERNS.some(re => re.test(ip));
}

// Domain hợp lệ: 3–253 ký tự, có ít nhất 1 dấu chấm, không phải IP
function isValidDomain(raw) {
  if (raw.length < 3 || raw.length > 253) return false;
  if (isIPv4(raw) || isIPv6(raw)) return false;
  return /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)+$/.test(raw);
}

/**
 * Validate và normalize IP đầu vào. Giữ nguyên cho backward compat.
 * @param {unknown} raw
 * @returns {string} normalized IP
 * @throws {ValidationError}
 */
export function validateAndNormalizeIp(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ValidationError('Vui lòng nhập địa chỉ IP');
  }

  const ip = raw.trim().toLowerCase();

  if (!isIPv4(ip) && !isIPv6(ip)) {
    throw new ValidationError(`"${raw.trim()}" không phải địa chỉ IP hợp lệ`);
  }

  if (isPrivateIp(ip)) {
    throw new ValidationError('IP private/reserved không được phép kiểm tra');
  }

  return ip;
}

/**
 * Phân biệt IP vs domain từ input thô.
 * @param {unknown} raw
 * @returns {{ type: 'ip', value: string } | { type: 'domain', value: string }}
 * @throws {ValidationError}
 */
export function validateAndNormalizeInput(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new ValidationError('Vui lòng nhập địa chỉ IP hoặc domain');
  }

  const value = raw.trim().toLowerCase();

  if (isIPv4(value) || isIPv6(value)) {
    if (isPrivateIp(value)) {
      throw new ValidationError('IP private/reserved không được phép kiểm tra');
    }
    return { type: 'ip', value };
  }

  if (isValidDomain(raw.trim())) {
    return { type: 'domain', value: raw.trim().toLowerCase() };
  }

  throw new ValidationError(`"${raw.trim()}" không phải địa chỉ IP hoặc domain hợp lệ`);
}
