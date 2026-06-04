// Resolve domain name → IP address via DNS (IPv4 first, fallback IPv6)
import { promises as dns } from 'node:dns';

/**
 * Resolve domain → IP. Returns first A record, fallback to first AAAA.
 * @param {string} domain
 * @returns {Promise<string>} resolved IP
 * @throws {Error} nếu không resolve được
 */
export async function resolveDomainToIp(domain) {
  try {
    const addrs = await dns.resolve4(domain);
    if (addrs.length > 0) return addrs[0];
  } catch {
    // fallback to IPv6
  }

  try {
    const addrs = await dns.resolve6(domain);
    if (addrs.length > 0) return addrs[0];
  } catch {
    // both failed
  }

  throw new Error(`Không thể resolve domain: ${domain}`);
}
