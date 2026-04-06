'use client';

import { createContext, useContext } from 'react';

import type { Scholarship } from '@/app/scholarships/scholarshipsData';

const ScholarshipDetailInitialDataContext = createContext<Scholarship | null>(null);

export function ScholarshipDetailInitialDataProvider({
  children,
  value
}: {
  children: React.ReactNode;
  value: Scholarship | null;
}) {
  return (
    <ScholarshipDetailInitialDataContext.Provider value={value}>
      {children}
    </ScholarshipDetailInitialDataContext.Provider>
  );
}

export function useScholarshipDetailInitialData(): Scholarship | null {
  return useContext(ScholarshipDetailInitialDataContext);
}
