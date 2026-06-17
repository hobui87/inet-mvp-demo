// Fetches SSL certificate details from a domain using node:https — returns cert validity, issuer, expiry, daysRemaining
import https from 'node:https'

const TIMEOUT_MS = 8000
// Transient network errors worth one automatic retry
const TRANSIENT_ERROR = /timeout|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT/

// Dedicated agent with TLS session caching disabled. Session resumption returns
// an abbreviated handshake where the peer omits its cert chain → getPeerCertificate()
// yields {} and a healthy host is wrongly reported as "no_certificate". Forcing a
// full handshake every connection guarantees the cert is always present.
const agent = new https.Agent({ maxCachedSessions: 0, keepAlive: false })

/**
 * @param {string} domain
 * @returns {Promise<{domain, valid, subject, issuer, validFrom, validTo, daysRemaining, protocol, error?}>}
 */
export async function fetchSslCertInfo(domain) {
  let result = await attemptFetchSslCertInfo(domain)
  // Retry once on transient network failures (flaky connections, slow handshakes)
  if (result.error && TRANSIENT_ERROR.test(result.error)) {
    result = await attemptFetchSslCertInfo(domain)
  }
  return result
}

function attemptFetchSslCertInfo(domain) {
  return new Promise((resolve) => {
    const options = {
      host: domain,
      port: 443,
      method: 'HEAD',
      rejectUnauthorized: false,
      timeout: TIMEOUT_MS,
      agent,
    }

    const req = https.request(options, (res) => {
      try {
        const cert = res.socket.getPeerCertificate(true)

        if (!cert || !cert.valid_to) {
          resolve({ domain, valid: false, error: 'no_certificate' })
          return
        }

        const validTo   = new Date(cert.valid_to)
        const validFrom = new Date(cert.valid_from)
        const now       = new Date()
        const daysRemaining = Math.floor((validTo - now) / (1000 * 60 * 60 * 24))
        const valid = daysRemaining > 0

        // Detect self-signed: cert's issuer chain points back to itself
        // (issuerCertificate fingerprint === own fingerprint). Fallback to
        // CN heuristic when the issuer chain isn't populated.
        const subjectCN  = cert.subject?.CN ?? ''
        const issuerCN   = cert.issuer?.CN  ?? ''
        const issuerO    = cert.issuer?.O   ?? ''
        const issuerFp   = cert.issuerCertificate?.fingerprint256
        const selfSigned = issuerFp
          ? cert.fingerprint256 === issuerFp
          : subjectCN === issuerCN && !issuerO

        // TLS version from socket
        const protocol = res.socket.getProtocol?.() ?? 'TLS'

        resolve({
          domain,
          valid,
          selfSigned,
          subject:        subjectCN,
          issuer:         issuerO || issuerCN,
          validFrom:      validFrom.toISOString().split('T')[0],
          validTo:        validTo.toISOString().split('T')[0],
          daysRemaining,
          protocol,
        })
      } catch (err) {
        resolve({ domain, valid: false, error: 'parse_error: ' + err.message })
      }
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({ domain, valid: false, error: 'timeout' })
    })

    req.on('error', (err) => {
      const code = err.code ?? err.message ?? 'connection_error'
      resolve({ domain, valid: false, error: code })
    })

    req.end()
  })
}
