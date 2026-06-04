// IP Reputation Checker — tab manager + scan + PTR/ASN/RBL render + history

const CIRCUMFERENCE = 565.49; // 2 * π * 90

const GRADE_COLORS = {
  'clean':     '#16a34a',
  'moderate':  '#d97706',
  'high-risk': '#dc2626',
};

const GRADE_LABELS = {
  'clean':     'Clean',
  'moderate':  'Moderate Risk',
  'high-risk': 'High Risk',
};

const ACTION_ICON_SVG = {
  'clean':     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  'moderate':  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  'high-risk': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

const SVG_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const SVG_X     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

// ── DOM refs ─────────────────────────────────────────────

const form           = document.getElementById('scan-form');
const input          = document.getElementById('ip-input');
const inputGroup     = document.getElementById('input-group');
const inputError     = document.getElementById('input-error');
const btnScan        = document.getElementById('btn-scan');
const btnLabel       = document.getElementById('btn-label');
const btnInputClear  = document.getElementById('btn-input-clear');
const btnMyip        = document.getElementById('btn-myip');
const resolvedBadge  = document.getElementById('resolved-badge');
const btnRescan      = document.getElementById('btn-rescan');
const btnRetry       = document.getElementById('btn-retry');
const results        = document.getElementById('results');
const loading        = document.getElementById('loading');
const errorBanner    = document.getElementById('error-banner');
const errorBannerMsg = document.getElementById('error-banner-msg');
const circleProgress = document.getElementById('circle-progress');
const scoreValue     = document.getElementById('score-value');
const gradeBadge     = document.getElementById('grade-badge');
const scannedIp      = document.getElementById('scanned-ip');
const scanTime       = document.getElementById('scan-time');
const actionSection  = document.getElementById('action-section');
const actionIcon     = document.getElementById('action-icon');
const actionText     = document.getElementById('action-text');
const ptrCard        = document.getElementById('ptr-card');
const ptrValue       = document.getElementById('ptr-value');
const ptrHint        = document.getElementById('ptr-hint');
const asnValue       = document.getElementById('asn-value');
const asnHint        = document.getElementById('asn-hint');
const blGrid         = document.getElementById('bl-grid');
const a11yAnnounce   = document.getElementById('a11y-announce');
const historyList    = document.getElementById('history-list');

// ── State ────────────────────────────────────────────────

let state = { status: 'idle', ip: '', result: null };

// ── IP / Domain helpers ──────────────────────────────────

function isIPv4(s) { return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s); }
function isIPv6(s) { return s.includes(':'); }
function isDomain(s) { return !isIPv4(s) && !isIPv6(s) && s.includes('.') && s.length >= 4; }

// ── Auto-detect my IP ────────────────────────────────────

async function detectMyIp() {
  btnMyip.disabled = true;
  btnMyip.classList.add('detecting');
  try {
    const res  = await fetch('./api/myip');
    const data = await res.json();
    if (data.ip) {
      input.value = data.ip;
      btnInputClear.hidden = false;
      resetInputError();
      return data.ip;
    }
  } catch { /* silent fail */ } finally {
    btnMyip.disabled = false;
    btnMyip.classList.remove('detecting');
  }
  return null;
}

btnMyip.addEventListener('click', async () => {
  const ip = await detectMyIp();
  if (ip) scan(ip);
});

// ── Tab manager ──────────────────────────────────────────

const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = { single: 'panel-single', history: 'panel-history' };

function activateTab(tabId) {
  tabBtns.forEach((btn) => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle('tab-active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  Object.entries(tabPanels).forEach(([key, panelId]) => {
    document.getElementById(panelId).hidden = (key !== tabId);
  });
  if (tabId === 'history') loadHistory();
}

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

document.querySelector('.tab-nav').addEventListener('keydown', (e) => {
  const tabs = [...tabBtns];
  const idx  = tabs.indexOf(document.activeElement);
  if (idx === -1) return;
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    const next = tabs[(idx + 1) % tabs.length];
    next.focus(); activateTab(next.dataset.tab);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
    prev.focus(); activateTab(prev.dataset.tab);
  }
});

// ── Render helpers ───────────────────────────────────────

function setGradeColor(grade) {
  document.documentElement.style.setProperty('--grade-color', GRADE_COLORS[grade] ?? GRADE_COLORS['clean']);
}

