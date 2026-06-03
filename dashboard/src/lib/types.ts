// types.ts — Interface contract cho Phase 03/04 import
// Phase 02 owns toàn bộ file này. KHÔNG sửa nếu không phải Phase 02.

export type MvpStatus = 'backlog' | 'building' | 'selected' | 'parked' | 'retired';

export interface ScoreEntry {
  date: Date;
  business_potential: number;
  strategic_fit: number;
  ux_quality: number;
  tech_fit: number;
  weighted: number;
  decision?: 'selected' | 'parked' | 'retired' | 'pending';
  notes?: string;
}

export interface MvpManifest {
  id: string;
  name: string;
  slug: string;
  status: MvpStatus;
  created: Date;
  demo_date?: Date;
  owner: string;
  problem: string;
  target_user?: string;
  tech_stack: string[];
  links?: { demo?: string; repo?: string; cover?: string };
  scoring: ScoreEntry[];
}

/** Emitted by mvp-yaml-loader khi Zod safeParse fail HOẶC YAML syntax error.
 *  Phase 03 render placeholder card với badge ⚠. */
export interface InvalidManifest {
  __invalid: true;
  slug: string;
  filePath: string;
  errors: string[]; // human-readable error messages
}

export interface PipelineRow {
  slug: string;
  name: string;
  status: MvpStatus;
  demoDate?: Date;
  notes?: string;
}

export interface Session {
  date: Date;
  mode: 'demo-day' | 'progress-review';
  attendees: string[];
  mvpSlugs: string[];
  body: string;
}

export interface TechAggregate {
  name: string;
  version?: string;
  category: 'language' | 'framework' | 'database' | 'service' | 'tool';
  usedBy: string[];
  count: number;
}

export interface DashboardData {
  mvps: MvpManifest[];
  invalidMvps: InvalidManifest[];
  pipeline: PipelineRow[];
  sessions: Session[];
  tech: TechAggregate[];
  orphans: MvpManifest[];
  placeholders: PipelineRow[];
}
