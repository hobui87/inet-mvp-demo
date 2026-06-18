// Orchestrator: tạo hướng dẫn fix tiếng Việt cho SPF/DKIM/DMARC (delegate sang từng builder)
import { buildSpfGuide } from './remediation-spf-guide-builder.js';
import { buildDkimGuide } from './remediation-dkim-guide-builder.js';
import { buildDmarcGuide } from './remediation-dmarc-guide-builder.js';

/**
 * @typedef {Object} RemediationSection
 * @property {string} id - 'spf' | 'dkim' | 'dmarc'
 * @property {string} title
 * @property {'ok'|'warning'|'error'} status
 * @property {string} status_text - Mô tả ngắn trạng thái tiếng Việt
 * @property {string[]} issues - Danh sách vấn đề phát hiện
 * @property {string[]} steps - Các bước khắc phục
 * @property {string|null} dns_template - DNS record mẫu để copy-paste
 * @property {string|null} dns_template_note - Ghi chú thêm về template
 */

/**
 * Tạo hướng dẫn khắc phục đầy đủ tiếng Việt.
 * @param {string} domain
 * @param {object} spf
 * @param {object} dkim
 * @param {object} dmarc
 * @returns {RemediationSection[]}
 */
export function generateRemediationGuide(domain, spf, dkim, dmarc) {
  return [
    buildSpfGuide(domain, spf),
    buildDkimGuide(domain, dkim),
    buildDmarcGuide(domain, dmarc),
  ];
}
