'use client';

import { useOptionalIqLocale } from '@/components/iq/IqLocaleProvider';

export default function IqLocaleShellNotice() {
  const iq = useOptionalIqLocale();
  if (!iq?.shell.localeShellNotice) return null;

  return (
    <p
      role="status"
      data-iq-locale-notice="true"
      className="border-b border-indigo-100 bg-indigo-50/90 px-4 py-2 text-center text-xs font-medium leading-5 text-indigo-900 sm:text-sm"
    >
      {iq.shell.localeShellNotice}
    </p>
  );
}
