// Tính điểm 0-100 và grade A-F từ kết quả SPF/DKIM/DMARC checks
// Trọng số: SPF 30% + DKIM 35% + DMARC 35%

/**
 * @param {{ spf: import('./dns-spf-txt-record-checker.js').SpfResult }} params
 * @param {{ dkim: import('./dns-dkim-selector-public-key-checker.js').DkimResult }} params
 * @param {{ dmarc: import('./dns-dmarc-policy-record-checker.js').DmarcResult }} params
 * @returns {{ score: number, grade: string, grade_label: string, summary: string }}
 */
export function calculateEmailAuthScore({ spf, dkim, dmarc }) {
  // ── SPF score (0–30) ─────────────────────────────────────
  let spf_score = 0;
  if (spf.exists) {
    if (spf.policy === 'strict') spf_score = 30;        // -all: full points
    else if (spf.policy === 'softfail') spf_score = 20; // ~all: partial (không reject, chỉ mark)
    else if (spf.policy === 'neutral') spf_score = 10;  // ?all: rất yếu
    else spf_score = 15;                                 // exists nhưng policy lạ
    // Penalty nếu too many lookups
    if (spf.too_many_lookups) spf_score = Math.max(0, spf_score - 5);
  }

  // ── DKIM score (0–35) ────────────────────────────────────
  const dkim_score = dkim.exists ? 35 : 0;

  // ── DMARC score (0–35) ───────────────────────────────────
  let dmarc_score = 0;
  if (dmarc.exists) {
    if (dmarc.policy === 'reject')      dmarc_score = 35;
    else if (dmarc.policy === 'quarantine') dmarc_score = 25;
    else if (dmarc.policy === 'none')   dmarc_score = 10; // có record nhưng không bảo vệ thực sự
    // Bonus: có rua reporting
    if (dmarc.rua && dmarc_score > 0 && dmarc_score < 35) dmarc_score = Math.min(35, dmarc_score + 3);
  }

  const score = Math.min(100, spf_score + dkim_score + dmarc_score);

  const { grade, grade_label } = _gradeFromScore(score);
  const summary = _buildSummary(grade, { spf, dkim, dmarc });

  return { score, grade, grade_label, summary, spf_score, dkim_score, dmarc_score };
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
  if (!dkim.exists)  issues.push('không tìm thấy DKIM');
  if (!dmarc.exists) issues.push('thiếu DMARC');
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
