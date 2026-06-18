// Phân tích CHẤT LƯỢNG public key DKIM từ raw TXT record (không chỉ "tồn tại").
// Pure function, không query DNS. Dùng node:crypto để lấy chính xác key bits/type, fallback ước lượng.
import { createPublicKey } from 'node:crypto';

/**
 * @typedef {Object} DkimKeyAnalysis
 * @property {'rsa'|'ed25519'|'unknown'} key_type
 * @property {number|null} key_bits - số bit modulus (RSA); null nếu không tính được
 * @property {boolean} revoked - p= rỗng => key đã thu hồi
 * @property {boolean} test_mode - t=y => đang ở chế độ test
 * @property {string[]} warnings - cảnh báo tiếng Việt
 */

/**
 * Phân tích raw DKIM TXT record.
 * @param {string} record
 * @returns {DkimKeyAnalysis}
 */
export function analyzeDkimKey(record) {
  const warnings = [];
  const tags = _parseTags(record);
  const kTag = (tags.k || 'rsa').toLowerCase();
  const tTag = (tags.t || '').toLowerCase();
  const p = tags.p ?? '';

  const revoked = p.trim() === '';
  const test_mode = tTag.split(':').includes('y');

  let key_type = kTag === 'ed25519' ? 'ed25519' : (kTag === 'rsa' ? 'rsa' : 'unknown');
  let key_bits = null;

  if (revoked) {
    warnings.push('Public key rỗng (p=) — key đã bị thu hồi, DKIM không hoạt động.');
  } else {
    const detail = _inspectKey(p);
    if (detail.key_type) key_type = detail.key_type;
    key_bits = detail.key_bits;

    if (key_type === 'rsa' && key_bits !== null) {
      if (key_bits < 1024) warnings.push(`Key RSA quá yếu (${key_bits}-bit) — dễ bị bẻ khóa, cần nâng lên 2048-bit.`);
      else if (key_bits < 2048) warnings.push(`Key RSA ${key_bits}-bit — nên nâng lên 2048-bit để an toàn hơn.`);
    }
  }

  if (test_mode) warnings.push('DKIM đang ở chế độ test (t=y) — receiver có thể bỏ qua kết quả xác thực.');

  return { key_type, key_bits, revoked, test_mode, warnings };
}

/** Dùng crypto lấy chính xác key_bits/type; fallback ước lượng từ độ dài DER. */
function _inspectKey(p) {
  try {
    const der = Buffer.from(p, 'base64');
    const key = createPublicKey({ key: der, format: 'der', type: 'spki' });
    const type = key.asymmetricKeyType; // 'rsa' | 'ed25519' | ...
    if (type === 'rsa') {
      return { key_type: 'rsa', key_bits: key.asymmetricKeyDetails?.modulusLength ?? null };
    }
    if (type === 'ed25519') return { key_type: 'ed25519', key_bits: 256 };
    return { key_type: 'unknown', key_bits: null };
  } catch {
    return { key_type: null, key_bits: _estimateRsaBits(p) };
  }
}

/** Ước lượng bit RSA từ độ dài byte DER (chỉ dùng khi crypto fail). */
function _estimateRsaBits(p) {
  try {
    const len = Buffer.from(p, 'base64').length;
    if (len < 150) return 512;
    if (len < 200) return 1024;
    if (len < 400) return 2048;
    return 4096;
  } catch {
    return null;
  }
}

/** Parse DKIM tag=value pairs (tách bằng ';'). */
function _parseTags(record) {
  const tags = {};
  String(record ?? '').split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k) tags[k] = v;
    }
  });
  return tags;
}
