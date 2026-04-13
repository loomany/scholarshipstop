'use client';

import { useCallback, useEffect, useState } from 'react';

import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import {
  addIgnoredScholarship,
  getIgnoredScholarshipIds
} from '@/app/scholarships/ignoredScholarships';
import {
  getSavedScholarshipIds,
  removeScholarship,
  saveScholarship
} from '@/app/scholarships/savedScholarships';
import { getViewedScholarshipIds } from '@/app/scholarships/viewedScholarships';
import { createClient } from '@/utils/supabase/client';

type Props = {
  scholarship: Scholarship;
};

/**
 * Hub-style `ScholarshipCard` for the resource article “Related scholarships” block
 * when exactly one match is shown (same layout as the main catalog).
 */
export default function ContentHubArticleMatchedScholarshipSingle({
  scholarship
}: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);

  const syncFromStorage = useCallback(() => {
    setViewedIds(getViewedScholarshipIds());
    if (isAuthenticated) {
      setSavedIds(getSavedScholarshipIds());
      setIgnoredIds(getIgnoredScholarshipIds());
    } else {
      setSavedIds([]);
      setIgnoredIds([]);
    }
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
  }, [syncFromStorage]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (
        e.key === 'savedScholarships' ||
        e.key === 'scholarshipIgnored' ||
        e.key === 'scholarshipViewedIds'
      ) {
        syncFromStorage();
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncFromStorage]);

  const openRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(true);
  }, []);
  const closeRegistrationWall = useCallback(() => {
    setRegistrationWallOpen(false);
  }, []);

  const toggleSave = useCallback(
    (id: string) => {
      if (!isAuthenticated) {
        openRegistrationWall();
        return;
      }
      const wasSaved = savedIds.includes(id);
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

  if (ignoredIds.includes(scholarship.id)) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-8 text-left text-slate-600 shadow-sm">
        <p className="text-sm font-medium text-zinc-800">
          This scholarship is hidden from your matches here (Not relevant).
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Restore it from the Ignored tab in the scholarship hub.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="relative z-0 w-full min-w-0">
        <ScholarshipCard
          scholarship={scholarship}
          isUnread={!viewedIds.includes(scholarship.id)}
          saved={savedIds.includes(scholarship.id)}
          onToggleSave={toggleSave}
          onHide={ignoreScholarship}
          showCardActions
          subscriptionLocked={false}
        />
      </div>
      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
      />
    </>
  );
}
