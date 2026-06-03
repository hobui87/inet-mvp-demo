// SSL Health Dashboard — vanilla JS client: scan domains, render cert cards with progress bars and status badges

// ── DOM refs ─────────────────────────────────────────────

const domainsInput  = document.getElementById('domains-input')
const domainCounter = document.getElementById('domain-counter')
const btnScan       = document.getElementById('btn-scan')
const btnLabel      = document.getElementById('btn-label')
const btnClear      = document.getElementById('btn-clear')
const errorBanner   = document.getElementById('error-banner')
const errorMsg      = document.getElementById('error-msg')
const btnRetry      = document.getElementById('btn-retry')
const loadingEl     = document.getElementById('loading')
const resultsArea   = document.getElementById('results-area')
const resultsGrid   = document.getElementById('results-grid')
const emptyState    = document.getElementById('empty-state')
const a11yAnnounce  = document.getElementById('a11y-announce')
const sumTotal      = document.getElementById('sum-total')
const sumSafe       = document.getElementById('sum-safe')
const sumWarn       = document.getElementById('sum-warn')
const sumExpired    = document.getElementById('sum-expired')
const sumElapsed    = document.getElementById('sum-elapsed')

// ── Helpers ──────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseDomains() {
  return domainsInput.value
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function updateCounter() {
  const n = parseDomains().length
  domainCounter.textContent = `${n} domain`
}

// ── Status helpers ───────────────────────────────────────

function getStatusLabel(status, selfSigned) {
  if (selfSigned) return '⚠️ Self-signed'
  switch (status) {
    case 'valid':         return '✅ Hợp lệ'
    case 'expiring_soon': return '⚠️ Sắp hết hạn'
    case 'warning':       return '⚠️ Sắp hết hạn'
    case 'critical':      return '🔴 Nguy hiểm'
    case 'expired':       return '🔴 Đã hết hạn'
    default:              return '❌ Lỗi'
  }
}

function getBadgeClass(status, selfSigned) {
  if (selfSigned) return 'badge-warning'
  switch (status) {
    case 'valid':         return 'badge-valid'
    case 'expiring_soon':
    case 'warning':       return 'badge-warning'
    case 'critical':      return 'badge-critical'
    case 'expired':       return 'badge-expired'
    default:              return 'badge-error'
  }
}

function getCardClass(status, selfSigned) {
  if (selfSigned || status === 'expiring_soon' || status === 'warning') return 'card-warning'
  switch (status) {
    case 'valid':    return 'card-valid'
    case 'critical':
    case 'expired':  return 'card-critical'
    default:         return 'card-error'
  }
}

function getGradeStyle(grade) {
  switch (grade) {
    case 'A': return { bg: 'rgba(34,197,94,0.15)',   fg: '#22c55e' }
    case 'B': return { bg: 'rgba(34,197,94,0.10)',   fg: '#86efac' }
    case 'C': return { bg: 'rgba(245,158,11,0.15)',  fg: '#f59e0b' }
    case 'D': return { bg: 'rgba(239,68,68,0.12)',   fg: '#f87171' }
    default:  return { bg: 'rgba(100,116,139,0.15)', fg: '#94a3b8' }
  }
}

function getProgressColor(status, selfSigned) {
  if (selfSigned) return '#f59e0b'
  switch (status) {
    case 'valid':         return '#22c55e'
    case 'expiring_soon':
    case 'warning':       return '#f59e0b'
    case 'critical':
    case 'expired':       return '#ef4444'
    default:              return '#64748b'
  }
}

// progress width: max 365 days = 100%
function progressWidth(daysRemaining) {
  if (!daysRemaining || daysRemaining <= 0) return 0
  return Math.min(100, Math.round((daysRemaining / 365) * 100))
}

// ── Card renderer ────────────────────────────────────────

