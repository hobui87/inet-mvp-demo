// Extracts deep real-data details from a Node TLS peer certificate + socket:
// key algorithm/strength, SAN list, issuer chain, cipher, serial number.

const MAX_CHAIN_DEPTH = 10

/**
 * Key algorithm + strength from a peer certificate.
 * RSA exposes `bits` + `modulus`; EC exposes `nistCurve`/`asn1Curve`.
 * @returns {{ keyType: string, keyStrength: string, keyBits: number|null }}
 */
export function extractKeyInfo(cert) {
  const curve = cert.nistCurve || cert.asn1Curve
  if (curve) {
    return { keyType: 'EC', keyStrength: curve, keyBits: null }
  }
  if (cert.bits) {
    return { keyType: 'RSA', keyStrength: `${cert.bits}-bit`, keyBits: cert.bits }
  }
  return { keyType: 'unknown', keyStrength: '—', keyBits: null }
}

/**
 * Subject Alternative Names — the domains a cert actually covers.
 * `subjectaltname` is "DNS:a.com, DNS:*.b.com" → ['a.com', '*.b.com'].
 * @returns {string[]}
 */
export function extractSanList(cert) {
  if (!cert.subjectaltname) return []
  return cert.subjectaltname
    .split(',')
    .map((entry) => entry.trim().replace(/^(DNS|IP Address|IP|email|URI|otherName):/i, ''))
    .filter(Boolean)
}

/**
 * Walk the issuer chain from leaf to root. Node links each cert to its issuer
 * via `issuerCertificate`; the root points back to itself (self-referential
 * fingerprint), which terminates the walk.
 * @returns {Array<{ subject: string, issuer: string }>}
 */
export function extractChain(cert) {
  const chain = []
  let node = cert
  let depth = 0

  while (node && depth < MAX_CHAIN_DEPTH) {
    const subject = node.subject?.CN || node.subject?.O || '—'
    const issuer  = node.issuer?.O  || node.issuer?.CN || '—'
    chain.push({ subject, issuer })

    const next = node.issuerCertificate
    // Root reached: issuer chain points back to itself, or no further link.
    // Guard fingerprint256 presence — if undefined on both, `undefined === undefined`
    // would falsely terminate at the leaf (chainDepth 1) on malformed chains.
    if (!next || (node.fingerprint256 && next.fingerprint256 === node.fingerprint256)) break
    node = next
    depth++
  }

  return chain
}

/**
 * TLS cipher + protocol negotiated on the live socket.
 * @returns {{ cipher: string|null, tlsVersion: string|null }}
 */
export function extractCipher(socket) {
  const c = socket.getCipher?.()
  return {
    cipher:     c?.name ?? null,
    tlsVersion: c?.version ?? socket.getProtocol?.() ?? null,
  }
}

/**
 * HSTS from the live response headers. Parses max-age when present.
 * @returns {{ hsts: boolean, hstsMaxAge: number|null }}
 */
export function extractHsts(headers) {
  const raw = headers?.['strict-transport-security']
  if (!raw) return { hsts: false, hstsMaxAge: null }
  const match = /max-age=(\d+)/i.exec(raw)
  return { hsts: true, hstsMaxAge: match ? Number(match[1]) : null }
}
