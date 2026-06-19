// Calculates SSL health score (0-100) and grade (A/B/C/D/F) based on certificate daysRemaining and validity

// RSA keys below this many bits are considered weak (NIST SP 800-57)
const WEAK_RSA_BITS = 2048

/**
 * @param {{ daysRemaining: number, valid: boolean, selfSigned?: boolean, error?: string, keyType?: string, keyBits?: number|null }} certInfo
 * @returns {{ score: number, grade: string, status: string }}
 */
export function calculateSslHealthScore(certInfo) {
  const { daysRemaining, valid, selfSigned, error, keyType, keyBits } = certInfo

  let score = 0
  let status = 'error'

  if (error || daysRemaining === undefined) {
    score = 0
    status = 'error'
  } else if (!valid || daysRemaining <= 0) {
    score = 0
    status = 'expired'
  } else if (selfSigned) {
    // Untrusted: not expired, but not a CA-issued production cert
    score = 40
    status = 'self_signed'
  } else if (daysRemaining <= 7) {
    score = 20
    status = 'critical'
  } else if (daysRemaining <= 30) {
    score = 50
    status = 'warning'
  } else if (daysRemaining <= 90) {
    score = 80
    status = 'expiring_soon'
  } else {
    score = 100
    status = 'valid'
  }

  // Weak-key penalty: a trusted, unexpired cert with an undersized RSA key is
  // still a real security weakness. Cap the score and flag it. Only applied to
  // healthy certs (valid/expiring_soon) — for warning/critical/expired certs the
  // expiry is the dominant concern, so we don't override their status.
  if (status === 'valid' || status === 'expiring_soon') {
    if (keyType === 'RSA' && keyBits && keyBits < WEAK_RSA_BITS) {
      score = Math.min(score, 60)
      status = 'weak_key'
    }
  }

  const grade = score >= 90 ? 'A'
    : score >= 75 ? 'B'
    : score >= 50 ? 'C'
    : score >= 20 ? 'D'
    : 'F'

  return { score, grade, status }
}
