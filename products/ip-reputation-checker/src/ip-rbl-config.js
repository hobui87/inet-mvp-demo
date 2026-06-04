// IP RBL zone registry — 11 lists với weight + demo override profiles
// Tổng weight: 100 (phân bổ theo độ uy tín thực tế của từng list)

export const IP_RBLS = [
  // --- Tier 1: Spamhaus (uy tín cao nhất, phổ biến nhất) ---
  { id: 'spamhaus-zen',   name: 'Spamhaus ZEN',    weight: 25, zone: 'zen.spamhaus.org' },
  { id: 'spamhaus-xbl',   name: 'Spamhaus XBL',    weight: 10, zone: 'xbl.spamhaus.org' },
  { id: 'spamhaus-pbl',   name: 'Spamhaus PBL',    weight: 8,  zone: 'pbl.spamhaus.org' },
  // --- Tier 2: Established commercial/community ---
  { id: 'barracuda-brbl', name: 'Barracuda BRBL',  weight: 12, zone: 'b.barracudacentral.org' },
  { id: 'sorbs-spam',     name: 'SORBS Spam',      weight: 8,  zone: 'spam.sorbs.net' },
  { id: 'sorbs-dul',      name: 'SORBS Dynamic',   weight: 5,  zone: 'dul.sorbs.net' },
  // --- Tier 3: Supplementary ---
  { id: 'abuseat-cbl',    name: 'AbuseatC CBL',    weight: 10, zone: 'cbl.abuseat.org' },
  { id: 'spamcop',        name: 'SpamCop',         weight: 8,  zone: 'bl.spamcop.net' },
  { id: 'uceprotect-l1',  name: 'UCEprotect L1',   weight: 5,  zone: 'dnsbl-1.uceprotect.net' },
  { id: 'nordspam',       name: 'NordSpam',        weight: 5,  zone: 'bl.nordspam.com' },
  { id: 'mailspike-bl',   name: 'Mailspike BL',    weight: 4,  zone: 'bl.mailspike.net' },
];

// Demo override profiles cho 3 IP kịch bản — tránh spam DNS RBL thật khi demo
// null = tất cả clean, 'moderate' / 'high-risk' = xem generateRblChecksFromOverride()
export const DEMO_IP_OVERRIDES = {
  '103.28.248.1':  null,        // iNET IP — CLEAN, score ~100
  '192.0.2.10':    'moderate',  // TEST-NET RFC5737 — score ~65 (Spamhaus ZEN listed + no PTR)
  '198.51.100.99': 'high-risk', // TEST-NET RFC5737 — score ~25 (ZEN+XBL+BRBL+CBL+SpamCop + no PTR)
};
