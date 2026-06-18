// Lookup DKIM public key qua DNS TXT. Brute-force selector đã kiểm chứng, ưu tiên theo MX provider.
// Trả 3 trạng thái: found / inconclusive / absent (absent chỉ khi user nhập selector mà vẫn miss).
import dns from 'node:dns/promises';
import { createRequire } from 'node:module';
import { detectProviderFromMx, prioritizedSelectors } from './mx-provider-selector-mapping.js';
import { analyzeDkimKey } from './dkim-public-key-analyzer.js';

const require = createRequire(import.meta.url);
const SELECTOR_DATA = require('./dkim-common-selectors.json');

const SELECTOR_CHARSET = /^[a-z0-9._-]{1,128}$/i;

/**
 * @typedef {Object} DkimResult
 * @property {'found'|'inconclusive'|'absent'} status - Trạng thái 3-state
 * @property {boolean} exists - Tương thích ngược (= status === 'found')
 * @property {string[]} selectors_found - Selector tìm thấy
 * @property {string[]} selectors_checked - Selector đã thử
 * @property {string|null} public_key_snippet - Đoạn đầu public key (tương thích ngược)
 * @property {Array<{selector:string, record:string}>} public_key_records - Raw record cho phase 03 parse
 * @property {'common-list'|'mx-provider'|'user-selector'} source - Nguồn selector
 * @property {'rsa'|'ed25519'|'unknown'|null} key_type - Loại key (selector found đầu tiên)
 * @property {number|null} key_bits - Số bit key
 * @property {boolean} revoked - Key bị thu hồi (p= rỗng)
 * @property {boolean} test_mode - DKIM ở chế độ test (t=y)
 * @property {string[]} warnings - Cảnh báo chất lượng key
 * @property {string|null} warning - Cảnh báo ngữ cảnh (vd d= mismatch từ header), set ở API layer
 * @property {string|null} error
 */

/**
 * Kiểm tra DKIM cho domain. Format host: {selector}._domainkey.{domain}
 * @param {string} domain
 * @param {{ selector?: string }} [options] - selector override (user nhập tay / từ header). Miss -> absent.
 * @returns {Promise<DkimResult>}
 */
export async function checkDkimSelectors(domain, options = {}) {
  const override = options.selector && SELECTOR_CHARSET.test(options.selector)
    ? options.selector.trim()
    : null;

  // Xác định danh sách selector + source
  let selectors;
  let source;
  if (override) {
    selectors = [override];
    source = 'user-selector';
  } else {
    const mxHosts = await _resolveMxHosts(domain);
    const provider = detectProviderFromMx(mxHosts);
    selectors = prioritizedSelectors(provider, SELECTOR_DATA);
    source = provider ? 'mx-provider' : 'common-list';
  }

  const checked = await _querySelectors(domain, selectors);
  const found = checked.filter(r => r.found && r.record);
  const selectors_found = found.map(r => r.selector);
  const public_key_records = found.map(r => ({ selector: r.selector, record: r.record }));

  // 3-state: found nếu có record; nếu override (user-selector) miss -> absent; còn lại -> inconclusive
  let status;
  if (found.length > 0) status = 'found';
  else if (override) status = 'absent';
  else status = 'inconclusive';

  // Phân tích chất lượng key của selector found đầu tien (phase 03)
  let public_key_snippet = null;
  let key_type = null, key_bits = null, revoked = false, test_mode = false, warnings = [];
  if (found.length > 0) {
    const match = found[0].record.match(/p=([A-Za-z0-9+/=]{8,})/);
    if (match) public_key_snippet = match[1].slice(0, 32) + '…';
    const analysis = analyzeDkimKey(found[0].record);
    ({ key_type, key_bits, revoked, test_mode, warnings } = analysis);
  }

  return {
    status,
    exists: status === 'found',
    selectors_found,
    selectors_checked: selectors,
    public_key_snippet,
    public_key_records,
    source,
    key_type,
    key_bits,
    revoked,
    test_mode,
    warnings,
    warning: null,
    error: null,
  };
}

/** Resolve MX hostnames, im lặng nếu lỗi (domain không có MX vẫn check DKIM được). */
async function _resolveMxHosts(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    return mx.map(r => r.exchange);
  } catch {
    return [];
  }
}

/** Query song song toàn bộ selector, không chặn nếu 1 selector lỗi. */
async function _querySelectors(domain, selectors) {
  const results = await Promise.allSettled(
    selectors.map(async (selector) => {
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
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { selector: selectors[i], found: false, record: null }
  );
}
