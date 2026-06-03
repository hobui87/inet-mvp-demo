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
    const tags = _parseTags(record);

    const policy = ['none', 'quarantine', 'reject'].includes(tags.p) ? tags.p : null;
    const pct = tags.pct !== undefined ? Math.min(100, Math.max(0, parseInt(tags.pct, 10) || 100)) : 100;
    const adkim = tags.adkim === 's' ? 's' : (tags.adkim === 'r' ? 'r' : null);
    const aspf  = tags.aspf  === 's' ? 's' : (tags.aspf  === 'r' ? 'r' : null);

    return {
      exists: true,
      record,
      policy,
      pct,
      rua: tags.rua ?? null,
      ruf: tags.ruf ?? null,
      adkim,
      aspf,
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
  return { exists: false, record: null, policy: null, pct: 100, rua: null, ruf: null, adkim: null, aspf: null, error };
}
