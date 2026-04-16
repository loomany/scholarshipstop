'use client';

import { useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

import {
  deleteUserSavedScholarship,
  fetchUserSavedScholarshipIds,
  postUserSavedScholarship
} from './savedScholarshipsAccountApi';
import {
  isScholarshipSaved,
  removeScholarship,
  saveScholarship
} from './savedScholarships';

type SaveScholarshipButtonProps = {
  scholarshipId: string;
  /** `icon` = compact circle for detail header (same storage as default). */
  variant?: 'default' | 'icon';
  /** Called after save/unsave writes to localStorage (e.g. refresh sidebar counts). */
  onPersistChange?: () => void;
};

export default function SaveScholarshipButton({
  scholarshipId,
  variant = 'default',
  onPersistChange
}: SaveScholarshipButtonProps) {
  const [saved, setSaved] = useState(false);
  const [accountMode, setAccountMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user?.id) {
        if (!cancelled) {
          setAccountMode(false);
          setSaved(isScholarshipSaved(scholarshipId));
        }
        return;
      }
      setAccountMode(true);
      const ids = await fetchUserSavedScholarshipIds();
      if (cancelled || ids === null) return;
      setSaved(ids.includes(scholarshipId));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [scholarshipId]);

  const onSave = useCallback(async () => {
    if (accountMode) {
      const ok = saved
        ? await deleteUserSavedScholarship(scholarshipId)
        : await postUserSavedScholarship(scholarshipId);
      if (ok) {
        setSaved(!saved);
        onPersistChange?.();
      }
      return;
    }

    if (saved) {
      removeScholarship(scholarshipId);
      setSaved(false);
      onPersistChange?.();
      return;
    }
    saveScholarship(scholarshipId);
    setSaved(true);
    onPersistChange?.();
  }, [accountMode, saved, scholarshipId, onPersistChange]);

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onSave}
        aria-label={saved ? 'Remove from saved' : 'Save scholarship'}
        aria-pressed={saved}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 ${
          saved ? 'border-rose-200 bg-rose-50 text-rose-600' : ''
        }`}
      >
        <Heart
          className="h-4 w-4"
          strokeWidth={2}
          fill={saved ? 'currentColor' : 'none'}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSave}
      aria-pressed={saved}
      className={`w-full rounded-2xl border px-8 py-4 text-lg font-semibold transition hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:max-w-md ${
        saved
          ? 'border-gray-600 bg-zinc-100 text-gray-900 hover:border-gray-800 hover:bg-zinc-200/80 focus-visible:ring-gray-900/25'
          : 'border-gray-700 bg-white text-zinc-900 shadow-sm hover:border-gray-900 hover:bg-zinc-50 focus-visible:ring-gray-900/25'
      }`}
    >
      {saved ? 'Saved ✓' : 'Save'}
    </button>
  );
}
