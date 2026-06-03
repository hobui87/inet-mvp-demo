// 6 blocklists với tổng weight = 100
// Demo overrides — trả kết quả hardcode cho 3 domain demo khi DNS local không resolve được DNSBL zones
// Key: domain (lowercase), Value: mảng check results theo thứ tự BLOCKLISTS
// score = 100 - Σ(weight × listed)
// MODERATE target: score 70 → Spamhaus DBL (30) listed only
// HIGH-RISK target: score 30 → Spamhaus (30) + GSB (25) + Barracuda (15) listed
export const DEMO_DOMAIN_OVERRIDES = {
  // CLEAN — score 100: tất cả clean, đảm bảo demo inet.vn luôn ra đúng
  'inet.vn': [
    { listed: false, demo: true },  // Spamhaus DBL
    { listed: false, demo: true },  // Google Safe Browsing
    { listed: false, demo: true },  // SURBL
    { listed: false, demo: true },  // Barracuda
    { listed: false, demo: true },  // Phishing Army
    { listed: false, demo: true },  // JunkEmail
  ],
  // MODERATE — score 70: bị list Spamhaus DBL
  'suspicious.info': [
    { listed: true,  demo: true },  // Spamhaus DBL    weight 30 → -30 → score 70
    { listed: false, demo: true },  // Google Safe Browsing
    { listed: false, demo: true },  // SURBL
    { listed: false, demo: true },  // Barracuda
    { listed: false, demo: true },  // Phishing Army
    { listed: false, demo: true },  // JunkEmail
  ],
  // HIGH-RISK — score 30: bị list Spamhaus + GSB + Barracuda
  'known-phishing.net': [
    { listed: true,  demo: true },  // Spamhaus DBL    weight 30 → -30
    { listed: true,  demo: true },  // Google Safe Browsing weight 25 → -25
    { listed: false, demo: true },  // SURBL
    { listed: true,  demo: true },  // Barracuda        weight 15 → -15 → score 30
    { listed: false, demo: true },  // Phishing Army
    { listed: false, demo: true },  // JunkEmail
  ],
};
export const BLOCKLISTS = [
  {
    id: 'spamhaus-dbl',
    name: 'Spamhaus DBL',
    weight: 30,
    type: 'dns',
    zone: 'dbl.spamhaus.org',
  },
  {
    id: 'google-safe-browsing',
    name: 'Google Safe Browsing',
    weight: 25,
    type: 'gsb',
  },
  {
    id: 'surbl',
    name: 'SURBL',
    weight: 15,
    type: 'dns',
    zone: 'multi.surbl.org',
  },
  {
    id: 'barracuda',
    name: 'Barracuda',
    weight: 15,
    type: 'dns',
    zone: 'b.barracudacentral.org',
  },
  {
    id: 'phishing-army',
    name: 'Phishing Army',
    weight: 10,
    type: 'phishing-army',
  },
  {
    id: 'junkemail',
    name: 'MXToolbox / JunkEmail',
    weight: 5,
    type: 'dns',
    zone: 'black.junkemailfilter.com',
  },
];
