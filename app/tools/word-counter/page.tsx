'use client';

import { useMemo, useState } from 'react';

export default function WordCounterPage() {
  const [text, setText] = useState('');

  const { wordCount, charCount } = useMemo(() => {
    const charCountValue = text.length;

    const trimmed = text.trim();
    const wordCountValue =
      trimmed.length === 0 ? 0 : trimmed.split(/[\\s]+/).length;

    return { wordCount: wordCountValue, charCount: charCountValue };
  }, [text]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900">
      <div className="w-full max-w-3xl">
        <h1 className="mb-2 text-4xl font-bold text-zinc-900">Word Counter</h1>
        <p className="mb-8 text-zinc-600">
          Count words and characters instantly
        </p>

        <div className="flex flex-col items-center">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your text here..."
            className="w-full min-h-[220px] resize-y rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
          />

          <div className="mt-6 w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-sm text-zinc-500">Words</div>
                <div className="text-2xl font-semibold text-zinc-900">{wordCount}</div>
              </div>
              <div className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-sm text-zinc-500">Characters</div>
                <div className="text-2xl font-semibold text-zinc-900">{charCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
