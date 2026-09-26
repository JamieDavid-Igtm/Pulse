import React from 'react';
import { scaffoldConfig } from '../scaffold.config';

function NetworkBadge() {
  const network = scaffoldConfig.network;
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-[#10b981]/25 bg-[#10b981]/10 px-2.5 py-1 font-mono text-[11px] font-medium text-[#34d399] sm:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" aria-hidden="true" />
      {network}
    </span>
  );
}

export default NetworkBadge;
