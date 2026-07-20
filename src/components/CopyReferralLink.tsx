"use client";

import { useState } from "react";

export function CopyReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="referral__linkrow">
      <input readOnly value={link} className="referral__input" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="btn btn--secondary btn--nav"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
