// load-mvps.ts — getCollection('products') wrappers: split valid vs invalid, reconcile with pipeline
// Phase 02 owns this file. Phase 03/04 import loadMvps, loadInvalidMvps, reconcileMvpsWithPipeline.

import { getCollection, type CollectionEntry } from 'astro:content';
import type { MvpManifest, InvalidManifest, PipelineRow } from '~/lib/types';
import { computeWeightedScore } from '~/lib/compute-score';

type ProductEntry = CollectionEntry<'products'>;

function isInvalid(entry: ProductEntry): boolean {
  return !!(entry.data as Record<string, unknown>)['__invalid'];
}

function toManifest(entry: ProductEntry): MvpManifest {
  const manifest = entry.data as MvpManifest;
  const scoring = manifest.scoring.map(s => ({
    ...s,
    weighted:
      s.weighted !== 0
        ? s.weighted
        : computeWeightedScore({
            business_potential: s.business_potential,
            strategic_fit: s.strategic_fit,
            ux_quality: s.ux_quality,
            tech_fit: s.tech_fit,
          }),
  }));
  return { ...manifest, scoring };
}

/** Return all valid MvpManifest entries, sorted by created desc. */
export async function loadMvps(): Promise<MvpManifest[]> {
  const all = await getCollection('products');
  return all
    .filter((e: ProductEntry) => !isInvalid(e))
    .map((e: ProductEntry) => toManifest(e))
    .sort((a: MvpManifest, b: MvpManifest) => b.created.getTime() - a.created.getTime());
}

/** Return all InvalidManifest entries (failed Zod safeParse or YAML syntax error).
 *  Phase 03 renders placeholder cards with ⚠ badge for these. */
export async function loadInvalidMvps(): Promise<InvalidManifest[]> {
  const all = await getCollection('products');
  return all
    .filter((e: ProductEntry) => isInvalid(e))
    .map((e: ProductEntry) => e.data as unknown as InvalidManifest);
}

export interface ReconcileResult {
  /** MVP has both pipeline row AND valid mvp.yaml */
  matched: MvpManifest[];
  /** Pipeline row exists but no mvp.yaml found — render placeholder card */
  placeholders: PipelineRow[];
  /** mvp.yaml exists but no matching pipeline row — log warning */
  orphans: MvpManifest[];
}

/**
 * Cross-reference pipeline rows with loaded MVP manifests by slug.
 * Rule: slug is the canonical key across both sources.
 */
export function reconcileMvpsWithPipeline(
  rows: PipelineRow[],
  mvps: MvpManifest[]
): ReconcileResult {
  const mvpBySlug = new Map(mvps.map(m => [m.slug, m]));
  const pipelineSlugs = new Set(rows.map(r => r.slug));

  const matched: MvpManifest[] = [];
  const placeholders: PipelineRow[] = [];

  for (const row of rows) {
    const mvp = mvpBySlug.get(row.slug);
    if (mvp) {
      matched.push(mvp);
    } else {
      placeholders.push(row);
    }
  }

  const orphans = mvps.filter(m => !pipelineSlugs.has(m.slug));

  return { matched, placeholders, orphans };
}
