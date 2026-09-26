"use client";
import {
  type Poll,
  categoryMeta,
  closedAgoLabel,
  formatCount,
  isClosed,
  percent,
  remainingLabel,
} from '@/lib/pulse';

type Props = {
  poll: Poll;
  height: number;
  onOpen: (poll: Poll) => void;
  rank?: number;
};

function PollCard({ poll, height, onOpen, rank }: Props) {
  const meta = categoryMeta(poll.category);
  const closed = isClosed(poll, height);
  const remaining = remainingLabel(poll.expiresAt, height);
  const leading = poll.totalVotes > 0 ? Math.max(...poll.counts) : 0;

  return (
    <article
      className={`pl-card pl-card-hover group flex cursor-pointer flex-col p-5 ${closed ? 'opacity-95' : ''}`}
      onClick={() => onOpen(poll)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(poll);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open poll: ${poll.question}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
          style={{ background: `${meta.color}1a`, color: meta.color }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
          {meta.label}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${
            closed ? 'bg-[#141b2b] text-[#93a0b8]' : 'bg-[#10b981]/10 text-[#34d399]'
          }`}
        >
          {closed ? 'Final' : 'Open'}
        </span>
      </div>

      <div className="mt-4 flex items-start gap-3">
        {rank !== undefined && (
          <span className="font-display text-3xl font-semibold tabular-nums leading-none text-[#1f2a42] transition-colors group-hover:text-[#10b981]">
            {String(rank).padStart(2, '0')}
          </span>
        )}
        <h3 className="line-clamp-2 font-display text-lg font-medium leading-snug text-[#e8edf7]">
          {poll.question}
        </h3>
      </div>

      <div className="mt-5 space-y-3">
        {poll.options.map((option, index) => {
          const count = poll.counts[index] ?? 0;
          const pct = percent(count, poll.totalVotes);
          const isLeader = poll.totalVotes > 0 && count === leading;
          return (
            <div key={option}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                <span
                  className={`truncate ${isLeader ? 'font-medium text-[#e8edf7]' : 'text-[#93a0b8]'}`}
                >
                  {option}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-[#64748b]">
                  {pct}% · {count}
                </span>
              </div>
              <div className="pl-bar-track">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isLeader
                      ? `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)`
                      : `${meta.color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
        {poll.totalVotes === 0 && (
          <p className="text-[13px] italic text-[#64748b]">No votes yet — be the first.</p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#141b2b] pt-4 text-xs text-[#64748b]">
        <span className="font-mono tabular-nums">
          {formatCount(poll.totalVotes)} vote{poll.totalVotes === 1 ? '' : 's'}
        </span>
        <span className={closed ? 'text-[#93a0b8]' : 'text-[#34d399]'}>
          {closed ? closedAgoLabel(poll.expiresAt, height) : `closes ${remaining ?? 'soon'}`}
        </span>
      </div>
    </article>
  );
}

export default PollCard;
