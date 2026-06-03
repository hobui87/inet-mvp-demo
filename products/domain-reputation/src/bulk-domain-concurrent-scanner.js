// Bulk scan: chạy multiple domains concurrently với giới hạn số luồng song song
import { sanitizeAndValidateDomain, ValidationError } from './domain-input-sanitizer-and-validator.js';
import { BLOCKLISTS, DEMO_DOMAIN_OVERRIDES } from './blocklist-config.js';
import { checkDnsZone } from './blocklist-dns-zone-checker.js';
import { checkPhishingArmyFeed } from './blocklist-phishing-army-community-feed-checker.js';
import { checkGoogleSafeBrowsingV5 } from './blocklist-google-safe-browsing-api-v5-checker.js';
import { calculateScore } from './domain-reputation-score-calculator.js';

const MAX_CONCURRENCY = 5;
const MAX_DOMAINS_PER_REQUEST = 50;

async function scanOneDomain(domain) {
  const demoOverride = DEMO_DOMAIN_OVERRIDES[domain];
  let checks;

  if (demoOverride) {
    checks = BLOCKLISTS.map((bl, i) => ({ id: bl.id, name: bl.name, weight: bl.weight, ...demoOverride[i] }));
  } else {
    const results = await Promise.allSettled(
      BLOCKLISTS.map(async (bl) => {
        const base = { id: bl.id, name: bl.name, weight: bl.weight };
        if (bl.type === 'dns') return { ...base, ...await checkDnsZone(domain, bl.zone) };
        if (bl.type === 'gsb') return { ...base, ...await checkGoogleSafeBrowsingV5(domain) };
        if (bl.type === 'phishing-army') return { ...base, ...await checkPhishingArmyFeed(domain) };
        return { ...base, listed: false };
      })
    );
    checks = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { id: BLOCKLISTS[i].id, name: BLOCKLISTS[i].name, weight: BLOCKLISTS[i].weight, listed: false, error: 'unexpected' }
    );
  }

  const { score, grade, recommended_action } = calculateScore(checks);
  return { domain, score, grade, recommended_action, checks };
}

// Chạy tasks theo batch để không vượt MAX_CONCURRENCY
async function runConcurrent(tasks, concurrency) {
  const results = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor++;
      results[idx] = await tasks[idx]();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

/**
 * @param {string[]} rawDomains
 * @returns {{ results: Array, errors: Array<{domain: string, error: string}> }}
 */
export async function bulkScan(rawDomains) {
  const domains = rawDomains.slice(0, MAX_DOMAINS_PER_REQUEST);
  const valid = [];
  const errors = [];

  for (const raw of domains) {
    try {
      valid.push(sanitizeAndValidateDomain(raw));
    } catch (err) {
      errors.push({ domain: raw, error: err instanceof ValidationError ? err.message : 'invalid' });
    }
  }

  const start = Date.now();
  const scanResults = await runConcurrent(
    valid.map((d) => () => scanOneDomain(d)),
    MAX_CONCURRENCY
  );

  return {
    results: scanResults,
    errors,
    total: domains.length,
    duration_ms: Date.now() - start,
  };
}

export { MAX_DOMAINS_PER_REQUEST };
