// N22 Email Auth Checker — Frontend: fetch /api/check, render score circle + auth cards + fix guide accordion

// r=80 → circumference = 2 * π * 80 ≈ 502.65
const CIRCUMFERENCE = 502.65;

const GRADE_COLORS = {
  A: '#16a34a', B: '#22c55e', C: '#d97706', D: '#f97316', F: '#dc2626',
};

const STATUS_ICONS = {
  ok:    '✅',
  warn:  '⚠️',
  error: '❌',
};

const SUMMARY_ICON_SVG = {
  A: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  B: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  C: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  D: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  F: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

// ── DOM refs ─────────────────────────────────────────────
const form          = document.getElementById('scan-form');
const input         = document.getElementById('domain-input');
const inputGroup    = document.getElementById('input-group');
const inputError    = document.getElementById('input-error');
const btnCheck      = document.getElementById('btn-check');
const btnLabel      = document.getElementById('btn-label');
const btnInputClear = document.getElementById('btn-input-clear');
const btnRescan     = document.getElementById('btn-rescan');
const btnRetry      = document.getElementById('btn-retry');
const btnShare      = document.getElementById('btn-share');
const btnShareLabel = document.getElementById('btn-share-label');
const results       = document.getElementById('results');
const loading       = document.getElementById('loading');
const errorBanner   = document.getElementById('error-banner');
const errorBannerMsg= document.getElementById('error-banner-msg');
const circleProgress= document.getElementById('circle-progress');
const scoreValue    = document.getElementById('score-value');
const gradeBadge    = document.getElementById('grade-badge');
const gradeLabelText= document.getElementById('grade-label-text');
const scannedDomain = document.getElementById('scanned-domain');
const scanTime      = document.getElementById('scan-time');
const summarySection= document.getElementById('summary-section');
const summaryIcon   = document.getElementById('summary-icon');
const summaryText   = document.getElementById('summary-text');
const authCards     = document.getElementById('auth-cards');
const fixGuideList  = document.getElementById('fix-guide-list');
const a11yAnnounce  = document.getElementById('a11y-announce');

// ── State ─────────────────────────────────────────────────
let state = { status: 'idle', domain: '', result: null };

// ── Helpers ───────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setGradeColor(grade) {
  document.documentElement.style.setProperty('--grade-color', GRADE_COLORS[grade] ?? GRADE_COLORS['C']);
}

// ── Loading / error states ────────────────────────────────
function showLoading() {
  results.hidden = true;
  errorBanner.hidden = true;
  loading.hidden = false;
  btnCheck.disabled = true;
  btnLabel.textContent = 'Đang kiểm tra…';
  a11yAnnounce.textContent = 'Đang kiểm tra email authentication…';
}

function showError(message) {
  loading.hidden = true;
  results.hidden = true;
  errorBanner.hidden = false;
  errorBannerMsg.textContent = message;
  btnCheck.disabled = false;
  btnLabel.textContent = 'Kiểm tra ngay';
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

// ── Render score circle ───────────────────────────────────
function renderScore(data) {
  const { score, grade, grade_label, domain, elapsed_ms } = data;
  setGradeColor(grade);
  circleProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);
  scoreValue.textContent    = score;
  gradeBadge.textContent    = `Hạng ${grade}`;
  gradeLabelText.textContent = grade_label;
  scannedDomain.textContent = domain;
  scanTime.textContent      = `Kiểm tra trong ${elapsed_ms}ms · ${new Date().toLocaleTimeString('vi-VN')}`;
}

// ── Render summary box ────────────────────────────────────
function renderSummary(data) {
  const color = GRADE_COLORS[data.grade] ?? GRADE_COLORS['C'];
  summarySection.style.setProperty('--grade-color', color);
  summaryIcon.innerHTML  = SUMMARY_ICON_SVG[data.grade] ?? SUMMARY_ICON_SVG['C'];
  summaryText.textContent = data.summary;
}

