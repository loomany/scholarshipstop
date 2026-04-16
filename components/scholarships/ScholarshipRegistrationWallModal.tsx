'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Lock, X } from 'lucide-react';

export type ScholarshipRegistrationWallContentMode = 'hub' | 'card-unlock';

type ScholarshipRegistrationWallModalProps = {
  open: boolean;
  onClose: () => void;
  /** Essay mentor: copy about saving the interview before sign-up. */
  variant?: 'scholarships' | 'essay';
  /** Catalog card click vs. filters/save — controls copy and layout. */
  contentMode?: ScholarshipRegistrationWallContentMode;
};

export default function ScholarshipRegistrationWallModal({
  open,
  onClose,
  variant = 'scholarships',
  contentMode = 'hub'
}: ScholarshipRegistrationWallModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const showCardUnlock =
    variant === 'scholarships' && contentMode === 'card-unlock';

  if (showCardUnlock) {
    return (
      <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          aria-label="Close dialog"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="registration-wall-card-unlock-title"
          className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55 focus-visible:ring-offset-0"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>

          <div className="flex justify-center">
            <span className="inline-flex rounded-2xl bg-zinc-100 p-3 text-zinc-800 ring-1 ring-zinc-200/80">
              <Lock className="h-8 w-8" strokeWidth={2} aria-hidden />
            </span>
          </div>

          <h3
            id="registration-wall-card-unlock-title"
            className="mt-5 text-center text-xl font-bold tracking-tight text-zinc-900"
          >
            Unlock Full Scholarship Details
          </h3>
          <p className="mt-3 text-center text-sm leading-relaxed text-gray-600">
            Sign up for free to view deadlines, application links, and add this
            scholarship to your tracker.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/signup"
              onClick={onClose}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#FF7A1A] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#E6670C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB27D] focus-visible:ring-offset-0"
            >
              Create Free Account
            </Link>
            <Link
              href="/signin"
              onClick={onClose}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/45 focus-visible:ring-offset-0"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-wall-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/55 focus-visible:ring-offset-0"
        >
          <X className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <h2
          id="registration-wall-title"
          className="pr-10 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl"
        >
          Create a free account
        </h2>
        {variant === 'essay' ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
              Sign up to generate your full essay draft and save it to your account.
            </p>
            <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/90 px-3 py-2.5 text-sm leading-relaxed text-emerald-950">
              Don&apos;t worry — your conversation stays in this chat. When you come back after
              signing in, you can continue right where you left off and tap Generate Draft.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              You&apos;ll use the full sign-up flow: short profile (about you, location, GPA), then
              create your password — same as other members, so your essay and scholarship tools live
              in one account. Registration starts at step 1; when you finish, we take you back here
              to the essay mentor.
            </p>
            <ul className="mt-5 list-inside list-disc space-y-2 text-sm text-zinc-700 sm:text-[15px]">
              <li>Save your AI mentor interview in one place</li>
              <li>Unlock the full essay draft from your answers</li>
              <li>Edit and refine your essay on the next step</li>
            </ul>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
              Unlock filters, save scholarships, and see results tailored to you.
            </p>
            <ul className="mt-5 list-inside list-disc space-y-2 text-sm text-zinc-700 sm:text-[15px]">
              <li>See best recommendations based on your profile</li>
              <li>Filter by GPA, deadline, and requirements</li>
              <li>Browse scholarships by categories</li>
              <li>Sort by best recommendation and smart recommendations</li>
              <li>Save and track opportunities</li>
            </ul>
          </>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href={
              variant === 'essay'
                ? `/onboarding?step=1&next=${encodeURIComponent('/essay')}`
                : '/onboarding?step=3'
            }
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/80 focus-visible:ring-offset-0 sm:w-auto sm:min-w-[200px]"
          >
            Create free account
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/45 focus-visible:ring-offset-0 sm:w-auto"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
