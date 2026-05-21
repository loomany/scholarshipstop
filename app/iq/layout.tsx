import type { ReactNode } from 'react';

import IqLocaleShellNotice from '@/components/iq/IqLocaleShellNotice';
import { IqLocaleProvider } from '@/components/iq/IqLocaleProvider';
import { getIqLocaleFromRequest } from '@/lib/iq/i18n/getIqLocaleFromRequest';

export default function IqLayout({ children }: { children: ReactNode }) {
  const locale = getIqLocaleFromRequest();

  return (
    <IqLocaleProvider locale={locale}>
      <div
        data-iq-product-shell-locale={locale}
        data-iq-product-shell="true"
        hidden
      />
      <IqLocaleShellNotice />
      {children}
    </IqLocaleProvider>
  );
}
