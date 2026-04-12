import type { Database } from '@/types_db';

export type ContentPostRow = Database['public']['Tables']['content_posts']['Row'];

/** Serializable fields for article cards (list + scholarship detail cross-links). */
export type ContentPostListFields = Pick<
  ContentPostRow,
  'id' | 'title' | 'slug' | 'cover_image_url' | 'meta_description' | 'published_at'
>;
