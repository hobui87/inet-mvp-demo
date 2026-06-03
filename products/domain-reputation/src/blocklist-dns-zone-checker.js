// Query DNS zone để kiểm tra domain có trong DNSBL hay không
import dns from 'node:dns/promises';

const DNS_TIMEOUT_MS = 3000;

/**
 * Kiểm tra 1 domain với 1 DNS zone blocklist.
 * @param {string} domain
 * @param {string} zone  vd: "dbl.spamhaus.org"
 * @returns {{ listed: boolean, error?: string }}
 */
export async function checkDnsZone(domain, zone) {
  const query = `${domain}.${zone}`;

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), DNS_TIMEOUT_MS);
  });

  try {
    const addresses = await Promise.race([dns.resolve4(query), timeoutPromise]);
    clearTimeout(timeoutId);
    // Có A record trả về → domain bị listed
    return { listed: addresses.length > 0 };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA' || err.code === 'ESERVFAIL' || err.code === 'ECONNREFUSED') {
      // ECONNREFUSED = DNS resolver doesn't support DNSBL queries (corporate/ISP DNS)
      // Treat as clean — benefit of the doubt, no penalty
      return { listed: false };
    }
    if (err.message === 'timeout') {
      return { listed: false, error: 'timeout' };
    }
    // Lỗi khác (ECONNREFUSED, v.v.) → coi như not listed
    return { listed: false, error: err.code || err.message };
  }
}
