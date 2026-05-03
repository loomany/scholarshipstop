'use client';

import * as Popover from '@radix-ui/react-popover';
import Link from 'next/link';
import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

import { buildScholarshipTagHubHref } from '@/app/scholarships/scholarshipTagHubLinks';
import { scholarshipHostCountrySeoHref } from '@/app/scholarships/scholarshipCountrySeo';
import {
  countryLabelFromCode,
  dedupeHostCountryCodesForDisplay
} from '@/lib/scholarships/countryEligibility/countries';
import { cn } from '@/utils/cn';

type StudyInHostCountriesPopoverProps = {
  hostCodes: string[];
  triggerText: string;
  title: string;
  /** Full class list for the trigger (badge look + width + interaction). */
  className: string;
};

export function StudyInHostCountriesPopover({
  hostCodes,
  triggerText,
  title,
  className
}: StudyInHostCountriesPopoverProps) {
  const items = useMemo(() => {
    const unique = dedupeHostCountryCodesForDisplay(hostCodes);
    return unique.map((code) => ({
      code,
      label: countryLabelFromCode(code),
      href:
        scholarshipHostCountrySeoHref(code) ??
        buildScholarshipTagHubHref({ hostCountryCode: code })
    }));
  }, [hostCodes]);

  return (
    <Popover.Root modal={false}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(className)}
          title={title}
          aria-label={`${title}. Open menu to pick a location.`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="truncate">{triggerText}</span>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-60" strokeWidth={2.5} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-[220] min-w-[12.5rem] max-w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-gray-200 bg-white p-1.5 text-sm shadow-md outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
          onPointerDownOutside={(e) => e.stopPropagation()}
        >
          <nav aria-label="Program location pages">
            <p className="border-b border-gray-100 px-2 pb-1.5 text-[10px] font-semibold tracking-wide text-gray-500">
              Location:
            </p>
            <ul className="mt-1 max-h-[min(16rem,50vh)] overflow-y-auto py-0.5">
              {items.map(({ code, label, href }) => (
                <li key={code}>
                  <Link
                    href={href}
                    className="block rounded-md px-2 py-1.5 text-xs font-semibold text-gray-800 no-underline outline-none transition hover:bg-orange-50 hover:text-orange-900 focus-visible:bg-orange-50 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