function renderScore(data) {
  const { score, grade, ip, duration_ms, resolved_from_domain } = data;
  setGradeColor(grade);
  circleProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);
  scoreValue.textContent = score;
  gradeBadge.textContent = GRADE_LABELS[grade] ?? grade;
  scannedIp.textContent  = resolved_from_domain ? `${ip} (${resolved_from_domain})` : ip;
  scanTime.textContent   = `Quét trong ${duration_ms}ms · ${new Date().toLocaleTimeString('vi-VN')}`;
}

function renderAction(data) {
  actionIcon.innerHTML  = ACTION_ICON_SVG[data.grade] ?? ACTION_ICON_SVG['clean'];
  actionText.textContent = data.recommended_action;
}

function renderPtrCard(ptr) {
  if (!ptr) return;
  ptrCard.classList.toggle('ptr-missing', !ptr.has_ptr);
  ptrCard.classList.toggle('ptr-ok', ptr.has_ptr);

  if (ptr.has_ptr) {
    ptrValue.textContent = ptr.ptr ?? '—';
    ptrHint.textContent  = '✅ rDNS hợp lệ — mail server được nhiều MTA tin tưởng hơn';
  } else {
    ptrValue.textContent = '⚠️ Không có PTR record';
    ptrHint.textContent  = 'Thiếu PTR record — một số mail server sẽ từ chối nhận mail từ IP này';
  }
}

function renderAsnCard(asn) {
  if (!asn) {
    asnValue.textContent = '—';
    asnHint.textContent  = 'Không lấy được thông tin ASN';
    return;
  }

  const flag = asn.countryCode ? `${asn.countryCode.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397))} ` : '';
  asnValue.textContent = `${asn.asn ?? ''}`;
  asnHint.textContent  = [
    asn.org ?? asn.isp ?? '',
    flag + (asn.country ?? ''),
  ].filter(Boolean).join(' · ');
}

function renderRblGrid(rblChecks) {
  blGrid.innerHTML = '';
  rblChecks.forEach((bl) => {
    const card = document.createElement('div');
    card.className = 'bl-card' + (bl.listed ? ' listed' : '');
    card.setAttribute('role', 'listitem');

    const icon = document.createElement('span');
    icon.className = 'bl-status-icon';
    icon.innerHTML = bl.listed ? SVG_X : SVG_CHECK;
    icon.setAttribute('aria-label', bl.listed ? 'Listed' : 'Clean');

    const info     = document.createElement('div');
    info.className = 'bl-info';

    const nameRow  = document.createElement('div');
    nameRow.className = 'bl-name';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = bl.name;
    nameRow.appendChild(nameSpan);

    if (bl.error && bl.error !== 'timeout') {
      const badge = document.createElement('span');
      badge.className = 'error-badge';
      badge.textContent = '⚡';
      badge.title = bl.error;
      nameRow.appendChild(badge);
    }

    const weight = document.createElement('div');
    weight.className = 'bl-weight';
    weight.textContent = `Trọng số: ${bl.weight}`;

    info.appendChild(nameRow);
    info.appendChild(weight);
    card.appendChild(icon);
    card.appendChild(info);
    blGrid.appendChild(card);
  });
}

function showResults(data) {
  loading.hidden = errorBanner.hidden = true;
  results.hidden = false;
  window.history.replaceState({}, '', `?ip=${encodeURIComponent(data.ip)}`);

  if (data.resolved_from_domain) {
    resolvedBadge.textContent = `Resolved từ ${data.resolved_from_domain} → ${data.ip}`;
    resolvedBadge.hidden = false;
  } else {
    resolvedBadge.hidden = true;
  }

  renderScore(data);
  renderAction(data);
  renderPtrCard(data.ptr);
  renderAsnCard(data.asn);
  renderRblGrid(data.rbl_checks);
  a11yAnnounce.textContent = `Kết quả: ${data.ip} — ${data.score}/100, ${GRADE_LABELS[data.grade] ?? data.grade}`;
}

function showLoading() {
  results.hidden = true;
  errorBanner.hidden = true;
  loading.hidden = false;
  btnScan.disabled = true;
  btnLabel.textContent = 'Scanning…';
  circleProgress.style.strokeDashoffset = CIRCUMFERENCE;
  a11yAnnounce.textContent = 'Đang quét RBL lists…';
}

function showError(message) {
  loading.hidden = results.hidden = true;
  errorBanner.hidden = false;
  errorBannerMsg.textContent = message;
  btnScan.disabled = false;
  btnLabel.textContent = 'Scan';
}

