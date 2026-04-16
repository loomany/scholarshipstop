'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';
import { toast } from '@/components/ui/Toasts/use-toast';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  addIgnoredScholarship,
  getIgnoredScholarshipIds
} from '@/app/scholarships/ignoredScholarships';
import {
  deleteUserSavedScholarship,
  fetchUserSavedScholarshipIds,
  postUserSavedScholarship
} from '@/app/scholarships/savedScholarshipsAccountApi';
import {
  getSavedScholarshipIds,
  removeScholarship,
  saveScholarship
} from '@/app/scholarships/savedScholarships';
import { getViewedScholarshipIds } from '@/app/scholarships/viewedScholarships';

type Props = {
  scholarships: Scholarship[];
  isAuthenticated: boolean;
  hasSubscription: boolean;
};

export function ProviderProfileScholarshipsList({
  scholarships,
  isAuthenticated,
  hasSubscription
}: Props) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);

  const isSubscriptionLocked = isAuthenticated && !hasSubscription;

  const refreshSavedIds = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedIds([]);
      return;
    }
    const fromStorage = getSavedScholarshipIds();
    try {
      const serverIds = await fetchUserSavedScholarshipIds();
      if (serverIds !== null) {
        setSavedIds([...new Set([...serverIds, ...fromStorage])]);
      } else {
        setSavedIds(fromStorage);
      }
    } catch {
      setSavedIds(fromStorage);
    }
  }, [isAuthenticated]);

  const syncFromStorage = useCallback(() => {
    setViewedIds(getViewedScholarshipIds());
    if (!isAuthenticated) {
      setIgnoredIds([]);
      return;
    }
    setIgnoredIds(getIgnoredScholarshipIds());
  }, [isAuthenticated]);

  useEffect(() => {
    syncFromStorage();
    void refreshSavedIds();
  }, [syncFromStorage, refreshSavedIds]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (
        e.key === 'savedScholarships' ||
        e.key === 'scholarshipIgnored' ||
        e.key === 'scholarshipViewedIds'
      ) {
        syncFromStorage();
        void refreshSavedIds();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncFromStorage, refreshSavedIds]);

  const openRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(true);
  }, []);
  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);
  const openSubscriptionOffer = useCallback(() => {
    setSubscriptionOfferOpen(true);
  }, []);
  const closeSubscriptionOffer = useCallback(() => {
    setSubscriptionOfferOpen(false);
  }, []);

  const toggleSave = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        openRegistrationWall();
        return;
      }
      const wasSaved = savedIds.includes(id);
      const ok = wasSaved
        ? await deleteUserSavedScholarship(id)
        : await postUserSavedScholarship(id);
      if (!ok) {
        toast({
          title: 'Could not update saved scholarships',
          description: 'Check your connection and try again.',
          variant: 'destructive'
        });
        return;
      }
      setSavedIds(wasSaved ? removeScholarship(id) : saveScholarship(id));
    },
    [isAuthenticated, openRegistrationWall, savedIds]
  );

  const ignoreScholarship = useCallback(
    (id: string) => {
      if (!isAuthenticated) {
        openRegistrationWall();
        return;
      }
      setIgnoredIds(addIgnoredScholarship(id));
    },
    [isAuthenticated, openRegistrationWall]
  );

  const visible = useMemo(
    () => scholarships.filter((s) => !ignoredIds.includes(s.id)),
    [scholarships, ignoredIds]
  );

  if (scholarships.length === 0) {
    return null;
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-10 text-center text-slate-600 shadow-sm">
        <p className="text-base font-medium text-zinc-800">
          Every scholarship here is hidden from your matches (Not relevant).
        </p>
        <p className="mt-3 text-sm text-zinc-600">
          Restore them from the Ignored tab in the scholarship hub.
        </p>
        <Link
          href="/scholarships?tab=ignored"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
        >
          Open Ignored tab
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="relative z-0 flex w-full min-w-0 flex-col gap-4">
        {visible.map((s) => (
          <ScholarshipCard
            key={s.id}
            scholarship={s}
            isUnread={!viewedIds.includes(s.id)}
            saved={savedIds.includes(s.id)}
            onToggleSave={toggleSave}
            onHide={ignoreScholarship}
            showCardActions
            subscriptionLocked={isSubscriptionLocked}
            onSubscriptionLockedCategoryClick={
              isSubscriptionLocked ? openSubscriptionOffer : undefined
            }
          />
        ))}
      </div>
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
      />
      <ScholarshipSubscriptionOfferModal
        open={subscriptionOfferOpen}
        onClose={closeSubscriptionOffer}
      />
    </>
  );
}
