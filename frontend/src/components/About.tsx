"use client";
import deploymentsJson from '@/generated/deployments.json';

type Deployments = {
  contracts?: Record<string, { contract_id?: string } | undefined>;
};

const deployments = deploymentsJson as Deployments;
const contractId = deployments.contracts?.pulse?.contract_id;

const steps = [
  {
    title: 'Create',
    body: 'Write a question, add two to four options, pick a category and a voting window. Publishing is a single Stacks transaction.',
  },
  {
    title: 'Vote',
    body: 'Connect a Stacks wallet and cast one vote per poll. Your choice is written on-chain — no accounts, no email, no off-chain tally.',
  },
  {
    title: 'Verify',
    body: 'Results are computed from on-chain ballots by the contract itself. Anyone can re-run the read-only calls and check the numbers.',
  },
];

const features = [
  {
    title: 'Votes live on Stacks',
    body: 'Every ballot is a real transaction with a txid you can open in the explorer.',
  },
  {
    title: 'Transparent tallies',
    body: 'Counts come straight from the contract’s public maps — nothing is kept behind a server.',
  },
  {
    title: 'One address, one vote',
    body: 'The contract records each voter per poll, so double votes are rejected on-chain.',
  },
];

function About() {
  return (
    <section id="about" className="pl-container py-16">
      <div className="max-w-3xl">
        <p className="pl-kicker">About</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#e8edf7] sm:text-4xl">
          How Pulse works
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[#93a0b8]">
          Pulse keeps the whole polling lifecycle on-chain: the question, the options, every vote,
          and the final tally. There is no backend to trust — the contract is the count.
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="pl-card p-6">
            <span className="font-display text-3xl font-semibold tabular-nums text-[#1f2a42]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 font-display text-lg font-medium text-[#e8edf7]">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#93a0b8]">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {features.map(feature => (
          <div key={feature.title} className="pl-card border-dashed p-6">
            <h3 className="font-display text-base font-medium text-[#34d399]">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#93a0b8]">{feature.body}</p>
          </div>
        ))}
      </div>

      <div className="pl-card mt-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#e8edf7]">Contract on Stacks testnet</p>
          <p className="mt-1 text-xs text-[#64748b]">
            Polls are created by the community and reflect only the opinions of those who vote.
          </p>
        </div>
        {contractId && (
          <a
            href={`https://explorer.hiro.so/contract/${contractId}?chain=testnet`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[13px] text-[#34d399] underline-offset-4 hover:underline"
          >
            {contractId}
          </a>
        )}
      </div>
    </section>
  );
}

export default About;
