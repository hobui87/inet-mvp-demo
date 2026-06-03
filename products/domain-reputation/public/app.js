// Domain Reputation Monitor — tab manager + single scan + bulk scan + history + CSV export

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

// SVG icons — replace emoji for accessibility and consistency
const ACTION_ICON_SVG = {
  'clean':     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  'moderate':  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  'high-risk': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

const SVG_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const SVG_X     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

// ── DOM refs — single scan ───────────────────────────────

const form          = document.getElementById('scan-form');
const input         = document.getElementById('domain-input');
const inputGroup    = document.getElementById('input-group');
const inputError    = document.getElementById('input-error');
const btnScan       = document.getElementById('btn-scan');
const btnLabel      = document.getElementById('btn-label');
const btnInputClear = document.getElementById('btn-input-clear');
const btnRescan     = document.getElementById('btn-rescan');
const btnRetry      = document.getElementById('btn-retry');
const results       = document.getElementById('results');
const loading       = document.getElementById('loading');
const errorBanner   = document.getElementById('error-banner');
const errorBannerMsg= document.getElementById('error-banner-msg');
const circleProgress= document.getElementById('circle-progress');
const scoreValue    = document.getElementById('score-value');
const gradeBadge    = document.getElementById('grade-badge');
const scannedDomain = document.getElementById('scanned-domain');
const scanTime      = document.getElementById('scan-time');
const actionSection = document.getElementById('action-section');
const actionIcon    = document.getElementById('action-icon');
const actionText    = document.getElementById('action-text');
const blGrid        = document.getElementById('bl-grid');
const a11yAnnounce  = document.getElementById('a11y-announce');

// ── DOM refs — bulk scan ─────────────────────────────────

const bulkInput        = document.getElementById('bulk-input');
const bulkCount        = document.getElementById('bulk-count');
const btnBulkScan      = document.getElementById('btn-bulk-scan');
const btnBulkClear     = document.getElementById('btn-bulk-clear');
const bulkBtnLabel     = document.getElementById('bulk-btn-label');
const bulkProgress     = document.getElementById('bulk-progress');
const bulkBar          = document.getElementById('bulk-bar');
const bulkProgressLabel= document.getElementById('bulk-progress-label');
const bulkResultsEl    = document.getElementById('bulk-results');
const bulkTbody        = document.getElementById('bulk-tbody');
const bulkErrorsEl     = document.getElementById('bulk-errors');
const btnExportCsv     = document.getElementById('btn-export-csv');

// ── DOM refs — history ───────────────────────────────────

const historyList       = document.getElementById('history-list');
const btnRefreshHistory = document.getElementById('btn-refresh-history');

// ── State ────────────────────────────────────────────────

let state = { status: 'idle', domain: '', result: null };
let lastBulkResults = [];

// ── Tour guide — bulk hint (first-time only) ─────────────

const BULK_HINT_KEY  = 'drc-bulk-hint-seen';
const bulkHintTour   = document.getElementById('bulk-hint-tour');
const btnDismissHint = document.getElementById('btn-dismiss-hint');

function showBulkHint() {
  if (localStorage.getItem(BULK_HINT_KEY)) return;
  bulkHintTour.hidden = false;
  // Auto-dismiss after 7 seconds
  setTimeout(dismissBulkHint, 7000);
}

function dismissBulkHint() {
  if (bulkHintTour.hidden) return;
  bulkHintTour.hidden = true;
  localStorage.setItem(BULK_HINT_KEY, '1');
}

btnDismissHint.addEventListener('click', dismissBulkHint);

// ── Tab manager ──────────────────────────────────────────

const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = { single: 'panel-single', bulk: 'panel-bulk', history: 'panel-history' };

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
  if (tabId === 'bulk')    showBulkHint();
}

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// Arrow key navigation within tab list (ARIA tablist pattern)
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

// ── Single scan — render ─────────────────────────────────

function setGradeColor(grade) {
  document.documentElement.style.setProperty('--grade-color', GRADE_COLORS[grade] ?? GRADE_COLORS['clean']);
}

function renderScore(result) {
  const { score, grade, domain, duration_ms } = result;
  setGradeColor(grade);
  circleProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);
  scoreValue.textContent  = score;
  gradeBadge.textContent  = GRADE_LABELS[grade] ?? grade;
  scannedDomain.textContent = domain;
  scanTime.textContent    = `Quét trong ${duration_ms}ms · ${new Date().toLocaleTimeString('vi-VN')}`;
}

