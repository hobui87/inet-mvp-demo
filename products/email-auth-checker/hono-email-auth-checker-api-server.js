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
import { parseDkimHeader } from './src/dkim-signature-header-parser.js';

const app = new Hono();
const PORT = Number(process.env.PORT) || 9042;
const SELECTOR_CHARSET = /^[a-z0-9._-]{1,128}$/i;

/**
 * Xác định selector override + cảnh báo từ body. Ưu tiên selector tay > parse dkim_header.
 * @returns {{ selector: string|null, warning: string|null }}
 */
function resolveDkimOverride(body, domain) {
  // 1) selector nhập tay (early-reject chuỗi quá dài trước khi xử lý)
  if (typeof body?.selector === 'string' && body.selector.length <= 256
      && SELECTOR_CHARSET.test(body.selector.trim())) {
    return { selector: body.selector.trim(), warning: null };
  }
  // 2) parse từ DKIM-Signature header (giới hạn 8KB ở tầng API, defense-in-depth với parser 4KB)
  if (typeof body?.dkim_header === 'string' && body.dkim_header.length > 0
      && body.dkim_header.length <= 8192) {
    const parsed = parseDkimHeader(body.dkim_header);
    if (parsed?.selector) {
      const warning = parsed.domain && parsed.domain !== domain
        ? `Header thuộc domain "${parsed.domain}" khác với domain đang kiểm tra "${domain}".`
        : null;
      return { selector: parsed.selector, warning };
    }
  }
  return { selector: null, warning: null };
}

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

  // Selector override tùy chọn (nhập tay / từ DKIM-Signature header) — backward compatible
  const { selector: dkimSelector, warning: dkimWarning } = resolveDkimOverride(body, domain);

  // Luôn query DNS thật — không còn override demo
  const [spf, dkim, dmarc] = await Promise.all([
    checkSpfRecord(domain),
    checkDkimSelectors(domain, dkimSelector ? { selector: dkimSelector } : {}),
    checkDmarcRecord(domain),
  ]);
  if (dkimWarning) dkim.warning = dkimWarning;

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
