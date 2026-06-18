// Tính điểm 0-100 và grade A-F từ kết quả SPF/DKIM/DMARC checks
// Trọng số: SPF 30% + DKIM 35% + DMARC 35% (giữ nguyên — chỉ làm giàu sub-scoring bên trong)

/**
 * @param {{ spf: import('./dns-spf-txt-record-checker.js').SpfResult }} params
 * @param {{ dkim: import('./dns-dkim-selector-public-key-checker.js').DkimResult }} params
 * @param {{ dmarc: import('./dns-dmarc-policy-record-checker.js').DmarcResult }} params
 * @returns {{ score: number, grade: string, grade_label: string, summary: string }}
 */
export function calculateEmailAuthScore({ spf, dkim, dmarc }) {
  const spf_score = _scoreSpf(spf);
  const dkim_score = _scoreDkim(dkim);
  const dmarc_score = _scoreDmarc(dmarc);

  const score = Math.min(100, spf_score + dkim_score + dmarc_score);
  const { grade, grade_label } = _gradeFromScore(score);
  const summary = _buildSummary(grade, { spf, dkim, dmarc });

  return { score, grade, grade_label, summary, spf_score, dkim_score, dmarc_score };
}

// ── SPF score (0–30) — giữ nguyên ───────────────────────────
function _scoreSpf(spf) {
  let s = 0;
  if (spf.exists) {
    if (spf.policy === 'strict') s = 30;
    else if (spf.policy === 'softfail') s = 20;
    else if (spf.policy === 'neutral') s = 10;
    else s = 15;
    if (spf.too_many_lookups) s = Math.max(0, s - 5);
  }
  return s;
}

// ── DKIM score (0–35) — 3-state + sub-scoring chất lượng key ─
function _scoreDkim(dkim) {
  const status = dkim.status ?? (dkim.exists ? 'found' : 'inconclusive');
  if (status === 'absent') return 0;
  if (status === 'inconclusive') return 17; // ≈50% — "chưa xác định", không tank điểm

  // found: bắt đầu 35 rồi trừ theo chất lượng
  let s = 35;
  if (dkim.revoked) return 5;                       // key thu hồi (p= rỗng) — critical
  if (dkim.key_type === 'rsa' && typeof dkim.key_bits === 'number') {
    if (dkim.key_bits < 1024) s -= 10;
    else if (dkim.key_bits < 2048) s -= 5;
  }
  if (dkim.test_mode) s -= 3;                       // t=y
  return Math.max(0, s);
}

// ── DMARC score (0–35) — policy + validation depth ──────────
function _scoreDmarc(dmarc) {
  let s = 0;
  if (!dmarc.exists) return 0;

  if (dmarc.policy === 'reject')           s = 35;
  else if (dmarc.policy === 'quarantine')  s = 25;
  else if (dmarc.policy === 'none')        s = 10;
  if (dmarc.rua && s > 0 && s < 35) s = Math.min(35, s + 3);

  // Penalty validation depth
  if (dmarc.record_count > 1) s = Math.max(0, s - 15); // nhiều record -> DMARC vô hiệu
  if (dmarc.pct_nonsense)     s = Math.max(0, s - 10);
  // Bonus alignment strict cả hai
  if (dmarc.adkim === 's' && dmarc.aspf === 's') s = Math.min(35, s + 2);

  return s;
}

function _gradeFromScore(score) {
  if (score >= 90) return { grade: 'A', grade_label: 'Xuất sắc' };
  if (score >= 75) return { grade: 'B', grade_label: 'Tốt' };
  if (score >= 55) return { grade: 'C', grade_label: 'Trung bình' };
  if (score >= 35) return { grade: 'D', grade_label: 'Yếu' };
  return { grade: 'F', grade_label: 'Nguy hiểm' };
}

function _buildSummary(grade, { spf, dkim, dmarc }) {
  const issues = [];
  if (!spf.exists)   issues.push('thiếu SPF');
  else if (spf.policy === 'softfail') issues.push('SPF chưa strict (-all)');
  else if (spf.too_many_lookups) issues.push('SPF vượt quá 10 DNS lookups');

  const dkimStatus = dkim.status ?? (dkim.exists ? 'found' : 'inconclusive');
  if (dkimStatus === 'absent') issues.push('không tìm thấy DKIM (đã xác nhận)');
  else if (dkimStatus === 'inconclusive') issues.push('chưa xác định được DKIM (nhập selector để kiểm tra)');
  else if (dkim.revoked) issues.push('DKIM key đã bị thu hồi');
  else if (dkim.key_type === 'rsa' && typeof dkim.key_bits === 'number' && dkim.key_bits < 2048) {
    issues.push(`DKIM key RSA-${dkim.key_bits} nên nâng lên 2048`);
  }

  if (!dmarc.exists) issues.push('thiếu DMARC');
  else if (dmarc.record_count > 1) issues.push('nhiều bản ghi DMARC (vô hiệu hóa DMARC)');
  else if (dmarc.pct_nonsense) issues.push('DMARC pct=0 (không áp policy)');
  else if (dmarc.policy === 'none') issues.push('DMARC chưa enforce (p=none)');
  else if (dmarc.policy === 'quarantine') issues.push('DMARC chưa ở mức reject');

  if (issues.length === 0) {
    return 'Email authentication được cấu hình đầy đủ và chặt chẽ. Domain của bạn được bảo vệ tốt.';
  }
  if (grade === 'A' || grade === 'B') {
    return `Cấu hình tốt, nhưng còn cải thiện được: ${issues.join(', ')}.`;
  }
  return `Phát hiện ${issues.length} vấn đề cần khắc phục: ${issues.join(', ')}.`;
}
