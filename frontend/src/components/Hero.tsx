"use client";
import { formatCount } from '@/lib/pulse';

type Props = {
  totalPolls: number;
  totalVotes: number;
  loading: boolean;
  onCreate: () => void;
};

function Hero({ totalPolls, totalVotes, loading, onCreate }: Props) {
  return (
    <section id="top" className="pl-container pb-12 pt-14 sm:pt-20">
      <p className="pl-kicker">On-chain public opinion · Stacks testnet</p>
      <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-[#e8edf7] sm:text-6xl lg:text-7xl">
        Ask the crowd.{' '}
        <span className="pl-gradient-text">Settle it on-chain.</span>
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#93a0b8] sm:text-lg">
        Pulse is a full-screen polling board where every question, vote, and tally is recorded on
        the Stacks blockchain. Create a poll, cast a real vote, and watch results settle in real
        time — no accounts, no middlemen.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onCreate} className="pl-btn-primary">
          Create a poll
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h14m-6-6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <a href="#active" className="pl-btn-ghost">
          Browse polls
        </a>
      </div>

      <dl className="mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#1a2235] bg-[#1a2235] sm:grid-cols-4">
        <div className="bg-[#0b111e] px-5 py-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
            Polls created
          </dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#e8edf7]">
            {loading ? '—' : formatCount(totalPolls)}
          </dd>
        </div>
        <div className="bg-[#0b111e] px-5 py-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
            Votes cast
          </dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#e8edf7]">
            {loading ? '—' : formatCount(totalVotes)}
          </dd>
        </div>
        <div className="bg-[#0b111e] px-5 py-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
            Settlement
          </dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-[#34d399]">Stacks</dd>
        </div>
        <div className="bg-[#0b111e] px-5 py-4">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
            Results
          </dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-[#34d399]">Live</dd>
        </div>
      </dl>
    </section>
  );
}

export default Hero;
