import { Cl } from '@stacks/transactions';
import {
  pulse_getCurrentHeight,
  pulse_getPoll,
  pulse_getResults,
  pulse_getTotalPolls,
  pulse_hasVoted,
} from '@/generated/contracts';

export type Poll = {
  id: number;
  question: string;
  options: string[];
  category: string;
  creator: string;
  createdAt: number;
  expiresAt: number;
  totalVotes: number;
  counts: number[];
};

export type CategoryMeta = {
  key: string;
  label: string;
  color: string;
};

export const CATEGORIES: CategoryMeta[] = [
  { key: 'sports', label: 'Sports', color: '#10b981' },
  { key: 'entertainment', label: 'Entertainment', color: '#a855f7' },
  { key: 'tech', label: 'Tech', color: '#3b82f6' },
  { key: 'culture', label: 'Culture', color: '#d946ef' },
  { key: 'community', label: 'Community', color: '#06b6d4' },
  { key: 'politics', label: 'Politics', color: '#f59e0b' },
];

export function categoryMeta(key: string): CategoryMeta {
  return CATEGORIES.find(c => c.key === key) ?? { key, label: key, color: '#64748b' };
}

/** Testnet blocks average ~6s; used only for humanized time labels. */
const SECONDS_PER_BLOCK = 6;

export function toNumber(value: unknown): number | null {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function unwrap(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(unwrap);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Object.keys(obj).length <= 2 && 'type' in obj && 'value' in obj) {
      const inner = obj.value;
      if (inner !== null && typeof inner === 'object') return unwrap(inner);
      return inner;
    }
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) out[key] = unwrap(obj[key]);
    return out;
  }
  return value;
}

export function parseTotalPolls(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  return toNumber(unwrap(raw));
}

export function parseHeight(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  return toNumber(unwrap(raw));
}

export function parseResults(raw: unknown): { counts: number[]; total: number } | null {
  if (raw === null || raw === undefined || typeof raw !== 'object') return null;
  const value = unwrap(raw) as Record<string, unknown> | null;
  if (!value || typeof value !== 'object' || !Array.isArray(value.counts)) return null;
  const counts = value.counts.map(c => toNumber(c) ?? 0);
  const total = toNumber(value.total);
  if (total === null) return null;
  return { counts, total };
}

export function parsePoll(raw: unknown, id: number): Poll | null {
  if (raw === null || raw === undefined || typeof raw !== 'object') return null;
  const value = unwrap(raw) as Record<string, unknown> | null;
  if (!value || typeof value !== 'object') return null;
  const question = typeof value.question === 'string' ? value.question : '';
  if (!question) return null;
  const options = Array.isArray(value.options) ? value.options.map(o => String(o)) : [];
  const createdAt = toNumber(value['created-at']);
  const expiresAt = toNumber(value['expires-at']);
  if (createdAt === null || expiresAt === null || options.length === 0) return null;
  return {
    id,
    question,
    options,
    category: typeof value.category === 'string' ? value.category : 'community',
    creator: typeof value.creator === 'string' ? value.creator : '',
    createdAt,
    expiresAt,
    totalVotes: toNumber(value['total-votes']) ?? 0,
    counts: options.map(() => 0),
  };
}

export function parseHasVoted(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  return toNumber(unwrap(raw));
}

export type ChainSnapshot = {
  polls: Poll[];
  height: number;
  total: number;
};

export async function loadSnapshot(): Promise<ChainSnapshot> {
  const total = parseTotalPolls(await pulse_getTotalPolls([]));
  if (total === null) throw new Error('not-deployed');

  const ids = Array.from({ length: total }, (_, index) => index + 1);
  const rows = await Promise.all(
    ids.map(async id => {
      try {
        const [pollRaw, resultsRaw] = await Promise.all([
          pulse_getPoll([Cl.uint(id)]),
          pulse_getResults([Cl.uint(id)]),
        ]);
        const poll = parsePoll(pollRaw, id);
        if (!poll) return null;
        const results = parseResults(resultsRaw);
        if (results) {
          poll.counts = results.counts;
          poll.totalVotes = results.total;
        }
        return poll;
      } catch {
        return null;
      }
    }),
  );

  const height = parseHeight(await pulse_getCurrentHeight([])) ?? 0;
  return { polls: rows.filter((p): p is Poll => p !== null), height, total };
}

export async function loadHasVoted(id: number, address: string): Promise<number | null> {
  try {
    const raw = await pulse_hasVoted([Cl.uint(id)], address);
    return parseHasVoted(raw);
  } catch {
    return null;
  }
}

export function isClosed(poll: Poll, height: number): boolean {
  return height >= poll.expiresAt;
}

export function shortAddress(address: string): string {
  if (!address || address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

/** Human label for blocks remaining, e.g. "~1d 3h" / "~45m". Null when closed. */
export function remainingLabel(expiresAt: number, height: number): string | null {
  const blocks = expiresAt - height;
  if (blocks <= 0) return null;
  const seconds = blocks * SECONDS_PER_BLOCK;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `~${days}d ${hours}h`;
  if (hours > 0) return `~${hours}h ${minutes}m`;
  return `~${Math.max(1, minutes)}m`;
}

export function closedAgoLabel(expiresAt: number, height: number): string {
  const blocks = height - expiresAt;
  if (blocks <= 0) return 'just closed';
  const seconds = blocks * SECONDS_PER_BLOCK;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `closed ~${hours}h ago`;
  if (minutes > 0) return `closed ~${minutes}m ago`;
  return 'just closed';
}

export function humanizeRejection(repr: string | null): string {
  if (!repr) return 'The transaction was rejected on-chain.';
  if (repr.includes('u100')) return 'That poll does not exist.';
  if (repr.includes('u101')) return 'That option is out of range for this poll.';
  if (repr.includes('u102')) return 'You already voted in this poll.';
  if (repr.includes('u103')) return 'Voting for this poll has closed.';
  if (repr.includes('u104')) return 'The poll input was invalid. Check the fields and try again.';
  return 'The transaction was rejected on-chain.';
}

export function humanizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  if (
    lower.includes('reject') ||
    lower.includes('declin') ||
    lower.includes('cancel') ||
    lower.includes('denied')
  ) {
    return 'You rejected the request in your wallet.';
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Could not reach the Stacks network. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
