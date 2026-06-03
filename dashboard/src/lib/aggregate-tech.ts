// aggregate-tech.ts — Cross-MVP tech stack reducer + static category lookup table
// Input: MvpManifest[]; Output: TechAggregate[] sorted desc by count.
// Category lookup: match by name prefix/exact. Default fallback = 'tool'.

import type { MvpManifest, TechAggregate } from '~/lib/types';

type TechCategory = TechAggregate['category'];

/** Static category lookup — append new entries as tech stack grows */
const CATEGORY_MAP: Record<string, TechCategory> = {
  // Languages
  typescript: 'language',
  javascript: 'language',
  python: 'language',
  rust: 'language',
  go: 'language',
  java: 'language',
  kotlin: 'language',
  swift: 'language',
  dart: 'language',

  // Frameworks
  'next.js': 'framework',
  nextjs: 'framework',
  nuxt: 'framework',
  astro: 'framework',
  react: 'framework',
  vue: 'framework',
  svelte: 'framework',
  sveltekit: 'framework',
  angular: 'framework',
  nestjs: 'framework',
  fastapi: 'framework',
  django: 'framework',
  flask: 'framework',
  express: 'framework',
  hono: 'framework',
  remix: 'framework',
  gatsby: 'framework',
  flutter: 'framework',

  // Databases
  postgres: 'database',
  postgresql: 'database',
  mysql: 'database',
  sqlite: 'database',
  mongodb: 'database',
  redis: 'database',
  supabase: 'database',
  planetscale: 'database',
  turso: 'database',
  neon: 'database',
  drizzle: 'database',
  prisma: 'database',

  // Services / cloud
  'cloudflare-workers': 'service',
  'cloudflare-pages': 'service',
  cloudflare: 'service',
  vercel: 'service',
  netlify: 'service',
  railway: 'service',
  'fly.io': 'service',
  aws: 'service',
  gcp: 'service',
  azure: 'service',
  stripe: 'service',
  sendgrid: 'service',
  resend: 'service',
  clerk: 'service',
  auth0: 'service',
  github: 'service',
};

/** Parse 'name@version' string into name + optional version */
function parseTechEntry(raw: string): { name: string; version?: string } {
  const atIdx = raw.lastIndexOf('@');
  if (atIdx > 0) {
    return { name: raw.slice(0, atIdx).toLowerCase(), version: raw.slice(atIdx + 1) };
  }
  return { name: raw.toLowerCase() };
}

/** Lookup category by name. Tries exact match, then prefix match. Defaults to 'tool'. */
function lookupCategory(name: string): TechCategory {
  if (CATEGORY_MAP[name]) return CATEGORY_MAP[name];
  // Prefix match (e.g. 'cloudflare-kv' → 'service' via 'cloudflare' prefix)
  const match = Object.keys(CATEGORY_MAP).find(k => name.startsWith(k));
  return match ? CATEGORY_MAP[match] : 'tool';
}

/**
 * Aggregate tech stack across all MVPs.
 * Groups by normalised name, counts usages, lists which slugs use each tech.
 * Returns sorted descending by count.
 */
export function aggregateTechStack(mvps: MvpManifest[]): TechAggregate[] {
  const map = new Map<string, TechAggregate>();

  for (const mvp of mvps) {
    for (const raw of mvp.tech_stack) {
      const { name, version } = parseTechEntry(raw.trim());
      if (!name) continue;

      const existing = map.get(name);
      if (existing) {
        if (!existing.usedBy.includes(mvp.slug)) {
          existing.usedBy.push(mvp.slug);
          existing.count += 1;
        }
        // Keep first version seen (or override if more specific)
        if (!existing.version && version) existing.version = version;
      } else {
        map.set(name, {
          name,
          version,
          category: lookupCategory(name),
          usedBy: [mvp.slug],
          count: 1,
        });
      }
    }
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}
