// Entry point — IP Reputation & Reverse DNS Checker, port 9044
// Routes: GET /api/myip | POST /api/check | GET /api/history | GET /api/health | static public/
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { validateAndNormalizeIp, validateAndNormalizeInput, isPrivateIp, ValidationError } from './src/ip-input-validator-and-sanitizer.js';
import { resolveDomainToIp } from './src/domain-to-ip-dns-resolver.js';
import { IP_RBLS, DEMO_IP_OVERRIDES } from './src/ip-rbl-config.js';
import { checkIpRbl } from './src/ip-rbl-dns-zone-checker.js';
import { checkPtrRecord } from './src/ip-ptr-record-reverse-dns-checker.js';
import { lookupAsn } from './src/ip-asn-info-lookup-via-ipapi.js';
import { calculateIpScore } from './src/ip-reputation-score-calculator.js';
import { saveIpScan, getIpHistory } from './src/ip-scan-history-sqlite-db.js';

const PORT = Number(process.env.PORT) || 9044;
const app = new Hono();

// Generate RBL check results from demo override profile (no real DNS queries)
function generateRblChecksFromOverride(grade) {
  const listedIds = {
    'moderate':  ['spamhaus-zen'],
    'high-risk': ['spamhaus-zen', 'spamhaus-xbl', 'barracuda-brbl', 'abuseat-cbl', 'spamcop'],
  }[grade] ?? [];
  return IP_RBLS.map(r => ({ ...r, listed: listedIds.includes(r.id) }));
}

// Run real DNS RBL checks for all configured zones in parallel
async function runAllRblChecks(ip) {
  return Promise.all(
    IP_RBLS.map(async (rbl) => {
      const check = await checkIpRbl(ip, rbl.zone);
      return { ...rbl, ...check };
    })
  );
}

app.get('/api/health', (c) => c.json({ ok: true, port: PORT }));

app.get('/api/myip', (c) => {
  const forwarded = c.req.header('x-forwarded-for');
  const realIp = c.req.header('x-real-ip');
  const remoteAddr = c.env?.incoming?.socket?.remoteAddress;

  const raw = forwarded ? forwarded.split(',')[0].trim() : (realIp || remoteAddr);
  if (!raw) return c.json({ error: 'Cannot detect IP' }, 400);

  return c.json({ ip: raw });
});

app.post('/api/check', async (c) => {
  let ip;
  let resolved_from_domain;

  try {
    const body = await c.req.json();
    // Hỗ trợ cả field "input" (mới) lẫn "ip" (backward compat)
    const raw = body?.input ?? body?.ip;

    const parsed = validateAndNormalizeInput(raw);

    if (parsed.type === 'domain') {
      resolved_from_domain = parsed.value;
      try {
        const resolvedIp = await resolveDomainToIp(parsed.value);
        if (isPrivateIp(resolvedIp)) {
          return c.json({ error: 'IP private/reserved không được phép kiểm tra' }, 400);
        }
        ip = resolvedIp;
      } catch {
        return c.json({ error: `Không thể resolve domain: ${parsed.value}` }, 400);
      }
    } else {
      ip = parsed.value;
    }
  } catch (err) {
    const msg = err instanceof ValidationError ? err.message : 'Request body không hợp lệ';
    return c.json({ error: msg }, 400);
  }

  const startTime = Date.now();

  // Demo override takes priority over real DNS queries
  const demoGrade = Object.prototype.hasOwnProperty.call(DEMO_IP_OVERRIDES, ip)
    ? DEMO_IP_OVERRIDES[ip]
    : undefined;

  const [rblChecks, ptr, asn] = await Promise.all([
    demoGrade !== undefined
      ? Promise.resolve(generateRblChecksFromOverride(demoGrade))
      : runAllRblChecks(ip),
    checkPtrRecord(ip),
    lookupAsn(ip),
  ]);

  const { score, grade, recommended_action } = calculateIpScore({ rblChecks, ptr });
  const duration_ms = Date.now() - startTime;

  const result = {
    ip,
    ...(resolved_from_domain ? { resolved_from_domain } : {}),
    score, grade, recommended_action, ptr, asn, rbl_checks: rblChecks, duration_ms,
  };
  saveIpScan(result);

  return c.json(result);
});

app.get('/api/history', (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  return c.json({ history: getIpHistory(limit) });
});

app.use('/*', serveStatic({ root: './public' }));

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`IP Reputation Checker running on http://localhost:${PORT}`);
});
