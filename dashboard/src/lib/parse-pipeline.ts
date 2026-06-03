// parse-pipeline.ts — Parse pipeline/*.md markdown tables into PipelineRow[]
// Uses lightweight regex (Option B from research-01). Constraint: tables must be single-line cells.
// Filename convention: 00-backlog.md → status = 'backlog', 01-building.md → 'building', etc.

import type { PipelineRow, MvpStatus } from '~/lib/types';

/** Map filename prefix to MvpStatus */
const STATUS_MAP: Record<string, MvpStatus> = {
  backlog: 'backlog',
  building: 'building',
  selected: 'selected',
  parked: 'parked',
  retired: 'retired',
};

/** Extract MvpStatus from filename like '00-backlog.md' or 'backlog.md' */
function statusFromFilename(filename: string): MvpStatus {
  const base = filename.replace(/\.md$/, '').replace(/^\d+-/, '').toLowerCase();
  return STATUS_MAP[base] ?? 'backlog';
}

/** Parse a single markdown table block into header + rows arrays */
function parseTable(block: string): { headers: string[]; rows: string[][] } {
  const lines = block.trim().split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 3) return { headers: [], rows: [] }; // need header + separator + 1 row

  const splitCells = (line: string) =>
    line.split('|').slice(1, -1).map(c => c.trim());

  const headers = splitCells(lines[0]);
  // lines[1] is separator (|---|---|), skip it
  const rows = lines.slice(2).map(splitCells);

  return { headers, rows };
}

/** Normalise header name for lookup */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, '_');
}

/**
 * Parse a full pipeline markdown file content into PipelineRow[].
 * Each H2 section with a table yields rows; status comes from filename.
 */
export function parsePipelineFile(content: string, filename: string): PipelineRow[] {
  const status = statusFromFilename(filename);
  const rows: PipelineRow[] = [];

  // Split on H2 headings — each section may contain a table
  const sections = content.split(/^##\s+/m).slice(1);

  for (const section of sections) {
    const tableMatch = section.match(/(\|.+\|\s*\n)+/);
    if (!tableMatch) continue;

    const { headers, rows: tableRows } = parseTable(tableMatch[0]);
    if (headers.length === 0 || tableRows.length === 0) continue;

    const normHeaders = headers.map(normalise);
    const idx = (names: string[]) =>
      names.reduce<number>((found, n) => (found >= 0 ? found : normHeaders.indexOf(n)), -1);

    const slugIdx  = idx(['slug', 'id', 'key']);
    const nameIdx  = idx(['name', 'title', 'mvp']);
    const dateIdx  = idx(['demo_date', 'date', 'demo']);
    const notesIdx = idx(['notes', 'note', 'comment']);

    for (const cells of tableRows) {
      const slug = slugIdx >= 0 ? cells[slugIdx] : '';
      const name = nameIdx >= 0 ? cells[nameIdx] : cells[0] ?? '';
      if (!slug && !name) continue;

      const rawDate = dateIdx >= 0 ? cells[dateIdx] : undefined;
      const demoDate = rawDate && rawDate !== '-' && rawDate !== ''
        ? new Date(rawDate)
        : undefined;

      rows.push({
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        name,
        status,
        demoDate: demoDate && !isNaN(demoDate.getTime()) ? demoDate : undefined,
        notes: notesIdx >= 0 ? cells[notesIdx] : undefined,
      });
    }
  }

  return rows;
}
