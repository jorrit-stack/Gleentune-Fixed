export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featured_image?: string;
  featured_image_alt?: string;
  featured_image_credit?: string;
  featured_image_credit_url?: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  author: string;
  published_at: string;
  updated_at: string;
  is_published: boolean;
  view_count: number;
  reading_time_minutes: number;
  category: string;
  tags: string[];
  created_at: string;
  images?: BlogImage[];
}

export interface BlogImage {
  id: string;
  post_id: string;
  image_url: string;
  alt_text: string;
  caption?: string;
  credit: string;
  credit_url: string;
  display_order: number;
  created_at: string;
}