function resetInputError() {
  inputError.textContent = '';
  inputGroup.classList.remove('error');
}

function setInputError(msg) {
  inputError.textContent = msg;
  inputGroup.classList.add('error');
  input.focus();
}

// ── Scan fetch ───────────────────────────────────────────

async function scan(inputVal) {
  state = { status: 'submitting', ip: inputVal, result: null };
  showLoading();

  const body = isDomain(inputVal) ? { input: inputVal } : { ip: inputVal };

  try {
    const res  = await fetch('./api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (res.status === 400) {
      loading.hidden = true;
      btnScan.disabled = false;
      btnLabel.textContent = 'Scan';
      setInputError(data.error ?? 'IP hoặc tên miền không hợp lệ');
      state.status = 'error';
      return;
    }
    if (!res.ok) {
      showError(`Lỗi server (${res.status}). Thử lại sau.`);
      state.status = 'error';
      return;
    }

    state = { status: 'success', ip: data.ip ?? inputVal, result: data };
    btnScan.disabled = false;
    btnLabel.textContent = 'Scan';
    showResults(data);
  } catch {
    showError('Không thể kết nối đến server. Thử lại sau.');
    state.status = 'error';
  }
}

// ── Events ───────────────────────────────────────────────

form.addEventListener('submit', (e) => {
  e.preventDefault();
  resetInputError();
  const val = input.value.trim();
  if (!val) { setInputError('Vui lòng nhập địa chỉ IP hoặc tên miền'); return; }
  scan(val);
});

input.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); }
});

btnRescan.addEventListener('click', () => {
  resetInputError();
  if (state.ip) scan(state.ip);
});

btnRetry.addEventListener('click', () => {
  if (state.ip) scan(state.ip);
  else { errorBanner.hidden = true; input.focus(); }
});

input.addEventListener('input', () => {
  resetInputError();
  btnInputClear.hidden = !input.value;
});

btnInputClear.addEventListener('click', () => {
  input.value = '';
  btnInputClear.hidden = true;
  resetInputError();
  input.focus();
});

document.querySelectorAll('.chip[data-ip]').forEach((chip) => {
  chip.addEventListener('click', () => {
    const ip = chip.dataset.ip;
    input.value = ip;
    btnInputClear.hidden = false;
    resetInputError();
    scan(ip);
  });
});

// ── History ──────────────────────────────────────────────

async function loadHistory() {
  historyList.innerHTML = '<p class="empty-state">Đang tải…</p>';
  try {
    const res  = await fetch('./api/history?limit=30');
    const data = await res.json();

    if (!data.history?.length) {
      historyList.innerHTML = '<p class="empty-state">Chưa có lịch sử. Hãy quét một IP trước.</p>';
      return;
    }
    renderHistory(data.history);
  } catch {
    historyList.innerHTML = '<p class="empty-state">Không thể tải lịch sử.</p>';
  }
}

function renderHistory(rows) {
  historyList.innerHTML = '';
  rows.forEach((row) => {
    const gradeClass = row.grade === 'clean' ? 'grade-clean' :
                       row.grade === 'moderate' ? 'grade-moderate' : 'grade-risk';
    const time = new Date(row.scanned_at).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-item-left">
        <button class="history-ip" data-ip="${escHtml(row.ip)}">${escHtml(row.ip)}</button>
        <span class="history-time">${time}</span>
      </div>
      <div class="history-item-right">
        <span class="grade-pill ${gradeClass}">${GRADE_LABELS[row.grade] ?? row.grade}</span>
        <span class="history-score">${row.score}</span>
      </div>
    `;
    historyList.appendChild(item);
  });

  historyList.querySelectorAll('.history-ip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activateTab('single');
      input.value = btn.dataset.ip;
      btnInputClear.hidden = false;
      scan(btn.dataset.ip);
    });
  });
}

document.getElementById('btn-refresh-history').addEventListener('click', loadHistory);

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init — auto-scan từ URL query param, pre-fill my IP ──

(function init() {
  const ip = new URLSearchParams(location.search).get('ip');
  if (ip) {
    input.value = ip;
    btnInputClear.hidden = false;
    scan(ip);
  } else {
    input.focus();
    setTimeout(async () => {
      if (!input.value) {
        const detected = await detectMyIp();
        if (detected) resolvedBadge.hidden = true;
      }
    }, 300);
  }
}());
