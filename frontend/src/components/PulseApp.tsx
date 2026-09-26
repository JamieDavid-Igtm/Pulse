"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { addressAtom } from '@/store/wallet';
import { loadSnapshot, isClosed, type ChainSnapshot, type Poll } from '@/lib/pulse';
import deploymentsJson from '@/generated/deployments.json';
import Hero from './Hero';
import CategoryRail from './CategoryRail';
import PollCard from './PollCard';
import PollModal from './PollModal';
import CreatePollModal from './CreatePollModal';
import About from './About';
import DebugContracts from '@/generated/DebugContracts';

type Deployments = {
  contracts?: Record<string, { contract_id?: string } | undefined>;
};

const deployments = deploymentsJson as Deployments;
const isDeployed = Boolean(deployments.contracts?.pulse?.contract_id);

export default function PulseApp() {
  const address = useAtomValue(addressAtom);
  const [snapshot, setSnapshot] = useState<ChainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [category, setCategory] = useState('all');
  const [openPollId, setOpenPollId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = useCallback(() => setRefreshToken(token => token + 1), []);

  useEffect(() => {
    if (!isDeployed) {
      setLoading(false);
      setError('The Pulse contract has not been deployed to testnet yet.');
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    loadSnapshot()
      .then(next => {
        if (!alive) return;
        setSnapshot(next);
        setError(null);
      })
      .catch(() => {
        if (!alive) return;
        setError('Could not load polls from the Stacks network. Check your connection and retry.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshToken]);

  const polls = snapshot?.polls ?? [];
  const height = snapshot?.height ?? 0;

  const activePolls = useMemo(
    () => polls.filter(poll => !isClosed(poll, height)),
    [polls, height],
  );
  const completedPolls = useMemo(
    () => polls.filter(poll => isClosed(poll, height)),
    [polls, height],
  );
  const totalVotes = useMemo(
    () => polls.reduce((sum, poll) => sum + poll.totalVotes, 0),
    [polls],
  );
  const trending = useMemo(
    () =>
      [...activePolls]
        .sort((a, b) => b.totalVotes - a.totalVotes || b.createdAt - a.createdAt)
        .slice(0, 3),
    [activePolls],
  );
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const poll of activePolls) counts[poll.category] = (counts[poll.category] ?? 0) + 1;
    return counts;
  }, [activePolls]);

  const visibleActive = useMemo(
    () =>
      category === 'all'
        ? activePolls
        : activePolls.filter(poll => poll.category === category),
    [activePolls, category],
  );
  const visibleCompleted = useMemo(
    () =>
      category === 'all'
        ? completedPolls
        : completedPolls.filter(poll => poll.category === category),
    [completedPolls, category],
  );
  const visibleTrending =
    category === 'all' ? trending : trending.filter(poll => poll.category === category);

  const openPoll =
    openPollId !== null ? polls.find(poll => poll.id === openPollId) ?? null : null;

  const handleOpen = useCallback((poll: Poll) => setOpenPollId(poll.id), []);
  const handleClose = useCallback(() => setOpenPollId(null), []);

  return (
    <main className="min-h-screen pb-4">
      <Hero
        totalPolls={snapshot?.total ?? 0}
        totalVotes={totalVotes}
        loading={loading}
        onCreate={() => setCreateOpen(true)}
      />

      <section className="pl-container" aria-label="Poll filters">
        <CategoryRail
          selected={category}
          counts={categoryCounts}
          totalActive={activePolls.length}
          onSelect={setCategory}
        />
      </section>

      {error && (
        <section className="pl-container mt-8">
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-2xl border border-[#f43f5e]/30 bg-[#f43f5e]/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm text-[#fb7185]">{error}</p>
            {isDeployed && (
              <button
                type="button"
                onClick={refresh}
                className="inline-flex h-9 items-center rounded-lg border border-[#f43f5e]/40 px-4 text-sm font-medium text-[#fb7185] transition-colors hover:bg-[#f43f5e]/10"
              >
                Retry
              </button>
            )}
          </div>
        </section>
      )}

      {loading && !snapshot && (
        <section className="pl-container mt-10" aria-hidden="true">
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map(index => (
              <div key={index} className="pl-card space-y-4 p-5">
                <div className="pl-skeleton h-4 w-20" />
                <div className="pl-skeleton h-6 w-4/5" />
                <div className="pl-skeleton h-2 w-full" />
                <div className="pl-skeleton h-2 w-3/4" />
                <div className="pl-skeleton h-2 w-5/6" />
              </div>
            ))}
          </div>
          <span className="sr-only">Loading polls…</span>
        </section>
      )}

      {snapshot && (
        <>
          {visibleTrending.length > 0 && (
            <section id="trending" className="pl-container pt-12" aria-labelledby="trending-heading">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="pl-kicker">Trending now</p>
                  <h2
                    id="trending-heading"
                    className="mt-3 font-display text-2xl font-semibold tracking-tight text-[#e8edf7] sm:text-3xl"
                  >
                    Polls everyone is watching
                  </h2>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleTrending.map((poll, index) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    height={height}
                    onOpen={handleOpen}
                    rank={index + 1}
                  />
                ))}
              </div>
            </section>
          )}

          <section id="active" className="pl-container pt-14" aria-labelledby="active-heading">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="pl-kicker">Live</p>
                <h2
                  id="active-heading"
                  className="mt-3 font-display text-2xl font-semibold tracking-tight text-[#e8edf7] sm:text-3xl"
                >
                  Active polls
                </h2>
              </div>
              <p className="font-mono text-xs text-[#64748b]">
                {visibleActive.length} open · height {height}
              </p>
            </div>

            {visibleActive.length === 0 ? (
              <div className="pl-card mt-6 px-6 py-10 text-center">
                <p className="text-base font-medium text-[#e8edf7]">No active polls here.</p>
                <p className="mt-1 text-sm text-[#93a0b8]">
                  Try another category, or create one yourself.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="pl-btn-primary mt-5"
                >
                  Create a poll
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleActive.map(poll => (
                  <PollCard key={poll.id} poll={poll} height={height} onOpen={handleOpen} />
                ))}
              </div>
            )}
          </section>

          <section
            id="completed"
            className="pl-container pt-14"
            aria-labelledby="completed-heading"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="pl-kicker">Settled on-chain</p>
                <h2
                  id="completed-heading"
                  className="mt-3 font-display text-2xl font-semibold tracking-tight text-[#e8edf7] sm:text-3xl"
                >
                  Recently completed
                </h2>
              </div>
              <p className="font-mono text-xs text-[#64748b]">{visibleCompleted.length} closed</p>
            </div>

            {visibleCompleted.length === 0 ? (
              <div className="pl-card mt-6 px-6 py-10 text-center">
                <p className="text-sm text-[#93a0b8]">
                  No closed polls in this category yet — results land here once voting ends.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCompleted.map(poll => (
                  <PollCard key={poll.id} poll={poll} height={height} onOpen={handleOpen} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <About />

      <details className="pl-container mb-10 rounded-xl border border-[#1a2235] bg-[#0b111e] p-4">
        <summary className="cursor-pointer text-sm text-[#93a0b8]">
          Contract debug console (Scaffold Stacks)
        </summary>
        <div className="mt-4">
          <DebugContracts />
        </div>
      </details>

      {openPoll && (
        <PollModal
          key={openPoll.id}
          poll={openPoll}
          height={height}
          address={address}
          onClose={handleClose}
          onResultsChanged={refresh}
        />
      )}

      {createOpen && (
        <CreatePollModal
          address={address}
          onClose={() => setCreateOpen(false)}
          onCreated={refresh}
        />
      )}
    </main>
  );
}
