'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

import type { ProviderFaqItem } from '@/lib/providers/providerProfileTypes';

type Props = { items: ProviderFaqItem[] };

export function ProviderProfileFaqAccordion({ items }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold tracking-tight text-gray-900">
        Frequently asked questions
      </h2>
      <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={`${i}-${item.question.slice(0, 24)}`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50"
                aria-expanded={isOpen}
              >
                <span className="min-w-0 flex-1 pr-2">{item.question}</span>
                <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600">
                  <Plus
                    className={`absolute h-4 w-4 transition-transform duration-200 ${
                      isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                    }`}
                    aria-hidden
                  />
                  <Minus
                    className={`absolute h-4 w-4 transition-transform duration-200 ${
                      isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                    }`}
                    aria-hidden
                  />
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-gray-100 px-5 pb-4 pt-1 text-sm leading-relaxed text-gray-600">
                  {item.answer}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
