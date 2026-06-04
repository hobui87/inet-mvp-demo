// Query DNS RBL zone với reversed IP octets — pattern chuẩn cho IP-based DNSBL
import dns from 'node:dns/promises';

const DNS_TIMEOUT_MS = 3000;

function reverseIpv4(ip) {
  return ip.split('.').reverse().join('.');
}

// IPv6: expand full 128-bit → reverse 32 hex nibbles → join với '.'
function reverseIpv6(ip) {
  // Expand :: notation
  const halves = ip.split('::');
  const left  = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  const full = [...left, ...Array(missing).fill('0'), ...right];
  const nibbles = full.map(g => g.padStart(4, '0')).join('');
  return nibbles.split('').reverse().join('.');
}

/**
 * Kiểm tra IP với 1 RBL zone bằng cách reverse-IP DNS lookup.
 * ENOTFOUND / ENODATA = clean (benefit of the doubt).
 * @param {string} ip
 * @param {string} zone  vd: "zen.spamhaus.org"
 * @returns {Promise<{ listed: boolean, error?: string }>}
 */
export async function checkIpRbl(ip, zone) {
  const reversed = ip.includes(':') ? reverseIpv6(ip) : reverseIpv4(ip);
  const query = `${reversed}.${zone}`;

  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), DNS_TIMEOUT_MS);
  });

  try {
    const addresses = await Promise.race([dns.resolve4(query), timeoutPromise]);
    clearTimeout(timeoutId);
    return { listed: addresses.length > 0 };
  } catch (err) {
    clearTimeout(timeoutId);
    const code = err.code;
    if (
      code === 'ENOTFOUND' || code === 'ENODATA' ||
      code === 'ESERVFAIL' || code === 'ECONNREFUSED' ||
      code === 'EREFUSED'
    ) {
      return { listed: false };
    }
    if (err.message === 'timeout') {
      return { listed: false, error: 'timeout' };
    }
    return { listed: false, error: code ?? err.message };
  }
}
