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

  return (
    <section className="min-h-screen bg-zinc-50 px-3 py-6 text-zinc-900 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 sm:mb-10">
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
        <div className="flex justify-center">
          <EssayQuestionnaire initialChatIdFromQuery={initialChatIdFromQuery} />
        </div>
      </div>
    </section>
  );
}
