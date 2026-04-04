import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { RESOURCES_PAGE_TITLE } from '@/lib/content-hub/resourcesSection';

const title = `${RESOURCES_PAGE_TITLE} — Guides & Tips | ScholarshipTop`;
const description =
  'Guides and expert tips to help you find scholarships, write stronger applications, and stay organized.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description }
};

export default function ResourcesLayout({ children }: PropsWithChildren) {
  return children;
}