function renderCard(r) {
  const card = document.createElement('div')
  card.className = `domain-card ${getCardClass(r.status, r.selfSigned)}`
  card.setAttribute('role', 'listitem')

  const gradeStyle  = getGradeStyle(r.grade)
  const fillColor   = getProgressColor(r.status, r.selfSigned)
  const fillWidth   = progressWidth(r.daysRemaining)
  const badgeClass  = getBadgeClass(r.status, r.selfSigned)
  const statusLabel = getStatusLabel(r.status, r.selfSigned)

  const daysText = r.error
    ? 'N/A'
    : r.daysRemaining <= 0
      ? `Đã hết hạn ${Math.abs(r.daysRemaining)} ngày`
      : `${r.daysRemaining} ngày còn lại`

  const selfSignedTag = r.selfSigned
    ? `<span class="tag-self-signed">Self-signed</span>`
    : ''

  const protocolTag = r.protocol
    ? `<span class="tag-protocol">${escHtml(r.protocol)}</span>`
    : ''

  const metaRows = r.error
    ? `<div class="card-error-msg">Lỗi: ${escHtml(r.error)}</div>`
    : `
      <div class="meta-row">
        <span class="meta-label">Issuer</span>
        <span class="meta-value">${escHtml(r.issuer || '—')}${selfSignedTag}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Hết hạn</span>
        <span class="meta-value">${escHtml(r.validTo || '—')}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Từ</span>
        <span class="meta-value">${escHtml(r.validFrom || '—')}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Protocol</span>
        <span class="meta-value">${protocolTag || escHtml(r.protocol || '—')}</span>
      </div>
    `

  card.innerHTML = `
    <div class="card-top">
      <span class="card-domain">${escHtml(r.domain)}</span>
      <div class="card-grade" style="background:${gradeStyle.bg};color:${gradeStyle.fg}">${escHtml(r.grade ?? 'F')}</div>
    </div>
    <span class="status-badge ${badgeClass}">${statusLabel}</span>
    <div class="progress-section">
      <div class="progress-label">
        <span>Thời hạn</span>
        <span class="progress-days">${daysText}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${fillWidth}%;--fill-color:${fillColor}"></div>
      </div>
    </div>
    <div class="card-meta">${metaRows}</div>
  `

  return card
}

// ── Summary updater ──────────────────────────────────────

function updateSummary(results, elapsed) {
  const total   = results.length
  const safe    = results.filter((r) => r.status === 'valid' && !r.selfSigned).length
  const warn    = results.filter((r) =>
    r.selfSigned || r.status === 'expiring_soon' || r.status === 'warning' || r.status === 'critical'
  ).length
  const expired = results.filter((r) => r.status === 'expired' || r.status === 'error').length

  sumTotal.textContent   = total
  sumSafe.textContent    = safe
  sumWarn.textContent    = warn
  sumExpired.textContent = expired
  sumElapsed.textContent = `${elapsed}ms`
}

// ── Scan ─────────────────────────────────────────────────

let lastDomains = []

async function scan() {
  const domains = parseDomains()
  if (!domains.length) { domainsInput.focus(); return }

  lastDomains = domains

  // UI: loading state
  errorBanner.hidden  = true
  resultsArea.hidden  = true
  emptyState.hidden   = true
  loadingEl.hidden    = false
  btnScan.disabled    = true
  btnLabel.textContent = 'Scanning…'
  a11yAnnounce.textContent = `Đang quét ${domains.length} domain…`

  try {
    const res  = await fetch('./api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains }),
    })
    const data = await res.json()

    loadingEl.hidden = true

    if (!res.ok) {
      showError(data.error ?? `Lỗi server (${res.status})`)
      return
    }

    renderResults(data.results, data.elapsed_ms)
    a11yAnnounce.textContent = `Đã quét xong ${data.results.length} domain.`
  } catch {
    loadingEl.hidden = true
    showError('Không thể kết nối đến server. Hãy kiểm tra server đang chạy.')
  } finally {
    btnScan.disabled     = false
    btnLabel.textContent = 'Scan All'
  }
}

function renderResults(results, elapsed) {
  resultsGrid.innerHTML = ''
  results.forEach((r) => resultsGrid.appendChild(renderCard(r)))
  updateSummary(results, elapsed)
  resultsArea.hidden = false
}

function showError(message) {
  errorMsg.textContent = message
  errorBanner.hidden   = false
}

// ── Events ───────────────────────────────────────────────

btnScan.addEventListener('click', scan)

domainsInput.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); scan() }
})

domainsInput.addEventListener('input', updateCounter)

btnClear.addEventListener('click', () => {
  domainsInput.value    = ''
  domainCounter.textContent = '0 domain'
  resultsArea.hidden    = true
  errorBanner.hidden    = true
  emptyState.hidden     = false
  domainsInput.focus()
})

btnRetry.addEventListener('click', () => {
  errorBanner.hidden = true
  scan()
})

// ── Init ─────────────────────────────────────────────────

;(function init() {
  updateCounter()
  emptyState.hidden = domainsInput.value.trim().length > 0
})()
