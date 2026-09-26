"use client";
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Cl } from '@stacks/transactions';
import { usePulse_CreatePoll } from '@/generated/hooks';
import { CATEGORIES, humanizeError, humanizeRejection } from '@/lib/pulse';

const QUESTION_MAX = 200;
const OPTION_MAX = 60;
const MAX_OPTIONS = 4;

const DURATIONS = [
  { blocks: 3600, label: '6 hours' },
  { blocks: 7200, label: '12 hours' },
  { blocks: 14400, label: '24 hours' },
  { blocks: 28800, label: '48 hours' },
];

type Props = {
  address: string | null;
  onClose: () => void;
  onCreated: () => void;
};

function CreatePollModal({ address, onClose, onCreated }: Props) {
  const create = usePulse_CreatePoll();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [duration, setDuration] = useState(14400);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdTxid, setCreatedTxid] = useState<string | null>(null);

  const pending = create.loading || create.txStatus === 'pending';

  const problems = useMemo(() => {
    const list: string[] = [];
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) list.push('Write a question.');
    else if (trimmedQuestion.length > QUESTION_MAX)
      list.push(`Question must be ${QUESTION_MAX} characters or fewer.`);

    const filled = options.map(o => o.trim());
    if (filled.filter(Boolean).length < 2) list.push('Provide at least two options.');
    filled.forEach((option, index) => {
      if (!option) list.push(`Option ${index + 1} is empty.`);
      else if (option.length > OPTION_MAX)
        list.push(`Option ${index + 1} must be ${OPTION_MAX} characters or fewer.`);
    });
    if (new Set(filled.filter(Boolean)).size !== filled.filter(Boolean).length)
      list.push('Options must be unique.');
    return list;
  }, [question, options]);

  const canSubmit = problems.length === 0 && !pending && !createdTxid;

  useEffect(() => {
    if (create.txStatus === 'success') {
      setCreatedTxid(create.txid);
      setErrorMessage(null);
      setNotice(null);
      onCreated();
    } else if (create.txStatus === 'abort_by_response') {
      setCreatedTxid(null);
      setErrorMessage(humanizeRejection(create.txStatusError));
    } else if (create.txStatus === 'error') {
      setCreatedTxid(null);
      setErrorMessage(create.txStatusError ?? 'The transaction failed. Please try again.');
    }
  }, [create.txStatus, create.txid, create.txStatusError, onCreated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose, pending]);

  const updateOption = (index: number, value: string) => {
    setOptions(prev => prev.map((option, i) => (i === index ? value : option)));
  };

  const addOption = () => {
    if (options.length < MAX_OPTIONS) setOptions(prev => [...prev, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setNotice(null);
    setErrorMessage(null);
    setCreatedTxid(null);
    if (!address) {
      setNotice('Connect your Stacks wallet first (top right) to create a poll.');
      return;
    }
    try {
      const result = await create.call([
        Cl.stringUtf8(question.trim()),
        Cl.list(options.map(option => Cl.stringUtf8(option.trim()))),
        Cl.stringUtf8(category),
        Cl.uint(duration),
      ]);
      if (!result) {
        setErrorMessage('The Pulse contract is not deployed on this network.');
      } else if (!result.txid) {
        setErrorMessage('The wallet did not return a transaction id. Please try again.');
      }
    } catch (error) {
      setErrorMessage(humanizeError(error));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Create a poll"
    >
      <div
        className="absolute inset-0 bg-[#02040a]/80 backdrop-blur-sm"
        onClick={() => !pending && onClose()}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl animate-pulse-in overflow-y-auto rounded-t-3xl border border-[#1a2235] bg-[#0b111e] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)] sm:mx-4 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="pl-kicker">New poll</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-[#e8edf7]">
              Ask the crowd
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={pending}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1a2235] bg-[#101726] text-[#93a0b8] transition-colors hover:text-[#e8edf7] disabled:opacity-60"
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

        {createdTxid ? (
          <div className="mt-6 rounded-2xl border border-[#10b981]/30 bg-[#10b981]/8 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10b981]/15">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-[#e8edf7]">
              Poll published on-chain
            </h3>
            <p className="mt-1 text-sm text-[#93a0b8]">
              It is now live on the board. Votes will appear in real time.
            </p>
            {create.explorerUrl && (
              <a
                href={create.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block font-mono text-xs text-[#34d399] underline"
              >
                View transaction
              </a>
            )}
            <div className="mt-5 flex justify-center">
              <button type="button" onClick={onClose} className="pl-btn-primary">
                Back to the board
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="poll-question"
                className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-[#e8edf7]"
              >
                Question
                <span className="font-mono text-xs tabular-nums text-[#64748b]">
                  {question.length} / {QUESTION_MAX}
                </span>
              </label>
              <input
                id="poll-question"
                className="pl-input"
                placeholder="e.g. Which city should host the next culture festival?"
                value={question}
                maxLength={QUESTION_MAX}
                onChange={event => setQuestion(event.target.value)}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="poll-option-0" className="text-sm font-medium text-[#e8edf7]">
                  Options
                </label>
                <span className="text-xs text-[#64748b]">
                  {options.length} of {MAX_OPTIONS}
                </span>
              </div>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-[#64748b]">
                      {index + 1}
                    </span>
                    <input
                      id={`poll-option-${index}`}
                      className="pl-input"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      maxLength={OPTION_MAX}
                      onChange={event => updateOption(index, event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      disabled={options.length <= 2}
                      aria-label={`Remove option ${index + 1}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#1a2235] bg-[#0a0f1b] text-[#93a0b8] transition-colors hover:text-[#fb7185] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M6 6l12 12M18 6 6 18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {options.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-sm font-medium text-[#34d399] transition-colors hover:text-[#6ee7b7]"
                >
                  + Add option
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="poll-category" className="mb-1.5 block text-sm font-medium text-[#e8edf7]">
                  Category
                </label>
                <select
                  id="poll-category"
                  className="pl-input appearance-none"
                  value={category}
                  onChange={event => setCategory(event.target.value)}
                >
                  {CATEGORIES.map(entry => (
                    <option key={entry.key} value={entry.key} className="bg-[#0b111e]">
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="poll-duration" className="mb-1.5 block text-sm font-medium text-[#e8edf7]">
                  Voting duration
                </label>
                <select
                  id="poll-duration"
                  className="pl-input appearance-none"
                  value={duration}
                  onChange={event => setDuration(Number(event.target.value))}
                >
                  {DURATIONS.map(entry => (
                    <option key={entry.blocks} value={entry.blocks} className="bg-[#0b111e]">
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[#64748b]">
              Publishing is a real Stacks transaction. Your wallet will ask you to confirm it; the
              poll goes live once the transaction settles.
            </p>

            {problems.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-[#1a2235] bg-[#101726] px-4 py-3 text-xs text-[#93a0b8]">
                {problems.slice(0, 3).map(problem => (
                  <li key={problem}>· {problem}</li>
                ))}
              </ul>
            )}

            {pending && (
              <p
                role="status"
                className="rounded-xl border border-[#1a2235] bg-[#101726] px-4 py-3 text-sm text-[#93a0b8]"
              >
                <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#10b981] border-t-transparent align-[-2px]" />
                Confirming on Stacks… Check your wallet if a prompt is open.
              </p>
            )}

            {notice && !pending && (
              <p
                role="status"
                className="rounded-xl border border-[#1a2235] bg-[#101726] px-4 py-3 text-sm text-[#93a0b8]"
              >
                {notice}
              </p>
            )}

            {errorMessage && !pending && (
              <p
                role="alert"
                className="rounded-xl border border-[#f43f5e]/30 bg-[#f43f5e]/8 px-4 py-3 text-sm text-[#fb7185]"
              >
                {errorMessage}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={onClose} className="pl-btn-ghost" disabled={pending}>
                Cancel
              </button>
              <button type="submit" className="pl-btn-primary" disabled={!canSubmit}>
                {pending ? 'Publishing…' : 'Publish poll'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default CreatePollModal;
