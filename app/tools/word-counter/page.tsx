import type { Metadata } from 'next';

import WordCounterClient from './WordCounterClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function WordCounterPage() {
  return <WordCounterClient />;
}
