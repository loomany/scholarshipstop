'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { IqLocale } from '@/lib/iq/i18n/iqLocales';
import { getIqShellCopy, type IqShellCopy } from '@/lib/iq/i18n/iqShellCopy';

type IqLocaleContextValue = {
  locale: IqLocale;
  shell: IqShellCopy;
};

const IqLocaleContext = createContext<IqLocaleContextValue | null>(null);

export function IqLocaleProvider({
  locale,
  children
}: {
  locale: IqLocale;
  children: ReactNode;
}) {
  return (
    <IqLocaleContext.Provider
      value={{ locale, shell: getIqShellCopy(locale) }}
    >
      {children}
    </IqLocaleContext.Provider>
  );
}

export function useIqLocale(): IqLocaleContextValue {
  const value = useContext(IqLocaleContext);
  if (!value) {
    throw new Error('useIqLocale must be used within IqLocaleProvider');
  }
  return value;
}

export function useOptionalIqLocale(): IqLocaleContextValue | null {
  return useContext(IqLocaleContext);
}
