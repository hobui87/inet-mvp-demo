// Calculates SSL health score (0-100) and grade (A/B/C/D/F) based on certificate daysRemaining and validity

/**
 * @param {{ daysRemaining: number, valid: boolean, selfSigned?: boolean, error?: string }} certInfo
 * @returns {{ score: number, grade: string, status: string }}
 */
export function calculateSslHealthScore(certInfo) {
  const { daysRemaining, valid, selfSigned, error } = certInfo

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

  const grade = score >= 90 ? 'A'
    : score >= 75 ? 'B'
    : score >= 50 ? 'C'
    : score >= 20 ? 'D'
    : 'F'

  return { score, grade, status }
}
