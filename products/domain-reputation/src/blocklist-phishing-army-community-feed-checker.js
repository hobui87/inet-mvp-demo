// Phishing Army community feed checker — real data, no auth required
// Feed: https://phishing.army/download/phishing_army_blocklist.txt
// Updated daily, ~144k phishing domains

const FEED_URL = 'https://phishing.army/download/phishing_army_blocklist.txt';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cache = { domains: null, fetchedAt: 0 };

async function refreshFeedIfStale() {
  const now = Date.now();
  if (cache.domains && (now - cache.fetchedAt) < CACHE_TTL_MS) return;

  const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`feed-fetch-failed:${res.status}`);

  const text = await res.text();
  const domains = new Set();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    domains.add(trimmed.toLowerCase());
  }

  cache = { domains, fetchedAt: now };
  console.log(`[PhishingArmy] Feed refreshed — ${domains.size} domains`);
}

/**
 * @param {string} domain
 * @returns {Promise<{ listed: boolean, error?: string }>}
 */
export async function checkPhishingArmyFeed(domain) {
  try {
    await refreshFeedIfStale();
    const listed = cache.domains?.has(domain.toLowerCase()) ?? false;
    return { listed };
  } catch (err) {
    return { listed: false, error: 'feed-unavailable' };
  }
}
