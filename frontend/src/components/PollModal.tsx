"use client";
import { useCallback, useEffect, useState } from 'react';
import { Cl } from '@stacks/transactions';
import { usePulse_Vote } from '@/generated/hooks';
import {
  type Poll,
  categoryMeta,
  closedAgoLabel,
  formatCount,
  humanizeError,
  humanizeRejection,
  isClosed,
  loadHasVoted,
  percent,
  remainingLabel,
  shortAddress,
} from '@/lib/pulse';

type Props = {
  poll: Poll;
  height: number;
  address: string | null;
  onClose: () => void;
  onResultsChanged: () => void;
};

function PollModal({ poll, height, address, onClose, onResultsChanged }: Props) {
  const vote = usePulse_Vote();
  const [selected, setSelected] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState<number | null>(null);
  const [checkingVote, setCheckingVote] = useState(false);
  const [hvTick, setHvTick] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTxid, setSuccessTxid] = useState<string | null>(null);

  const closed = isClosed(poll, height);
  const voted = hasVoted !== null;
  const pending = vote.loading || vote.txStatus === 'pending';
  const meta = categoryMeta(poll.category);
  const remaining = remainingLabel(poll.expiresAt, height);

  const refreshHasVoted = useCallback(() => setHvTick(t => t + 1), []);

  useEffect(() => {
    let alive = true;
    if (!address) {
      setHasVoted(null);
      setCheckingVote(false);
      return;
    }
    setCheckingVote(true);
    void loadHasVoted(poll.id, address).then(value => {
      if (!alive) return;
      setHasVoted(value);
      setCheckingVote(false);
    });
    return () => {
      alive = false;
    };
  }, [poll.id, address, hvTick]);

  useEffect(() => {
    if (vote.txStatus === 'success') {
      setSuccessTxid(vote.txid);
      setErrorMessage(null);
      setNotice(null);
      onResultsChanged();
      refreshHasVoted();
    } else if (vote.txStatus === 'abort_by_response') {
      setSuccessTxid(null);
      const repr = vote.txStatusError;
      setErrorMessage(humanizeRejection(repr));
      if (repr && repr.includes('u102')) {
        refreshHasVoted();
        onResultsChanged();
      }
    } else if (vote.txStatus === 'error') {
      setSuccessTxid(null);
      setErrorMessage(vote.txStatusError ?? 'The transaction failed. Please try again.');
    }
  }, [vote.txStatus, vote.txid, vote.txStatusError, onResultsChanged, refreshHasVoted]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const submit = async () => {
    if (selected === null || pending || voted || closed) return;
    setErrorMessage(null);
    setNotice(null);
    setSuccessTxid(null);
    if (!address) {
      setNotice('Connect your Stacks wallet first (top right) to cast a vote.');
      return;
    }
    try {
      const result = await vote.call([Cl.uint(poll.id), Cl.uint(selected)]);
      if (!result) {
        setErrorMessage('The Pulse contract is not deployed on this network.');
      } else if (!result.txid) {
        setErrorMessage('The wallet did not return a transaction id. Please try again.');
      }
    } catch (error) {
      setErrorMessage(humanizeError(error));
    }
  };

  const total = poll.totalVotes;
  const leading = total > 0 ? Math.max(...poll.counts) : 0;
  const winners =
    total > 0
      ? poll.options.filter((_, index) => (poll.counts[index] ?? 0) === leading)
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={poll.question}
    >
      <div
        className="absolute inset-0 bg-[#02040a]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl animate-pulse-in overflow-y-auto rounded-t-3xl border border-[#1a2235] bg-[#0b111e] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:mx-4 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
            style={{ background: `${meta.color}1a`, color: meta.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close poll"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1a2235] bg-[#101726] text-[#93a0b8] transition-colors hover:text-[#e8edf7]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <h2 className="mt-4 font-display text-2xl font-semibold leading-snug text-[#e8edf7] sm:text-3xl">
          {poll.question}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-[#64748b]">
          <span title={poll.creator}>by {poll.creator ? shortAddress(poll.creator) : 'unknown'}</span>
          <span>#{poll.id}</span>
          <span className={closed ? 'text-[#93a0b8]' : 'text-[#34d399]'}>
            {closed ? closedAgoLabel(poll.expiresAt, height) : `closes ${remaining ?? 'soon'}`}
          </span>
          <span>
            {formatCount(total)} vote{total === 1 ? '' : 's'}
          </span>
        </div>

        {closed && (
          <div className="mt-4 rounded-xl border border-[#10b981]/25 bg-[#10b981]/8 px-4 py-3 text-sm text-[#6ee7b7]">
            {total > 0 ? (
              <>
                Voting closed.{' '}
                {winners.length === 1 ? (
                  <>
                    Leading option: <strong className="font-semibold">{winners[0]}</strong>
                    {winners[0] && ` with ${poll.counts[poll.options.indexOf(winners[0])] ?? 0} votes.`}
                  </>
                ) : (
                  <>Result tied between {winners.length} options.</>
                )}
              </>
            ) : (
              <>Voting closed. No votes were cast.</>
            )}
          </div>
        )}

        <div className="mt-6 space-y-3">
          {poll.options.map((option, index) => {
            const count = poll.counts[index] ?? 0;
            const pct = percent(count, total);
            const isSelected = selected === index;
            const isMine = hasVoted === index;
            const disabled = closed || voted || pending || !address;
            return (
              <button
                key={option}
                type="button"
                onClick={() => !disabled && setSelected(index)}
                disabled={disabled}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-[#10b981] bg-[#10b981]/8'
                    : 'border-[#1a2235] bg-[#0a0f1b] hover:border-[#2b3752]'
                } ${disabled && !isSelected ? 'cursor-not-allowed opacity-80' : ''}`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        isSelected ? 'border-[#10b981]' : 'border-[#2b3752]'
                      }`}
                    >
                      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />}
                    </span>
                    <span
                      className={`text-sm ${isSelected || isMine ? 'font-medium text-[#e8edf7]' : 'text-[#93a0b8]'}`}
                    >
                      {option}
                    </span>
                    {isMine && (
                      <span className="rounded-full bg-[#10b981]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#34d399]">
                        Your vote
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-[#64748b]">
                    {pct}% · {count}
                  </span>
                </div>
                <div className="pl-bar-track mt-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background:
                        total > 0 && count === leading
                          ? `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)`
                          : `${meta.color}66`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {successTxid && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-[#10b981]/30 bg-[#10b981]/8 px-4 py-3 text-sm text-[#6ee7b7]"
          >
            Vote recorded on Stacks.{' '}
            {vote.explorerUrl && (
              <a
                href={vote.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                View transaction
              </a>
            )}
          </p>
        )}

        {pending && !successTxid && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-[#1a2235] bg-[#101726] px-4 py-3 text-sm text-[#93a0b8]"
          >
            <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#10b981] border-t-transparent align-[-2px]" />
            Confirming on Stacks… Check your wallet if a prompt is open.
          </p>
        )}

        {notice && !pending && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-[#1a2235] bg-[#101726] px-4 py-3 text-sm text-[#93a0b8]"
          >
            {notice}
          </p>
        )}

        {errorMessage && !pending && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-[#f43f5e]/30 bg-[#f43f5e]/8 px-4 py-3 text-sm text-[#fb7185]"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-[#141b2b] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#64748b]">
            {closed
              ? 'This poll is closed — results are final.'
              : voted
                ? 'Your vote is final and recorded on-chain.'
                : address
                  ? 'One vote per address. Your choice is final.'
                  : 'Connect your wallet (top right) to cast a vote.'}
          </p>
          {closed ? (
            <button type="button" onClick={onClose} className="pl-btn-ghost">
              Close
            </button>
          ) : voted ? (
            <button type="button" onClick={onClose} className="pl-btn-ghost" disabled>
              {checkingVote ? 'Checking…' : 'Already voted'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit()}
              className="pl-btn-primary"
              disabled={!address || selected === null || pending}
            >
              {!address
                ? 'Connect wallet to vote'
                : pending
                  ? 'Submitting…'
                  : selected === null
                    ? 'Select an option'
                    : 'Cast vote'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PollModal;
