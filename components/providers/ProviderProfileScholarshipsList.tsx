'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipRegistrationWallModal, {
  type ScholarshipRegistrationWallContentMode
} from '@/components/scholarships/ScholarshipRegistrationWallModal';
import ScholarshipSubscriptionOfferModal from '@/components/scholarships/ScholarshipSubscriptionOfferModal';
import { SCHOLARSHIP_FREE_PLAN_DETAIL_PREVIEW_LIMIT_NOTICE } from '@/lib/scholarships/scholarshipSubscriptionOfferCopy';
import { toast } from '@/components/ui/Toasts/use-toast';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  addIgnoredScholarship,
  getIgnoredScholarshipIds,
  IGNORED_SCHOLARSHIPS_KEY
} from '@/app/scholarships/ignoredScholarships';
import {
  deleteUserSavedScholarship,
  fetchUserSavedScholarshipIds,
  postUserSavedScholarship
} from '@/app/scholarships/savedScholarshipsAccountApi';
import {
  getSavedScholarshipIds,
  removeScholarship,
  saveScholarship,
  SAVED_SCHOLARSHIPS_KEY
} from '@/app/scholarships/savedScholarships';
import { useCurrentUserScholarshipMatchProfile } from '@/app/scholarships/useCurrentUserScholarshipMatchProfile';
import { getViewedScholarshipIds } from '@/app/scholarships/viewedScholarships';
import { storageKeyMatchesBase } from '@/app/scholarships/userScopedStorage';
import { applyProfileMatchPercentToScholarships } from '@/lib/scholarships/profileMatchBadge';

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
  const [registrationWallContent, setRegistrationWallContent] =
    useState<ScholarshipRegistrationWallContentMode>('hub');
  const [subscriptionOfferOpen, setSubscriptionOfferOpen] = useState(false);
  const [subscriptionOfferNotice, setSubscriptionOfferNotice] = useState<
    string | undefined
  >(undefined);
  const { profile: currentMatchProfile } =
    useCurrentUserScholarshipMatchProfile(isAuthenticated);

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
        storageKeyMatchesBase(e.key, SAVED_SCHOLARSHIPS_KEY) ||
        storageKeyMatchesBase(e.key, IGNORED_SCHOLARSHIPS_KEY) ||
        e.key === 'scholarshipViewedIds'
      ) {
        syncFromStorage();
        void refreshSavedIds();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncFromStorage, refreshSavedIds]);

  const openRegistrationWall = useCallback(
    (mode?: ScholarshipRegistrationWallContentMode) => {
      setRegistrationWallContent(mode ?? 'hub');
      setRegistrationWallOpen(true);
    },
    []
  );
  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);
  const openSubscriptionOffer = useCallback((arg?: unknown) => {
    const notice = typeof arg === 'string' ? arg : undefined;
    setSubscriptionOfferNotice(notice);
    setSubscriptionOfferOpen(true);
  }, []);
  const closeSubscriptionOffer = useCallback(() => {
    setSubscriptionOfferOpen(false);
    setSubscriptionOfferNotice(undefined);
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
  const visibleWithMatch = useMemo(
    () => applyProfileMatchPercentToScholarships(visible, currentMatchProfile),
    [visible, currentMatchProfile]
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
        {visibleWithMatch.map((s) => (
          <ScholarshipCard
            key={s.id}
            scholarship={s}
            isUnread={!viewedIds.includes(s.id)}
            saved={savedIds.includes(s.id)}
            onToggleSave={toggleSave}
            onHide={ignoreScholarship}
            showCardActions
            subscriptionLocked={isSubscriptionLocked}
            isAuthenticated={isAuthenticated}
            hasSubscription={hasSubscription}
            onSubscriptionLockedCategoryClick={
              isSubscriptionLocked ? openSubscriptionOffer : undefined
            }
            onSubscriptionDetailNavigate={
              isSubscriptionLocked
                ? () =>
                    openSubscriptionOffer(
                      SCHOLARSHIP_FREE_PLAN_DETAIL_PREVIEW_LIMIT_NOTICE
                    )
                : undefined
            }
            onGuestDetailNavigate={
              !isAuthenticated
                ? () => openRegistrationWall('card-unlock')
                : undefined
            }
          />
        ))}
      </div>
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
        contentMode={registrationWallContent}
      />
      <ScholarshipSubscriptionOfferModal
        open={subscriptionOfferOpen}
        onClose={closeSubscriptionOffer}
        notice={subscriptionOfferNotice}
      />
    </>
  );
}
