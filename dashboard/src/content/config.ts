// content/config.ts — Astro Content Collections + Zod schemas + mvpYamlLoader registration
// Phase 02 owns this file entirely. DO NOT modify from Phase 03/04.
// Exports MvpManifestSchema so mvp-yaml-loader can import for safeParse.

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { mvpYamlLoader } from '~/loaders/mvp-yaml-loader';

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const MvpStatusSchema = z.enum(['backlog', 'building', 'selected', 'parked', 'retired']);

const ScoreEntrySchema = z.object({
  date: z.coerce.date(),
  business_potential: z.number().min(0).max(10),
  strategic_fit: z.number().min(0).max(10),
  ux_quality: z.number().min(0).max(10),
  tech_fit: z.number().min(0).max(10),
  weighted: z.number().min(0).max(10).optional().default(0),
  decision: z.enum(['selected', 'parked', 'retired', 'pending']).optional(),
  notes: z.string().optional(),
});

export const MvpManifestSchema = z.object({
  id: z.string().optional(),         // injected by loader as dirent.name
  slug: z.string(),
  name: z.string(),
  status: MvpStatusSchema,
  created: z.coerce.date(),
  demo_date: z.coerce.date().optional(),
  owner: z.string(),
  problem: z.string(),
  target_user: z.string().optional(),
  tech_stack: z.array(z.string()).default([]),
  links: z
    .object({
      demo: z.string().url().optional(),
      repo: z.string().url().optional(),
      cover: z.string().optional(),
    })
    .optional(),
  scoring: z.array(ScoreEntrySchema).default([]),
});

const SessionSchema = z.object({
  date: z.coerce.date(),
  mode: z.enum(['demo-day', 'progress-review']),
  attendees: z.array(z.string()).default([]),
  mvpSlugs: z.array(z.string()).default([]),
});

const PipelineRowSchema = z.object({
  // Pipeline files are parsed client-side from markdown tables — minimal frontmatter
  title: z.string().optional(),
});

// ── Collections ──────────────────────────────────────────────────────────────

const products = defineCollection({
  loader: mvpYamlLoader('../products'),
});

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../evaluation/sessions' }),
  schema: SessionSchema,
});

const pipelines = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../pipeline' }),
  schema: PipelineRowSchema,
});

export const collections = { products, sessions, pipelines };
