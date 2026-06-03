// load-sessions.ts — getCollection('sessions') wrapper, maps to typed Session[], sorted desc by date
// Phase 02 owns this file. Phase 04 imports loadSessions().

import { getCollection, type CollectionEntry } from 'astro:content';
import type { Session } from '~/lib/types';

type SessionEntry = CollectionEntry<'sessions'>;

interface SessionFrontmatter {
  date: Date;
  mode: 'demo-day' | 'progress-review';
  attendees?: string[];
  mvpSlugs?: string[];
}

function toSession(entry: SessionEntry): Session {
  const d = entry.data as SessionFrontmatter;
  return {
    date: d.date,
    mode: d.mode,
    attendees: d.attendees ?? [],
    mvpSlugs: d.mvpSlugs ?? [],
    body: entry.body ?? '',
  };
}

/**
 * Load all evaluation sessions from evaluation/sessions/*.md frontmatter.
 * Returns Session[] sorted descending by date (newest first).
 */
export async function loadSessions(): Promise<Session[]> {
  const entries = await getCollection('sessions');
  return entries
    .map((e: SessionEntry) => toSession(e))
    .sort((a: Session, b: Session) => b.date.getTime() - a.date.getTime());
}
