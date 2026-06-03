// Google Safe Browsing Lookup API v4 checker
// Requires env var: GOOGLE_SAFE_BROWSING_API_KEY (free key at console.cloud.google.com)
// Without key: returns { listed: false, noKey: true } — no mock, no fake data

const GSB_API_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

const THREAT_TYPES = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'];

/**
 * @param {string} domain
 * @returns {Promise<{ listed: boolean, noKey?: boolean, error?: string }>}
 */
export async function checkGoogleSafeBrowsing(domain) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

  if (!apiKey) {
    return { listed: false, noKey: true };
  }

  try {
    const res = await fetch(`${GSB_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'domain-reputation-monitor', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: THREAT_TYPES,
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [
            { url: `http://${domain}` },
            { url: `https://${domain}` },
          ],
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { listed: false, error: `gsb-api-error:${res.status}` };
    }

    const data = await res.json();
    // GSB returns { matches: [...] } when threats found, empty object {} when clean
    const listed = Array.isArray(data.matches) && data.matches.length > 0;
    return { listed };
  } catch (err) {
    return { listed: false, error: 'gsb-unreachable' };
  }
}
