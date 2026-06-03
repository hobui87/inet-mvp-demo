// Lookup DKIM public key bằng cách thử 8 common selectors qua DNS TXT records
import dns from 'node:dns/promises';

const COMMON_SELECTORS = ['default', 'google', 'k1', 's1', 'selector1', 'selector2', 'mail', 'smtp'];

/**
 * @typedef {Object} DkimResult
 * @property {boolean} exists - Có tìm thấy ít nhất 1 DKIM selector không
 * @property {string[]} selectors_found - Danh sách selectors tìm thấy
 * @property {string[]} selectors_checked - Toàn bộ selectors đã thử
 * @property {string|null} public_key_snippet - Đoạn đầu public key (nếu có)
 * @property {string|null} error - Lỗi nếu có
 */

/**
 * Thử lookup 8 common DKIM selectors cho domain.
 * Format: {selector}._domainkey.{domain}
 * @param {string} domain
 * @returns {Promise<DkimResult>}
 */
export async function checkDkimSelectors(domain) {
  const results = await Promise.allSettled(
    COMMON_SELECTORS.map(async (selector) => {
      const host = `${selector}._domainkey.${domain}`;
      try {
        const records = await dns.resolveTxt(host);
        const flat = records.map(chunks => chunks.join(''));
        const dkimRecord = flat.find(r => r.includes('p=') || r.startsWith('v=DKIM1'));
        return { selector, found: !!dkimRecord, record: dkimRecord ?? null };
      } catch {
        return { selector, found: false, record: null };
      }
    })
  );

  const checked = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { selector: COMMON_SELECTORS[i], found: false, record: null }
  );

  const found = checked.filter(r => r.found);
  const selectors_found = found.map(r => r.selector);

  // Lấy snippet public key từ selector đầu tiên tìm thấy
  let public_key_snippet = null;
  if (found.length > 0 && found[0].record) {
    const match = found[0].record.match(/p=([A-Za-z0-9+/=]{8,})/);
    if (match) public_key_snippet = match[1].slice(0, 32) + '…';
  }

  return {
    exists: found.length > 0,
    selectors_found,
    selectors_checked: COMMON_SELECTORS,
    public_key_snippet,
    error: null,
  };
}
