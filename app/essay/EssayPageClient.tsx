'use client';

import { useSearchParams } from 'next/navigation';

import {
  EssayQuestionnaire,
  parseEssayChatQueryParam
} from '@/components/essay/EssayQuestionnaire';

export default function EssayPageClient() {
  const searchParams = useSearchParams();
  const initialChatIdFromQuery = parseEssayChatQueryParam(
    searchParams.get('chat')
  );
  const initialScholarshipTitle =
    searchParams.get('scholarship')?.trim() || null;

  return (
    <section className="bg-zinc-50 py-6 text-zinc-900 sm:min-h-[100dvh] sm:py-10 max-sm:flex max-sm:min-h-[calc(100dvh-4rem)] max-sm:flex-col max-sm:pb-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-3 sm:px-6 max-sm:min-h-0 max-sm:flex-1">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 max-sm:min-h-0 max-sm:flex-1 sm:gap-12">
          <header className="w-full shrink-0">
            <div className="w-full rounded-2xl border border-zinc-200/90 bg-white px-5 py-6 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.12)] sm:px-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                  Write your essay with an AI Mentor
                </h1>
              </div>
              <div className="mt-3 text-left sm:mt-4">
                <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
                  Skip the blank page anxiety — just have a conversation. The mentor asks guiding
                  questions, and you answer in your own words. Progress saves automatically. Once
                  you&apos;ve shared enough details, click &quot;Generate Draft&quot; to get your essay.
                  Feel free to write in any language; the mentor will understand and reply in the
                  same one.
                </p>
              </div>
            </div>
          </header>

          <div className="flex min-h-0 w-full flex-1 flex-col">
            <EssayQuestionnaire
              initialChatIdFromQuery={initialChatIdFromQuery}
              initialScholarshipTitle={initialScholarshipTitle}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
