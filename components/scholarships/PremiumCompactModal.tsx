'use client';

import { dismissRouteProgress } from '@/lib/navigation/dismissRouteProgress';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Lock, X } from 'lucide-react';

type PremiumCompactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeClick: () => void;
};

const PREMIUM_FEATURES = [
  {
    id: 'ai-essay-mentor',
    title: '🤖 AI Essay Mentor:',
    body: 'Craft winning applications in minutes (on select plans).'
  },
  {
    id: 'full-grant-visibility',
    title: '🔑 Full Grant Visibility:',
    body: 'Unblur all grant names, external links, and deadlines.'
  },
  {
    id: 'exclusive-matches',
    title: '🎯 Exclusive Matches:',
    body: 'Lock in your criteria and get notified about matching opportunities.'
  }
] as const;

export default function PremiumCompactModal({
  isOpen,
  onClose,
  onUpgradeClick
}: PremiumCompactModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dismissRouteProgress();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close premium paywall"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-compact-modal-title"
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 transition hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <div className="text-center">
          <h2
            id="premium-compact-modal-title"
            className="flex items-center justify-center gap-2 pr-8 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl"
          >
            Unlock Premium Access
            <Lock className="h-4 w-4 text-[#ff7b00]" strokeWidth={2.3} aria-hidden />
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            This is a premium-only feature. Upgrade now to see all grants, access
            advanced tools, and use our powerful AI Essay Mentor.
          </p>
        </div>

        <ul className="mt-4 space-y-2.5">
          {PREMIUM_FEATURES.map((feature) => (
            <li key={feature.id} className="flex items-start gap-2.5 text-sm text-gray-700">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                strokeWidth={2.5}
                aria-hidden
              />
              <p className="leading-relaxed">
                <span className="font-semibold text-gray-900">{feature.title}</span>{' '}
                {feature.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <button
            type="button"
            onClick={onUpgradeClick}
            className="w-full rounded-lg bg-[#ff7b00] py-2 font-semibold text-white transition hover:bg-[#e66f00] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2"
          >
            🚀 View Premium Plans
          </button>
        </div>

        <p className="mt-3 text-center text-sm text-gray-400">
          Secure payment • Cancel anytime
        </p>
      </div>
    </div>,
    document.body
  );
}
