import type { Database } from '@/types_db';

export type ContentPostRow = Database['public']['Tables']['content_posts']['Row'];

/** Serializable fields for article cards (list + scholarship detail cross-links). */
export type ContentPostListFields = Pick<
  ContentPostRow,
  | 'id'
  | 'title'
  | 'slug'
  | 'cover_image_url'
  | 'cover_image_source_url'
  | 'cover_image_source_type'
  | 'meta_description'
  | 'published_at'
>;
