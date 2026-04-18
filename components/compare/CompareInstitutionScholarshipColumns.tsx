'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
import ScholarshipCard from '@/components/scholarships/ScholarshipCard';
import ScholarshipRegistrationWallModal, {
  type ScholarshipRegistrationWallContentMode
} from '@/components/scholarships/ScholarshipRegistrationWallModal';
import { toast } from '@/components/ui/Toasts/use-toast';
import { createClient } from '@/utils/supabase/client';

type Column = {
  title: string;
  href?: string | null;
  scholarships: Scholarship[];
};

type CompareInstitutionScholarshipColumnsProps = {
  left: Column;
  right: Column;
};

export default function CompareInstitutionScholarshipColumns({
  left,
  right
}: CompareInstitutionScholarshipColumnsProps) {
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

  const visibleLeft = useMemo(
    () => left.scholarships.filter((s) => !ignoredIds.includes(s.id)),
    [left.scholarships, ignoredIds]
  );
  const visibleRight = useMemo(
    () => right.scholarships.filter((s) => !ignoredIds.includes(s.id)),
    [right.scholarships, ignoredIds]
  );
  const rowCount = Math.max(visibleLeft.length, visibleRight.length);

  const renderScholarshipCard = (
    scholarship: Scholarship,
    href?: string | null
  ) => (
    <div className="flex h-full min-w-0 flex-col">
      <div className="relative z-0 flex-1 w-full min-w-0 [&>[data-scholarship-card]]:h-full">
        <ScholarshipCard
          scholarship={scholarship}
          isUnread={!viewedIds.includes(scholarship.id)}
          saved={savedIds.includes(scholarship.id)}
          onToggleSave={toggleSave}
          onHide={ignoreScholarship}
          showCardActions
          stackedListing
          subscriptionLocked={false}
          onGuestDetailNavigate={
            !isAuthenticated ? () => openRegistrationWall('card-unlock') : undefined
          }
        />
      </div>
      {href ? (
        <p className="mt-3 text-sm font-medium text-orange-600">
          <Link
            href={href}
            className="underline decoration-orange-400/40 underline-offset-4 transition hover:text-orange-700 hover:decoration-orange-600"
          >
            View all scholarships from this university →
          </Link>
        </p>
      ) : null}
    </div>
  );

  const renderColumnHeader = (
    columnTitle: string,
    scholarships: Scholarship[],
    href?: string | null
  ) => (
    <div className="min-w-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {href ? (
            <h3 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
              <Link
                href={href}
                className="underline decoration-sky-500/35 underline-offset-4 transition hover:text-sky-800 hover:decoration-sky-700"
              >
                {columnTitle}
              </Link>
            </h3>
          ) : (
            <h3 className="text-base font-semibold tracking-tight text-gray-900 sm:text-lg">
              {columnTitle}
            </h3>
          )}
          {href ? (
            <p className="mt-1 text-sm font-medium text-orange-600">
              <Link
                href={href}
                className="underline decoration-orange-400/40 underline-offset-4 transition hover:text-orange-700 hover:decoration-orange-600"
              >
                See all university scholarships
              </Link>
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
          Top {Math.min(3, scholarships.length)}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <section
        className="mt-10 rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50/80 to-white p-6 shadow-sm sm:p-8"
        aria-labelledby="top-grants-heading"
      >
        <div className="max-w-3xl">
          <h2
            id="top-grants-heading"
            className="text-center text-xl font-bold tracking-tight text-gray-900"
          >
            Top grants by university
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-base">
            Largest active university-linked grants first. Each side shows the top
            three opportunities currently indexed for that school.
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {renderColumnHeader(left.title, visibleLeft, left.href)}
          {renderColumnHeader(right.title, visibleRight, right.href)}
        </div>

        {rowCount > 0 ? (
          <div className="space-y-3">
            {Array.from({ length: rowCount }, (_, index) => {
              const leftScholarship = visibleLeft[index] ?? null;
              const rightScholarship = visibleRight[index] ?? null;

              return (
                <div
                  key={`grant-row-${index}`}
                  className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8"
                >
                  <div className="min-w-0 h-full">
                    {leftScholarship
                      ? renderScholarshipCard(leftScholarship, left.href)
                      : null}
                  </div>
                  <div className="min-w-0 h-full">
                    {rightScholarship
                      ? renderScholarshipCard(rightScholarship, right.href)
                      : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-6 text-sm text-gray-600">
            No active grants available for these universities yet.
          </div>
        )}
      </section>

      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={closeRegistrationWall}
        contentMode={registrationWallContent}
      />
    </>
  );
}
