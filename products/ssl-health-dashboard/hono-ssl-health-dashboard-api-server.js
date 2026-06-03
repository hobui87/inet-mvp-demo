// Entry point: Hono server port 9043 — GET /api/health + POST /api/check (bulk SSL cert scan) + static public/
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { fetchSslCertInfo } from './src/ssl-certificate-info-fetcher.js'
import { calculateSslHealthScore } from './src/ssl-health-score-calculator.js'

const PORT = Number(process.env.PORT) || 9043
const MAX_DOMAINS = 10

// Demo overrides — hardcoded for known test domains (badssl.com scenarios)
const DEMO_OVERRIDES = {
  'expired.badssl.com': {
    daysRemaining: -5,
    valid: false,
    selfSigned: false,
    issuer: 'BadSSL',
    subject: 'expired.badssl.com',
    validFrom: '2015-04-09',
    validTo: '2015-04-10',
    protocol: 'TLS 1.2',
  },
  'self-signed.badssl.com': {
    daysRemaining: 3650,
    valid: false,
    selfSigned: true,
    issuer: 'self-signed.badssl.com',
    subject: 'self-signed.badssl.com',
    validFrom: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    validTo: new Date(Date.now() + 3650 * 86400000).toISOString().split('T')[0],
    protocol: 'TLS 1.2',
  },
}

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true, port: PORT }))

app.post('/api/check', async (c) => {
  let body
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Request body phải là JSON hợp lệ' }, 400)
  }

  const raw = body?.domains
  if (!Array.isArray(raw) || raw.length === 0) {
    return c.json({ error: 'Trường "domains" phải là mảng không rỗng' }, 400)
  }
  if (raw.length > MAX_DOMAINS) {
    return c.json({ error: `Tối đa ${MAX_DOMAINS} domain mỗi lần quét` }, 400)
  }

  // Sanitize: trim, lowercase, strip protocol prefix
  const domains = raw
    .map((d) => String(d).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean)

  const start = Date.now()

  const results = await Promise.all(
    domains.map(async (domain) => {
      const override = DEMO_OVERRIDES[domain]
      const certInfo = override
        ? { domain, ...override }
        : await fetchSslCertInfo(domain)

      const { score, grade, status } = calculateSslHealthScore(certInfo)
      return { ...certInfo, score, grade, status }
    })
  )

  const elapsed_ms = Date.now() - start
  console.log(JSON.stringify({ domains: domains.length, elapsed_ms }))

  return c.json({ results, elapsed_ms })
})

// Static files — no-cache for dev
app.use('/*', serveStatic({
  root: './public',
  onFound: (_path, c) => {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  },
}))

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`SSL Health Dashboard running on http://localhost:${PORT}`)
})
