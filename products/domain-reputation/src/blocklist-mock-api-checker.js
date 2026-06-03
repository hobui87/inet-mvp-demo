// Mock checker cho GSB và PhishTank — deterministic hash để cùng domain ra cùng kết quả
/**
 * Hash đơn giản: djb2 trên string
 * @param {string} str
 * @returns {number}
 */
function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // convert to 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Mock check — ~5% xác suất listed, deterministic theo domain + blocklist id.
 * @param {string} domain
 * @param {{ id: string }} blocklist
 * @returns {{ listed: boolean, mock: true }}
 */
export function checkMockApi(domain, blocklist) {
  const hash = djb2Hash(domain + blocklist.id);
  const listed = (hash % 100) < 5;
  return { listed, mock: true };
}
