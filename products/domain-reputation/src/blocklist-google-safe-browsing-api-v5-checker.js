// Google Safe Browsing API v5 checker (recommended, replaces v4)
// Docs: https://developers.google.com/safe-browsing/v5/lookup-api
// Requires env var: GOOGLE_SAFE_BROWSING_API_KEY (free key at console.cloud.google.com)
//
// v5 difference from v4: privacy-preserving hash prefix lookup
//   1. SHA256(canonicalized URL) → take first 4 bytes as prefix
//   2. Send prefix to API → get matching full hashes back
//   3. Compare full hashes locally to confirm match

import crypto from 'node:crypto';

const GSB_V5_URL = 'https://safebrowsing.googleapis.com/v5/hashes:search';

function sha256Buffer(str) {
  return crypto.createHash('sha256').update(str).digest();
}

// Generate URL expressions to check for a given domain (simplified canonicalization)
function urlExpressions(domain) {
  return [
    `http://${domain}/`,
    `https://${domain}/`,
  ];
}

/**
 * @param {string} domain
 * @returns {Promise<{ listed: boolean, noKey?: boolean, error?: string }>}
 */
export async function checkGoogleSafeBrowsingV5(domain) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) return { listed: false, noKey: true };

  const expressions = urlExpressions(domain);
  const fullHashes = expressions.map(url => sha256Buffer(url));

  // Deduplicate 4-byte prefixes encoded as base64
  const prefixSet = new Set(fullHashes.map(h => h.slice(0, 4).toString('base64')));
  const params = new URLSearchParams({ key: apiKey });
  for (const prefix of prefixSet) params.append('hashPrefixes', prefix);

  try {
    const res = await fetch(`${GSB_V5_URL}?${params}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[GSB] ${res.status} — ${body.slice(0, 300)}`);
      return { listed: false, error: `gsb-api-error:${res.status}` };
    }

    const data = await res.json();
    if (!data.matches || data.matches.length === 0) return { listed: false };

    // Confirm: compare returned full hashes against our computed hashes
    const returnedHashes = new Set(data.matches.map(m => m.hash));
    const listed = fullHashes.some(h => returnedHashes.has(h.toString('base64')));
    return { listed };
  } catch {
    return { listed: false, error: 'gsb-unreachable' };
  }
}
