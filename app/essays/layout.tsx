import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { ESSAYS_PAGE_TITLE } from '@/lib/essays/essayHubSection';

const title = `${ESSAYS_PAGE_TITLE} — How to Write Winning Essays`;
const description =
  'Step-by-step scholarship essay guides: prompts, structure, and revision tips—without overlapping our scholarship listings.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description }
};

export default function EssaysLayout({ children }: PropsWithChildren) {
  return children;
}
