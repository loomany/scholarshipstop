'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import AuthStatusProvider from '@/components/auth/AuthStatusProvider';
import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipEmailConfirmRequiredModal from '@/components/scholarships/ScholarshipEmailConfirmRequiredModal';
import ScholarshipIqInlineCard from '@/components/scholarships/ScholarshipIqInlineCard';
import ScholarshipRegistrationWallModal, {
  type ScholarshipRegistrationWallContentMode
} from '@/components/scholarships/ScholarshipRegistrationWallModal';
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
import { getViewedScholarshipIds } from '@/app/scholarships/viewedScholarships';
import { useCurrentUserScholarshipMatchProfile } from '@/app/scholarships/useCurrentUserScholarshipMatchProfile';
import {
  storageKeyMatchesBase
} from '@/app/scholarships/userScopedStorage';
import { applyProfileMatchPercentToScholarships } from '@/lib/scholarships/profileMatchBadge';

type Props = {
  scholarships: Scholarship[];
  showIqAdAfterFirst?: boolean;
};

/**
 * Same `ScholarshipCard` layout as the scholarship hub listing (not the narrow stacked variant)
 * for resource/essay “Related scholarships” — save/ignore + registration modal.
 */
function ContentHubArticleMatchedScholarshipCardsInner({
  scholarships,
  showIqAdAfterFirst = false,
  isAuthenticated,
  hasSubscription,
  authResolved,
  needsEmailConfirmation
}: Props & {
  isAuthenticated: boolean;
  hasSubscription: boolean;
  authResolved: boolean;
  needsEmailConfirmation: boolean;
}) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [emailConfirmModalOpen, setEmailConfirmModalOpen] = useState(false);
  const [registrationWallVariant, setRegistrationWallVariant] = useState<
    'scholarships' | 'essay' | 'locked-category'
  >('scholarships');
  const [registrationWallContent, setRegistrationWallContent] =
    useState<ScholarshipRegistrationWallContentMode>('hub');
  const { profile: currentMatchProfile } =
    useCurrentUserScholarshipMatchProfile(isAuthenticated && authResolved);

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
      setRegistrationWallVariant('scholarships');
      setRegistrationWallContent(mode ?? 'hub');
      setRegistrationWallOpen(true);
    },
    []
  );
  const openLockedCategoryWall = useCallback(() => {
    setRegistrationWallVariant('locked-category');
    setRegistrationWallOpen(true);
  }, []);
  const openLockedScholarshipWallForCard = useCallback(() => {
    if (!isAuthenticated) {
      openRegistrationWall('grant-guest');
      return;
    }
    openLockedCategoryWall();
  }, [isAuthenticated, openRegistrationWall, openLockedCategoryWall]);
  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);
  const openEmailConfirmWall = useCallback(() => {
    setEmailConfirmModalOpen(true);
  }, []);
  const closeEmailConfirmWall = useCallback(() => {
    setEmailConfirmModalOpen(false);
  }, []);

  const catalogFreeTier = authResolved && !hasSubscription;

  const toggleSave = useCallback(
    async (id: string) => {
      const wasSaved = savedIds.includes(id);
      if (!isAuthenticated) {
        setSavedIds(wasSaved ? removeScholarship(id) : saveScholarship(id));
        return;
      }
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
    [isAuthenticated, savedIds]
  );

  const ignoreScholarship = useCallback((id: string) => {
    setIgnoredIds(addIgnoredScholarship(id));
  }, []);

  const visible = useMemo(
    () => scholarships.filter((s) => !ignoredIds.includes(s.id)),
    [scholarships, ignoredIds]
  );
  const visibleWithMatch = useMemo(
    () => applyProfileMatchPercentToScholarships(visible, currentMatchProfile),
    [visible, currentMatchProfile]
  );

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-8 text-left text-slate-600 shadow-sm">
        <p className="text-sm font-medium text-zinc-800">
          These scholarships are hidden from your matches here (Not relevant).
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Restore them from the Ignored tab in the scholarship hub.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-6 list-none space-y-4">
        {visibleWithMatch.map((scholarship, index) => (
          <li key={scholarship.id} className="block min-w-0 w-full">
            <div className="relative z-0 w-full min-w-0">
              <ScholarshipCard
                scholarship={scholarship}
                isUnread={!viewedIds.includes(scholarship.id)}
                saved={savedIds.includes(scholarship.id)}
                onToggleSave={toggleSave}
                onHide={ignoreScholarship}
                showCardActions
                subscriptionLocked={catalogFreeTier}
                isAuthenticated={isAuthenticated}
                hasSubscription={hasSubscription}
                authResolved={authResolved}
                onSubscriptionLockedCategoryClick={
                  openLockedScholarshipWallForCard
                }
                onLockedScholarshipNavigate={openLockedScholarshipWallForCard}
                onSubscriptionDetailNavigate={
                  catalogFreeTier
                    ? () => openRegistrationWall('card-unlock')
                    : openLockedCategoryWall
                }
                onGuestDetailNavigate={
                  !isAuthenticated
                    ? () => openRegistrationWall('grant-guest')
                    : undefined
                }
                needsEmailConfirmation={needsEmailConfirmation}
                onUnverifiedEmailDetailNavigate={openEmailConfirmWall}
              />
            </div>
            {showIqAdAfterFirst && index === 0 ? (
              <div className="mt-4">
                <ScholarshipIqInlineCard />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <ScholarshipEmailConfirmRequiredModal
        open={emailConfirmModalOpen}
        onClose={closeEmailConfirmWall}
      />
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
        variant={registrationWallVariant}
        contentMode={registrationWallContent}
        signedInWithoutSubscription={Boolean(
          isAuthenticated && authResolved && !hasSubscription
        )}
      />
    </>
  );
}

export default function ContentHubArticleMatchedScholarshipCards(props: Props) {
  return (
    <AuthStatusProvider>
      {({
        isAuthenticated,
        hasSubscription,
        authResolved,
        needsEmailConfirmation
      }) => (
        <ContentHubArticleMatchedScholarshipCardsInner
          {...props}
          isAuthenticated={isAuthenticated}
          hasSubscription={hasSubscription}
          authResolved={authResolved}
          needsEmailConfirmation={needsEmailConfirmation}
        />
      )}
    </AuthStatusProvider>
  );
}
