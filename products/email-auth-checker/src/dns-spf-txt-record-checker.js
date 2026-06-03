// Lookup và parse SPF record (v=spf1) từ TXT records của domain
import dns from 'node:dns/promises';

/**
 * @typedef {Object} SpfResult
 * @property {boolean} exists - Có SPF record không
 * @property {string|null} record - Raw TXT record
 * @property {string} policy - 'strict' | 'softfail' | 'neutral' | 'none'
 * @property {number} lookup_count - Số DNS lookups ước tính
 * @property {boolean} too_many_lookups - Có vượt quá 10 lookups không
 * @property {string[]} mechanisms - Các mechanism được tìm thấy
 * @property {string|null} error - Lỗi nếu có
 */

/**
 * Kiểm tra SPF record của domain.
 * @param {string} domain
 * @returns {Promise<SpfResult>}
 */
export async function checkSpfRecord(domain) {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.map(chunks => chunks.join('')).filter(r => r.startsWith('v=spf1'));

    if (flat.length === 0) {
      return { exists: false, record: null, policy: 'none', lookup_count: 0, too_many_lookups: false, mechanisms: [], error: null };
    }

    const record = flat[0];
    const parts = record.split(/\s+/);

    // Phân tích policy từ "all" qualifier
    let policy = 'none';
    const allPart = parts.find(p => /^[~\-+?]?all$/i.test(p));
    if (allPart) {
      if (allPart.startsWith('-')) policy = 'strict';
      else if (allPart.startsWith('~')) policy = 'softfail';
      else if (allPart.startsWith('?')) policy = 'neutral';
      else policy = 'softfail'; // +all hoặc all không có qualifier
    }

    // Đếm mechanisms tạo ra DNS lookup
    const DNS_LOOKUP_MECHANISMS = /^(include:|a:|mx:|ptr:|exists:|a$|mx$)/i;
    const mechanisms = parts.filter(p => !p.startsWith('v='));
    const lookup_count = mechanisms.filter(p => DNS_LOOKUP_MECHANISMS.test(p)).length;
    const too_many_lookups = lookup_count > 10;

    return {
      exists: true,
      record,
      policy,
      lookup_count,
      too_many_lookups,
      mechanisms: mechanisms.slice(0, 20), // giới hạn output
      error: null,
    };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'ESERVFAIL') {
      return { exists: false, record: null, policy: 'none', lookup_count: 0, too_many_lookups: false, mechanisms: [], error: null };
    }
    return { exists: false, record: null, policy: 'none', lookup_count: 0, too_many_lookups: false, mechanisms: [], error: err.code ?? 'dns_error' };
  }
}