// ── Render auth cards (SPF / DKIM / DMARC) ───────────────
function renderAuthCards(data) {
  authCards.innerHTML = '';

  const cards = [
    {
      id: 'spf',
      name: 'SPF',
      desc: 'Sender Policy Framework',
      status: !data.spf.exists ? 'error' : data.spf.policy === 'strict' ? 'ok' : 'warn',
      statusText: !data.spf.exists
        ? 'Chưa có record'
        : data.spf.policy === 'strict' ? 'Strict (-all) ✓'
        : data.spf.policy === 'softfail' ? 'Softfail (~all)'
        : data.spf.policy === 'neutral' ? 'Neutral (?all)'
        : 'Tồn tại',
      detail: data.spf.record
        ? data.spf.record.slice(0, 80) + (data.spf.record.length > 80 ? '…' : '')
        : 'Không tìm thấy TXT record v=spf1',
    },
    {
      id: 'dkim',
      name: 'DKIM',
      desc: 'DomainKeys Identified Mail',
      status: data.dkim.exists ? 'ok' : 'error',
      statusText: data.dkim.exists
        ? `Tìm thấy selector: ${data.dkim.selectors_found.join(', ')}`
        : 'Không tìm thấy selector',
      detail: data.dkim.exists
        ? `Public key: ${data.dkim.public_key_snippet ?? '(có)'}`
        : `Đã thử 8 selectors: ${data.dkim.selectors_checked.join(', ')}`,
    },
    {
      id: 'dmarc',
      name: 'DMARC',
      desc: 'Message Authentication Reporting',
      status: !data.dmarc.exists ? 'error'
        : data.dmarc.policy === 'reject' ? 'ok'
        : data.dmarc.policy === 'quarantine' ? 'warn'
        : 'warn',
      statusText: !data.dmarc.exists ? 'Chưa có record'
        : data.dmarc.policy === 'reject' ? 'Reject ✓'
        : data.dmarc.policy === 'quarantine' ? 'Quarantine'
        : 'None (chỉ theo dõi)',
      detail: data.dmarc.record
        ? data.dmarc.record.slice(0, 80) + (data.dmarc.record.length > 80 ? '…' : '')
        : 'Không tìm thấy TXT record _dmarc',
    },
  ];

  cards.forEach(card => {
    const el = document.createElement('div');
    el.className = `auth-card status-${card.status}`;
    el.setAttribute('role', 'listitem');
    el.innerHTML = `
      <div class="auth-card-header">
        <span class="auth-card-icon" aria-hidden="true">${STATUS_ICONS[card.status]}</span>
        <div>
          <div class="auth-card-name">${escHtml(card.name)}</div>
          <div style="font-size:11px;color:var(--muted)">${escHtml(card.desc)}</div>
        </div>
      </div>
      <div class="auth-card-status">${escHtml(card.statusText)}</div>
      <div class="auth-card-detail">${escHtml(card.detail)}</div>
    `;
    authCards.appendChild(el);
  });
}

// ── Render score breakdown bars ───────────────────────────
function renderBreakdown(data) {
  const { spf_score, dkim_score, dmarc_score } = data.breakdown;
  document.getElementById('bar-spf').style.width   = `${(spf_score  / 30) * 100}%`;
  document.getElementById('bar-dkim').style.width  = `${(dkim_score / 35) * 100}%`;
  document.getElementById('bar-dmarc').style.width = `${(dmarc_score/ 35) * 100}%`;
  document.getElementById('score-spf').textContent   = `${spf_score}/30`;
  document.getElementById('score-dkim').textContent  = `${dkim_score}/35`;
  document.getElementById('score-dmarc').textContent = `${dmarc_score}/35`;
}

// ── Render fix guide accordion ────────────────────────────
function renderFixGuide(fixGuide) {
  fixGuideList.innerHTML = '';

  fixGuide.forEach((section, idx) => {
    const item = document.createElement('div');
    item.className = `accordion-item status-${section.status}`;

    const triggerId = `accordion-trigger-${idx}`;
    const bodyId    = `accordion-body-${idx}`;
    const isOk      = section.status === 'ok';

    item.innerHTML = `
      <button class="accordion-trigger" id="${triggerId}"
        aria-expanded="${isOk ? 'false' : 'true'}"
        aria-controls="${bodyId}">
        <span class="accordion-icon" aria-hidden="true">${STATUS_ICONS[section.status]}</span>
        <span class="accordion-title">${escHtml(section.title)}</span>
        <span class="accordion-status-badge">${escHtml(section.status_text)}</span>
        <svg class="accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="accordion-body" id="${bodyId}" ${isOk ? 'hidden' : ''}>
        ${_buildAccordionBody(section)}
      </div>
    `;

    // Toggle accordion
    const trigger = item.querySelector('.accordion-trigger');
    const body    = item.querySelector('.accordion-body');
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      body.hidden = expanded;
    });

    fixGuideList.appendChild(item);
  });
}

