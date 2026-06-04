// Tính reputation score 0–100 từ RBL results + PTR penalty → grade + action text tiếng Việt

/**
 * @param {{ rblChecks: Array<{ id, name, weight, listed }>, ptr: { has_ptr: boolean, ptr: string|null } }} params
 * @returns {{ score: number, grade: string, recommended_action: string }}
 */
export function calculateIpScore({ rblChecks, ptr }) {
  const rblPenalty = rblChecks.reduce((sum, c) => sum + (c.listed ? c.weight : 0), 0);

  // Thiếu PTR record = -10 điểm: nhiều MTA reject mail từ IP không có rDNS
  const ptrPenalty = ptr.has_ptr ? 0 : 10;

  const score = Math.max(0, 100 - rblPenalty - ptrPenalty);

  const grade =
    score >= 85 ? 'clean' :
    score >= 60 ? 'moderate' :
    'high-risk';

  return { score, grade, recommended_action: buildAction(grade, rblChecks, ptr) };
}

function buildAction(grade, rblChecks, ptr) {
  const listed = rblChecks.filter(c => c.listed);

  if (grade === 'clean' && listed.length === 0 && ptr.has_ptr) {
    return 'IP của bạn sạch và có PTR record hợp lệ. Không cần hành động.';
  }
  if (grade === 'clean' && !ptr.has_ptr) {
    return 'IP chưa bị blacklist nhưng thiếu PTR record (rDNS). Nên cấu hình PTR để tránh bị reject bởi mail server.';
  }
  if (grade === 'moderate') {
    const names = listed.map(r => r.name).join(', ');
    return `IP bị list trong ${listed.length} RBL (${names}). Kiểm tra log mail và liên hệ provider để delist.`;
  }
  const first = listed[0]?.name ?? 'provider';
  return `Cảnh báo: IP bị list trong ${listed.length} RBL nghiêm trọng. Cần delist ngay để không bị reject mail. Liên hệ ${first}.`;
}