function renderAction(result) {
  actionIcon.innerHTML  = ACTION_ICON_SVG[result.grade] ?? ACTION_ICON_SVG['clean'];
  actionText.textContent = result.recommended_action;
}

function renderGrid(checks) {
  blGrid.innerHTML = '';
  checks.forEach((bl) => {
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

    if (bl.noKey) {
      const badge = document.createElement('span');
      badge.className = 'mock-badge';
      badge.textContent = 'no key';
      badge.title = 'Set GOOGLE_SAFE_BROWSING_API_KEY to enable';
      nameRow.appendChild(badge);
    }
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

function showResults(result) {
  loading.hidden = errorBanner.hidden = true;
  results.hidden = false;
  history.replaceState({}, '', `?domain=${encodeURIComponent(result.domain)}`);
  renderScore(result);
  renderAction(result);
  renderGrid(result.checks);
  a11yAnnounce.textContent = `Kết quả: ${result.domain} — ${result.score}/100, ${GRADE_LABELS[result.grade] ?? result.grade}`;
}

function showLoading() {
  results.hidden = true;
  errorBanner.hidden = true;
  loading.hidden = false;
  btnScan.disabled = true;
  btnLabel.textContent = 'Scanning…';
  circleProgress.style.strokeDashoffset = CIRCUMFERENCE;
  a11yAnnounce.textContent = 'Đang quét blocklist…';
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

// ── Single scan — fetch ──────────────────────────────────

async function scan(domain) {
  state = { status: 'submitting', domain, result: null };
  showLoading();

  try {
    const res  = await fetch('./api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();

    if (res.status === 400) {
      loading.hidden = true;
      btnScan.disabled = false;
      btnLabel.textContent = 'Scan';
      setInputError(data.error ?? 'Domain không hợp lệ');
      state.status = 'error';
      return;
    }
    if (!res.ok) {
      showError(`Lỗi server (${res.status}). Thử lại sau.`);
      state.status = 'error';
      return;
    }

    state = { status: 'success', domain, result: data };
    btnScan.disabled = false;
    btnLabel.textContent = 'Scan';
    showResults(data);
  } catch {
    showError('Không thể kết nối đến server. Thử lại sau.');
    state.status = 'error';
  }
}

// ── Single scan — events ─────────────────────────────────

form.addEventListener('submit', (e) => {
  e.preventDefault();
  resetInputError();
  const domain = input.value.trim();
  if (!domain) { setInputError('Vui lòng nhập tên miền'); return; }
  scan(domain);
});

// Ctrl+Enter shortcut for single scan
input.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); }
});

btnRescan.addEventListener('click', () => {
  resetInputError();
  if (state.domain) scan(state.domain);
});

btnRetry.addEventListener('click', () => {
  if (state.domain) scan(state.domain);
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

document.querySelectorAll('.chip[data-domain]').forEach((chip) => {
  chip.addEventListener('click', () => {
    const domain = chip.dataset.domain;
    input.value = domain;
    resetInputError();
    scan(domain);
  });
});

// ── Bulk scan ────────────────────────────────────────────

// Ctrl+Enter in bulk textarea triggers scan
document.getElementById('bulk-input').addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); btnBulkScan.click(); }
});

function parseBulkInput() {
  return bulkInput.value
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

bulkInput.addEventListener('input', () => {
  const domains = parseBulkInput();
  const n = domains.length;
  bulkCount.textContent     = `${n} domain`;
  bulkBtnLabel.textContent  = n > 0 ? `Quét ${n} domain` : 'Quét tất cả';
  // Dismiss hint khi user bắt đầu nhập
  if (n > 0) dismissBulkHint();
});

btnBulkClear.addEventListener('click', () => {
  bulkInput.value = '';
  bulkCount.textContent = '0 domain';
  bulkResultsEl.hidden = true;
  bulkProgress.hidden  = true;
});

btnBulkScan.addEventListener('click', async () => {
  const domains = parseBulkInput();
  if (!domains.length) { bulkInput.focus(); return; }

  btnBulkScan.disabled   = true;
  bulkBtnLabel.textContent = 'Đang quét…';
  bulkResultsEl.hidden   = true;
  bulkProgress.hidden    = false;
  bulkBar.style.width    = '0%';
  bulkProgressLabel.textContent = `0 / ${domains.length}`;

  // Animate progress bar (server processes all at once — fake incremental UX)
  let tick = 0;
  const total = domains.length;
  const fakeInterval = setInterval(() => {
    tick = Math.min(tick + 1, total - 1);
    bulkBar.style.width = `${Math.round((tick / total) * 90)}%`;
    bulkProgressLabel.textContent = `${tick} / ${total}`;
  }, 300);

  try {
    const res  = await fetch('./api/bulk-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains }),
    });
    const data = await res.json();

    clearInterval(fakeInterval);
    bulkBar.style.width = '100%';
    bulkProgressLabel.textContent = `Xong ${data.results?.length ?? 0} / ${total} · ${data.duration_ms}ms`;

    if (!res.ok) {
      bulkProgressLabel.textContent = data.error ?? 'Lỗi server';
    } else {
      lastBulkResults = data.results ?? [];
      renderBulkResults(data);
    }
  } catch {
    clearInterval(fakeInterval);
    bulkProgressLabel.textContent = 'Không thể kết nối đến server';
  } finally {
    btnBulkScan.disabled   = false;
    bulkBtnLabel.textContent = 'Quét tất cả';
  }
});

