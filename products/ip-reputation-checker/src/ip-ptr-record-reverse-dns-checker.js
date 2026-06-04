// PTR record lookup (rDNS) — thiếu PTR là dấu hiệu xấu cho mail server
import dns from 'node:dns/promises';

const DNS_TIMEOUT_MS = 4000;

/**
 * Lookup PTR record của IP.
 * @param {string} ip
 * @returns {Promise<{ has_ptr: boolean, ptr: string|null, error?: string }>}
 */
export async function checkPtrRecord(ip) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), DNS_TIMEOUT_MS);
  });

  try {
    const ptrs = await Promise.race([dns.reverse(ip), timeoutPromise]);
    clearTimeout(timeoutId);
    const ptr = ptrs?.[0] ?? null;
    return { has_ptr: !!ptr, ptr };
  } catch (err) {
    clearTimeout(timeoutId);
    const code = err.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ESERVFAIL') {
      return { has_ptr: false, ptr: null };
    }
    if (err.message === 'timeout') {
      return { has_ptr: false, ptr: null, error: 'timeout' };
    }
    return { has_ptr: false, ptr: null, error: code ?? err.message };
  }
}
