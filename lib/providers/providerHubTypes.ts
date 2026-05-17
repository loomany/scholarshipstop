export type ProviderHubRow = {
  slug: string;
  display_name: string | null;
  scholarship_count: number;
  state: string | null;
  ai_description: string | null;
  official_url?: string | null;
  is_enriched?: boolean | null;
  updated_at?: string | null;
};
