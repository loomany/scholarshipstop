'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipRegistrationWallModal, {
  type ScholarshipRegistrationWallContentMode
} from '@/components/scholarships/ScholarshipRegistrationWallModal';
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
import { createClient } from '@/utils/supabase/client';

type Props = {
  scholarships: Scholarship[];
};

/**
 * Same `ScholarshipCard` layout as the scholarship hub listing (not the narrow stacked variant)
 * for resource/essay “Related scholarships” — save/ignore + registration modal.
 */
export default function ContentHubArticleMatchedScholarshipCards({
  scholarships
}: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  const [registrationWallContent, setRegistrationWallContent] =
    useState<ScholarshipRegistrationWallContentMode>('hub');

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
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setIsAuthenticated(Boolean(session?.user?.id));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        {visible.map((scholarship) => (
          <li key={scholarship.id} className="block min-w-0 w-full">
            <div className="relative z-0 w-full min-w-0">
              <ScholarshipCard
                scholarship={scholarship}
                isUnread={!viewedIds.includes(scholarship.id)}
                saved={savedIds.includes(scholarship.id)}
                onToggleSave={toggleSave}
                onHide={ignoreScholarship}
                showCardActions
                subscriptionLocked={false}
                onGuestDetailNavigate={
                  !isAuthenticated
                    ? () => openRegistrationWall('card-unlock')
                    : undefined
                }
              />
            </div>
          </li>
        ))}
      </ul>
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
        contentMode={registrationWallContent}
      />
    </>
  );
}
