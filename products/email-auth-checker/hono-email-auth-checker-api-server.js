// Entry point: Hono server port 9042 — POST /api/check + GET /api/health + static public/
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { validateDomain, ValidationError } from './src/dns-input-domain-validator.js';
import { checkSpfRecord } from './src/dns-spf-txt-record-checker.js';
import { checkDkimSelectors } from './src/dns-dkim-selector-public-key-checker.js';
import { checkDmarcRecord } from './src/dns-dmarc-policy-record-checker.js';
import { calculateEmailAuthScore } from './src/email-auth-score-and-grade-calculator.js';
import { generateRemediationGuide } from './src/vietnamese-email-auth-remediation-guide-generator.js';
import { DEMO_OVERRIDES } from './src/demo-domain-overrides-for-friday-presentation.js';

const app = new Hono();
const PORT = Number(process.env.PORT) || 9042;

// ── Health check ─────────────────────────────────────────
app.get('/api/health', (c) => c.json({ ok: true, port: PORT }));

// ── Email auth check ──────────────────────────────────────
app.post('/api/check', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Request body phải là JSON hợp lệ' }, 400);
  }

  let domain;
  try {
    domain = validateDomain(body?.domain);
  } catch (err) {
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
    throw err;
  }

  const start = Date.now();

  let spf, dkim, dmarc;

  const override = DEMO_OVERRIDES[domain];
  if (override) {
    ({ spf, dkim, dmarc } = override);
  } else {
    [spf, dkim, dmarc] = await Promise.all([
      checkSpfRecord(domain),
      checkDkimSelectors(domain),
      checkDmarcRecord(domain),
    ]);
  }

  const { score, grade, grade_label, summary, spf_score, dkim_score, dmarc_score } =
    calculateEmailAuthScore({ spf, dkim, dmarc });

  const fix_guide = generateRemediationGuide(domain, spf, dkim, dmarc);
  const elapsed_ms = Date.now() - start;

  const result = {
    domain,
    spf,
    dkim,
    dmarc,
    score,
    grade,
    grade_label,
    summary,
    breakdown: { spf_score, dkim_score, dmarc_score },
    fix_guide,
    elapsed_ms,
  };

  console.log(JSON.stringify({ domain, score, grade, elapsed_ms }));
  return c.json(result);
});

// ── Static files (no-cache cho dev) ──────────────────────
app.use('/*', serveStatic({
  root: './public',
  onFound: (_path, c) => {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  },
}));

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Email Auth Checker running on http://localhost:${PORT}`);
});
