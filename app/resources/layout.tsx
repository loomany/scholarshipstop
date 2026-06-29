import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { RESOURCES_PAGE_TITLE } from '@/lib/content-hub/resourcesSection';
import { DEFAULT_OPEN_GRAPH_IMAGES } from '@/lib/seo/socialImage';

const title = `${RESOURCES_PAGE_TITLE} — Guides & Tips`;
const description =
  'Guides and expert tips to help you find scholarships, write stronger applications, and stay organized.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, images: DEFAULT_OPEN_GRAPH_IMAGES }
};

export default function ResourcesLayout({ children }: PropsWithChildren) {
  return children;
}
