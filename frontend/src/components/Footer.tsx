import React from 'react';
import deploymentsJson from '@/generated/deployments.json';

type Deployments = {
  contracts?: Record<string, { contract_id?: string } | undefined>;
};

const deployments = deploymentsJson as Deployments;
const contractId = deployments.contracts?.pulse?.contract_id;
const explorerUrl = contractId
  ? `https://explorer.hiro.so/contract/${contractId}?chain=testnet`
  : null;

function Footer() {
  return (
    <footer className="mt-20 w-full border-t border-[#141b2b] bg-[#070a12]">
      <div className="pl-container flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#10b981]/30 bg-[#10b981]/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M2 12h4l3-7 4 14 3-7h6"
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-display text-base font-semibold tracking-tight">PULSE</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#93a0b8]">
            Community polls with results settled on the Stacks blockchain. Every vote is a real
            transaction — transparent, tamper-proof, and open to verify.
          </p>
        </div>

        <div className="flex flex-wrap gap-10 text-sm">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
              Explore
            </p>
            <a href="#trending" className="block text-[#93a0b8] transition-colors hover:text-[#e8edf7]">
              Trending
            </a>
            <a href="#active" className="block text-[#93a0b8] transition-colors hover:text-[#e8edf7]">
              Active polls
            </a>
            <a href="#completed" className="block text-[#93a0b8] transition-colors hover:text-[#e8edf7]">
              Completed
            </a>
          </div>
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
              On-chain
            </p>
            {contractId && (
              <a
                href={explorerUrl ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="block font-mono text-[13px] text-[#34d399] transition-colors hover:text-[#6ee7b7]"
              >
                {contractId}
              </a>
            )}
            <a
              href="https://docs.stacks.co"
              target="_blank"
              rel="noreferrer"
              className="block text-[#93a0b8] transition-colors hover:text-[#e8edf7]"
            >
              Stacks docs
            </a>
            <a
              href="https://scaffoldstacks.mintlify.app/"
              target="_blank"
              rel="noreferrer"
              className="block text-[#93a0b8] transition-colors hover:text-[#e8edf7]"
            >
              Scaffold Stacks
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-[#141b2b]">
        <div className="pl-container flex flex-col gap-2 py-5 text-xs text-[#64748b] sm:flex-row sm:items-center sm:justify-between">
          <p>Pulse runs on Stacks testnet. Polls reflect the opinions of their voters only.</p>
          <p className="font-mono">Built with Scaffold Stacks</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
