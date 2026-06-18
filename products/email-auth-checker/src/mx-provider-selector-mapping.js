// Map MX hostname patterns -> email provider -> ưu tiên selector DKIM của provider đó.
// Giúp brute-force DKIM trúng nhanh hơn (đẩy selector provider lên đầu) thay vì thử mù.

/**
 * Pattern nhận diện provider từ MX hostname. Key khớp với providers trong dkim-common-selectors.json.
 * @type {Array<{ provider: string, patterns: RegExp[] }>}
 */
const MX_PROVIDER_PATTERNS = [
  { provider: 'google',     patterns: [/aspmx.*\.google\.com$/i, /\.googlemail\.com$/i] },
  { provider: 'microsoft',  patterns: [/\.protection\.outlook\.com$/i, /\.mail\.eo\.outlook\.com$/i] },
  { provider: 'zoho',       patterns: [/\.zoho\.(com|eu|in)$/i, /mx\.zoho/i] },
  { provider: 'sendgrid',   patterns: [/\.sendgrid\.net$/i] },
  { provider: 'mailgun',    patterns: [/\.mailgun\.org$/i] },
  { provider: 'protonmail', patterns: [/\.protonmail\.ch$/i, /\.proton\.me$/i] },
  { provider: 'fastmail',   patterns: [/\.messagingengine\.com$/i] },
  { provider: 'yahoo',      patterns: [/\.yahoodns\.net$/i] },
  { provider: 'zendesk',    patterns: [/\.zendesk\.com$/i] },
  // amazonses dùng token selector ngẫu nhiên -> không có selector cố định để brute (nhận diện để gợi ý nhập tay)
  { provider: 'amazonses',  patterns: [/\.amazonses\.com$/i, /inbound-smtp\..*\.amazonaws\.com$/i] },
];

/**
 * Nhận diện provider từ danh sách MX hostnames.
 * @param {string[]} mxHosts - exchange hostnames (đã lowercase được thì tốt)
 * @returns {string|null} key provider hoặc null nếu không nhận diện được
 */
export function detectProviderFromMx(mxHosts) {
  if (!Array.isArray(mxHosts) || mxHosts.length === 0) return null;
  for (const host of mxHosts) {
    const h = String(host).trim().toLowerCase();
    for (const { provider, patterns } of MX_PROVIDER_PATTERNS) {
      if (patterns.some(p => p.test(h))) return provider;
    }
  }
  return null;
}

/**
 * Build danh sách selector ưu tiên: selector của provider (nếu nhận diện) lên đầu, rồi tới generic.
 * Loại trùng, giữ thứ tự. amazonses không có selector brute -> chỉ trả generic.
 * @param {string|null} provider
 * @param {{ generic: string[], providers: Record<string,string[]> }} selectorData
 * @returns {string[]} danh sách selector unique, đã sắp ưu tiên
 */
export function prioritizedSelectors(provider, selectorData) {
  const generic = Array.isArray(selectorData?.generic) ? selectorData.generic : [];
  const providerSelectors =
    provider && selectorData?.providers?.[provider] ? selectorData.providers[provider] : [];
  return [...new Set([...providerSelectors, ...generic])];
}
