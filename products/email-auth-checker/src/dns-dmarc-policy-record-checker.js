// Lookup và parse DMARC record từ TXT _dmarc.{domain}, trả về policy, rua/ruf, alignment
import dns from 'node:dns/promises';

/**
 * @typedef {Object} DmarcResult
 * @property {boolean} exists - Có DMARC record không
 * @property {string|null} record - Raw TXT record
 * @property {'none'|'quarantine'|'reject'|null} policy - Giá trị p=
 * @property {number} pct - Phần trăm áp dụng policy (0-100)
 * @property {string|null} rua - Reporting URI Aggregate
 * @property {string|null} ruf - Reporting URI Forensic
 * @property {'r'|'s'|null} adkim - DKIM alignment mode
 * @property {'r'|'s'|null} aspf - SPF alignment mode
 * @property {number} record_count - Số TXT v=DMARC1 tại _dmarc (>1 là lỗi)
 * @property {boolean} pct_nonsense - pct=0 nhưng policy khác none (vô nghĩa)
 * @property {string[]} warnings - Cảnh báo tiếng Việt về chất lượng record
 * @property {string|null} error
 */

/**
 * Kiểm tra DMARC record tại _dmarc.{domain}
 * @param {string} domain
 * @returns {Promise<DmarcResult>}
 */
export async function checkDmarcRecord(domain) {
  const host = `_dmarc.${domain}`;
  try {
    const records = await dns.resolveTxt(host);
    const flat = records.map(chunks => chunks.join('')).filter(r => r.startsWith('v=DMARC1'));

    if (flat.length === 0) {
      return _empty(null);
    }

    const record = flat[0];
    const record_count = flat.length;
    const tags = _parseTags(record);

    const policy = ['none', 'quarantine', 'reject'].includes(tags.p) ? tags.p : null;
    const pctRaw = tags.pct !== undefined ? parseInt(tags.pct, 10) : 100;
    const pct = Math.min(100, Math.max(0, Number.isNaN(pctRaw) ? 100 : pctRaw));
    const adkim = tags.adkim === 's' ? 's' : (tags.adkim === 'r' ? 'r' : null);
    const aspf  = tags.aspf  === 's' ? 's' : (tags.aspf  === 'r' ? 'r' : null);

    const pct_nonsense = pct === 0 && policy !== null && policy !== 'none';
    const warnings = [];
    if (record_count > 1) {
      warnings.push(`Có ${record_count} bản ghi DMARC tại _dmarc — RFC yêu cầu CHỈ 1; nhiều bản ghi khiến DMARC bị bỏ qua hoàn toàn.`);
    }
    if (pct_nonsense) {
      warnings.push('pct=0 nhưng policy khác none — không có email nào thực sự bị áp policy (cấu hình vô nghĩa).');
    }

    return {
      exists: true,
      record,
      policy,
      pct,
      rua: tags.rua ?? null,
      ruf: tags.ruf ?? null,
      adkim,
      aspf,
      record_count,
      pct_nonsense,
      warnings,
      error: null,
    };
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'ESERVFAIL') {
      return _empty(null);
    }
    return _empty(err.code ?? 'dns_error');
  }
}

/** Parse DMARC tag=value pairs */
function _parseTags(record) {
  const tags = {};
  record.split(';').forEach(part => {
    const [k, ...rest] = part.trim().split('=');
    if (k && rest.length) tags[k.trim()] = rest.join('=').trim();
  });
  return tags;
}

function _empty(error) {
  return {
    exists: false, record: null, policy: null, pct: 100, rua: null, ruf: null,
    adkim: null, aspf: null, record_count: 0, pct_nonsense: false, warnings: [], error,
  };
}