function _buildAccordionBody(section) {
  let html = '';

  if (section.issues?.length) {
    html += `<div class="guide-issues">
      <div class="guide-issues-title">Vấn đề phát hiện</div>
      ${section.issues.map(i => `<div class="guide-issue-item">${escHtml(i)}</div>`).join('')}
    </div>`;
  }

  if (section.steps?.length) {
    html += `<div class="guide-steps">
      <div class="guide-steps-title">Các bước khắc phục</div>
      ${section.steps.map((s, i) => `
        <div class="guide-step-item">
          <span class="step-num">${i + 1}</span>
          <span>${escHtml(s)}</span>
        </div>`).join('')}
    </div>`;
  }

  if (section.dns_template) {
    const copyId = `copy-btn-${section.id}`;
    html += `<div class="dns-template-block">
      <div class="dns-template-header">
        <span class="dns-template-label">DNS Record Template</span>
        <button class="btn-copy-dns" id="${copyId}" data-copy="${escHtml(section.dns_template)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Sao chép
        </button>
      </div>
      <pre class="dns-template-code">${escHtml(section.dns_template)}</pre>
      ${section.dns_template_note ? `<p class="dns-template-note">${escHtml(section.dns_template_note)}</p>` : ''}
    </div>`;
  }

  return html;
}

// ── Wire up copy buttons after render ────────────────────
function wireCopyButtons() {
  fixGuideList.querySelectorAll('.btn-copy-dns').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ Đã sao chép';
        btn.classList.add('copied');
        setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
      } catch {
        // fallback: select text
        const pre = btn.closest('.dns-template-block').querySelector('pre');
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(pre);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  });
}

// ── Show full results ─────────────────────────────────────
function showResults(data) {
  loading.hidden = true;
  errorBanner.hidden = true;
  results.hidden = false;
  btnCheck.disabled = false;
  btnLabel.textContent = 'Kiểm tra ngay';

  window.history.replaceState({}, '', `?domain=${encodeURIComponent(data.domain)}`);

  renderScore(data);
  renderSummary(data);
  renderAuthCards(data);
  renderBreakdown(data);
  renderFixGuide(data.fix_guide);
  wireCopyButtons();

  a11yAnnounce.textContent =
    `Kết quả ${data.domain}: ${data.score}/100, hạng ${data.grade} — ${data.grade_label}`;
}

// ── Fetch /api/check ──────────────────────────────────────
async function check(domain) {
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
      btnCheck.disabled = false;
      btnLabel.textContent = 'Kiểm tra ngay';
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
    showResults(data);
  } catch {
    showError('Không thể kết nối đến server. Thử lại sau.');
    state.status = 'error';
    btnCheck.disabled = false;
    btnLabel.textContent = 'Kiểm tra ngay';
  }
}

// ── Events ────────────────────────────────────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();
  resetInputError();
  const domain = input.value.trim();
  if (!domain) { setInputError('Vui lòng nhập tên miền'); return; }
  check(domain);
});

input.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); }
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

btnRescan.addEventListener('click', () => {
  resetInputError();
  if (state.domain) check(state.domain);
});

btnRetry.addEventListener('click', () => {
  if (state.domain) check(state.domain);
  else { errorBanner.hidden = true; input.focus(); }
});

// Share button — copy URL to clipboard
btnShare.addEventListener('click', async () => {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    btnShareLabel.textContent = 'Đã sao chép!';
    btnShare.classList.add('copied');
    setTimeout(() => {
      btnShareLabel.textContent = 'Chia sẻ';
      btnShare.classList.remove('copied');
    }, 2000);
  } catch {
    prompt('Sao chép URL để chia sẻ:', url);
  }
});

// Demo chips
document.querySelectorAll('.chip[data-domain]').forEach(chip => {
  chip.addEventListener('click', () => {
    input.value = chip.dataset.domain;
    resetInputError();
    btnInputClear.hidden = false;
    check(chip.dataset.domain);
  });
});

// ── Init: auto-scan from ?domain= query param ─────────────
(function init() {
  const domain = new URLSearchParams(location.search).get('domain');
  if (domain) {
    input.value = domain;
    btnInputClear.hidden = false;
    check(domain);
  } else {
    input.focus();
  }
}());
