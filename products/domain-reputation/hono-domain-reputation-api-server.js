// Entry point: Hono server port 9041, expose POST /api/check + GET /api/health + static public/
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { BLOCKLISTS, DEMO_DOMAIN_OVERRIDES } from './src/blocklist-config.js';
import { sanitizeAndValidateDomain, ValidationError } from './src/domain-input-sanitizer-and-validator.js';
import { checkDnsZone } from './src/blocklist-dns-zone-checker.js';
import { checkPhishingArmyFeed } from './src/blocklist-phishing-army-community-feed-checker.js';
import { checkGoogleSafeBrowsingV5 } from './src/blocklist-google-safe-browsing-api-v5-checker.js';
import { calculateScore } from './src/domain-reputation-score-calculator.js';
import { saveCheck, getHistory } from './src/scan-history-sqlite-db.js';
import { bulkScan, MAX_DOMAINS_PER_REQUEST } from './src/bulk-domain-concurrent-scanner.js';

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true, port: PORT }));

app.post('/api/check', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Request body phải là JSON hợp lệ' }, 400);
  }

  let domain;
  try {
    domain = sanitizeAndValidateDomain(body?.domain);
  } catch (err) {
    if (err instanceof ValidationError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }

  const start = Date.now();

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
  const duration_ms = Date.now() - start;
  const result = { domain, score, grade, recommended_action, checks, duration_ms };

  saveCheck(result);
  console.log(JSON.stringify({ domain, score, grade, duration_ms }));

  return c.json(result);
});

// GET /api/history?limit=20 — lịch sử các lần quét gần nhất
app.get('/api/history', (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  const rows = getHistory(isNaN(limit) ? 20 : limit);
  return c.json({ history: rows });
});

// POST /api/bulk-check — quét hàng loạt (tối đa MAX_DOMAINS_PER_REQUEST domains)
app.post('/api/bulk-check', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Request body phải là JSON hợp lệ' }, 400);
  }

  const raw = body?.domains;
  if (!Array.isArray(raw) || raw.length === 0) {
    return c.json({ error: 'Trường "domains" phải là mảng không rỗng' }, 400);
  }
  if (raw.length > MAX_DOMAINS_PER_REQUEST) {
    return c.json({ error: `Tối đa ${MAX_DOMAINS_PER_REQUEST} domain mỗi lần quét` }, 400);
  }

  const scan = await bulkScan(raw);

  // Lưu từng kết quả hợp lệ vào history
  for (const r of scan.results) saveCheck(r);

  return c.json(scan);
});

// Static files — no-cache để dev thấy thay đổi ngay lập tức
app.use('/*', serveStatic({
  root: './public',
  onFound: (_path, c) => {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  },
}));

const PORT = Number(process.env.PORT) || 9041;
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Domain Reputation Monitor running on http://localhost:${PORT}`);
});
