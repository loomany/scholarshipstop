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
    <section className="min-h-screen bg-zinc-50 py-6 text-zinc-900 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
        <header className="mx-auto mb-0 max-w-3xl">
          <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200/90 bg-white px-5 py-6 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.12)] sm:px-6">
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
                Feel free to write in any language; the mentor will understand and reply in the same
                one.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto mt-10 flex max-w-3xl justify-center sm:mt-12">
          <EssayQuestionnaire
            initialChatIdFromQuery={initialChatIdFromQuery}
            initialScholarshipTitle={initialScholarshipTitle}
          />
        </div>
      </div>
    </section>
  );
}
