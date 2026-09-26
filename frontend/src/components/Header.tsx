import React from 'react';
import { WalletConnect } from './WalletConnect';
import NetworkBadge from './NetworkBadge';

const links = [
  { href: '#trending', label: 'Trending' },
  { href: '#active', label: 'Active polls' },
  { href: '#completed', label: 'Completed' },
  { href: '#about', label: 'About' },
];

function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#141b2b] bg-[#05070d]/85 backdrop-blur-xl">
      <div className="pl-container flex h-16 items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-3" aria-label="Pulse home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#10b981]/30 bg-[#10b981]/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2 12h4l3-7 4 14 3-7h6"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-[#e8edf7]">
            PULSE
          </span>
          <NetworkBadge />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-[#93a0b8] transition-colors hover:bg-[#101726] hover:text-[#e8edf7]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}

export default Header;
