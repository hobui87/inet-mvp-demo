// Tính reputation score 0–100 từ kết quả blocklist checks + map grade + recommended action
/**
 * @param {Array<{ id: string, name: string, weight: number, listed: boolean, mock?: boolean, error?: string }>} checks
 * @returns {{ score: number, grade: string, recommended_action: string }}
 */
export function calculateScore(checks) {
  const penalty = checks.reduce((sum, c) => sum + (c.listed ? c.weight : 0), 0);
  const score = Math.max(0, 100 - penalty);

  const grade =
    score >= 85 ? 'clean' :
    score >= 60 ? 'moderate' :
    'high-risk';

  const listed = checks.filter(c => c.listed);
  const recommended_action = buildAction(grade, listed);

  return { score, grade, recommended_action };
}

function buildAction(grade, listed) {
  const count = listed.length;
  const firstName = listed[0]?.name ?? '';

  if (grade === 'clean' && count === 0) {
    return 'Domain của bạn sạch. Không cần hành động.';
  }
  if (grade === 'clean' && count > 0) {
    // score >= 85 nhưng vẫn bị listed trong blocklist nhỏ
    return `Domain có điểm cao nhưng xuất hiện trong ${count} blocklist nhỏ (${listed.map(l => l.name).join(', ')}). Nên theo dõi định kỳ.`;
  }
  if (grade === 'moderate') {
    return `Phát hiện domain trong ${count} blocklist. Khuyến nghị kiểm tra log mail và liên hệ ${firstName} để xem chi tiết.`;
  }
  return `Cảnh báo: domain bị liệt kê tại ${count} blocklist nghiêm trọng. Liên hệ ngay ${firstName} để yêu cầu delist.`;
}
