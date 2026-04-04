'use client';

import { type ReactNode } from 'react';
import { Lock } from 'lucide-react';

import './ai-lock-overlay.css';

type ScholarshipDetailGuestLockSectionProps = {
  locked: boolean;
  onSignIn: () => void;
  children: ReactNode;
};

function AiLockCard({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div
      className="ai-lock-card"
      role="region"
      aria-labelledby="ai-lock-card-title"
    >
      <div className="ai-lock-card-icon" aria-hidden>
        <Lock strokeWidth={2.25} />
      </div>
      <p className="ai-lock-card-text" id="ai-lock-card-title">
        Sign in to unlock full access to AI insights
      </p>
      <button
        type="button"
        className="ai-lock-card-button"
        onClick={onSignIn}
      >
        Sign in
      </button>
    </div>
  );
}

/**
 * Blur veil and CTA are scoped to this section only.
 * Lock card uses `position: sticky` so it tracks the viewport while scrolling
 * through the locked block, but cannot leave the section’s bounds.
 */
export function ScholarshipDetailGuestLockSection({
  locked,
  onSignIn,
  children
}: ScholarshipDetailGuestLockSectionProps) {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <section
      className="locked-section"
      aria-label="Scholarship details require sign-in"
    >
      <div className="locked-content">{children}</div>
      <div className="locked-overlay" role="presentation" aria-hidden />
      <div className="lock-card-wrap">
        <div className="lock-card-sticky">
          <AiLockCard onSignIn={onSignIn} />
        </div>
      </div>
    </section>
  );
}
