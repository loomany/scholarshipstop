import type { ContentHubCategoryId } from '@/lib/content-hub/types';

export type ContentHubChip = {
  id: 'all' | ContentHubCategoryId;
  label: string;
};

export const CONTENT_HUB_CHIPS: ContentHubChip[] = [
  { id: 'all', label: 'All' },
  { id: 'guides', label: 'Guides' },
  { id: 'applying', label: 'Applying' },
  { id: 'scholarships', label: 'Scholarships' },
  { id: 'grants', label: 'Grants' },
  { id: 'finance', label: 'Finance' }
];

export const CONTENT_HUB_CATEGORY_LABEL: Record<ContentHubCategoryId, string> =
  {
    guides: 'Guide',
    applying: 'Applying',
    scholarships: 'Scholarships',
    grants: 'Grants',
    finance: 'Finance'
  };