function renderBulkResults(data) {
  bulkTbody.innerHTML = '';

  data.results.forEach((r) => {
    const tr = document.createElement('tr');
    const listed = r.checks.filter((c) => c.listed).map((c) => c.name);
    const gradeClass = r.grade === 'clean' ? 'grade-clean' :
                       r.grade === 'moderate' ? 'grade-moderate' : 'grade-risk';

    tr.innerHTML = `
      <td class="bulk-td-domain">
        <button class="bulk-domain-link" data-domain="${escHtml(r.domain)}">${escHtml(r.domain)}</button>
      </td>
      <td>
        <div class="bulk-score-bar">
          <div class="bulk-score-fill ${gradeClass}" style="width:${r.score}%"></div>
          <span class="bulk-score-num">${r.score}</span>
        </div>
      </td>
      <td><span class="grade-pill ${gradeClass}">${GRADE_LABELS[r.grade] ?? r.grade}</span></td>
      <td class="bulk-td-listed">${listed.length ? escHtml(listed.join(', ')) : '<span class="text-muted">—</span>'}</td>
    `;
    bulkTbody.appendChild(tr);
  });

  // Click domain → switch to single tab and scan
  bulkTbody.querySelectorAll('.bulk-domain-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      activateTab('single');
      input.value = btn.dataset.domain;
      scan(btn.dataset.domain);
    });
  });

  // Errors
  if (data.errors?.length) {
    bulkErrorsEl.hidden = false;
    bulkErrorsEl.textContent = `Lỗi: ${data.errors.map((e) => `${e.domain} (${e.error})`).join(', ')}`;
  } else {
    bulkErrorsEl.hidden = true;
  }

  bulkResultsEl.hidden = false;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── CSV export ───────────────────────────────────────────

btnExportCsv.addEventListener('click', () => {
  if (!lastBulkResults.length) return;
  const header = 'domain,score,grade,listed_in\n';
  const rows = lastBulkResults.map((r) => {
    const listed = r.checks.filter((c) => c.listed).map((c) => c.name).join('; ');
    return `${csvCell(r.domain)},${r.score},${csvCell(r.grade)},${csvCell(listed)}`;
  });
  const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `domain-reputation-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function csvCell(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── History ──────────────────────────────────────────────

async function loadHistory() {
  historyList.innerHTML = '<p class="empty-state">Đang tải…</p>';
  try {
    const res  = await fetch('./api/history?limit=30');
    const data = await res.json();

    if (!data.history?.length) {
      historyList.innerHTML = '<p class="empty-state">Chưa có lịch sử. Hãy quét một domain trước.</p>';
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
        <button class="bulk-domain-link history-domain" data-domain="${escHtml(row.domain)}">${escHtml(row.domain)}</button>
        <span class="history-time">${time}</span>
      </div>
      <div class="history-item-right">
        <span class="grade-pill ${gradeClass}">${GRADE_LABELS[row.grade] ?? row.grade}</span>
        <span class="history-score">${row.score}</span>
      </div>
    `;
    historyList.appendChild(item);
  });

  historyList.querySelectorAll('.history-domain').forEach((btn) => {
    btn.addEventListener('click', () => {
      activateTab('single');
      input.value = btn.dataset.domain;
      scan(btn.dataset.domain);
    });
  });
}

btnRefreshHistory.addEventListener('click', loadHistory);

// ── URL query param auto-scan on load ────────────────────

(function init() {
  const domain = new URLSearchParams(location.search).get('domain');
  if (domain) {
    input.value = domain;
    btnInputClear.hidden = false;
    scan(domain);
  } else {
    input.focus();
  }
}());
