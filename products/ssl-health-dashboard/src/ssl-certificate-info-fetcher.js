// Fetches SSL certificate details from a domain using node:https — returns cert validity, issuer, expiry, daysRemaining
import https from 'node:https'

/**
 * @param {string} domain
 * @returns {Promise<{domain, valid, subject, issuer, validFrom, validTo, daysRemaining, protocol, error?}>}
 */
export function fetchSslCertInfo(domain) {
  return new Promise((resolve) => {
    const options = {
      host: domain,
      port: 443,
      method: 'HEAD',
      rejectUnauthorized: false,
      timeout: 5000,
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

        // Detect self-signed: issuer CN === subject CN and no issuer O
        const subjectCN  = cert.subject?.CN ?? ''
        const issuerCN   = cert.issuer?.CN  ?? ''
        const issuerO    = cert.issuer?.O   ?? ''
        const selfSigned = subjectCN === issuerCN && !issuerO

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
