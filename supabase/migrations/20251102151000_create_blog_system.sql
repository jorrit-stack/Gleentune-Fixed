/*
  # Create Blog System

  1. New Tables
    - `blog_posts`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - URL-friendly identifier
      - `title` (text) - Blog post title
      - `excerpt` (text) - Short summary for listings
      - `content` (text) - Full markdown content
      - `featured_image` (text) - Main image URL
      - `featured_image_alt` (text) - Alt text for featured image
      - `featured_image_credit` (text) - Image credit/source
      - `meta_title` (text) - SEO title tag
      - `meta_description` (text) - SEO meta description
      - `keywords` (text[]) - SEO keywords
      - `author` (text) - Author name
      - `published_at` (timestamptz) - Publication date
      - `updated_at` (timestamptz) - Last update date
      - `is_published` (boolean) - Visibility flag
      - `view_count` (integer) - Number of views
      - `reading_time_minutes` (integer) - Estimated reading time
      - `category` (text) - Post category
      - `tags` (text[]) - Post tags
      - `created_at` (timestamptz)

    - `blog_images`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key)
      - `image_url` (text) - Image URL
      - `alt_text` (text) - Alt text for accessibility
      - `caption` (text) - Image caption
      - `credit` (text) - Image credit/source
      - `credit_url` (text) - Link to image source
      - `order` (integer) - Display order in post
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for published posts
    - No public write access (admin only via service role)

  3. Performance
    - Indexes on slug, published_at, category
    - Full-text search index on title and content
*/

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  featured_image text,
  featured_image_alt text,
  featured_image_credit text,
  featured_image_credit_url text,
  meta_title text NOT NULL,
  meta_description text NOT NULL,
  keywords text[] DEFAULT '{}',
  author text DEFAULT 'GleeTune Team',
  published_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  is_published boolean DEFAULT false,
  view_count integer DEFAULT 0,
  reading_time_minutes integer DEFAULT 5,
  category text DEFAULT 'General',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create blog_images table
CREATE TABLE IF NOT EXISTS blog_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text NOT NULL,
  caption text,
  credit text NOT NULL,
  credit_url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can read published blog posts"
  ON blog_posts FOR SELECT
  TO public
  USING (is_published = true);

CREATE POLICY "No public insert on blog posts"
  ON blog_posts FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "No public update on blog posts"
  ON blog_posts FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "No public delete on blog posts"
  ON blog_posts FOR DELETE
  TO public
  USING (false);

-- RLS Policies for blog_images
CREATE POLICY "Anyone can read blog images for published posts"
  ON blog_images FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_images.post_id
      AND blog_posts.is_published = true
    )
  );

CREATE POLICY "No public insert on blog images"
  ON blog_images FOR INSERT
  TO public
  WITH CHECK (false);

CREATE POLICY "No public update on blog images"
  ON blog_images FOR UPDATE
  TO public
  USING (false);

CREATE POLICY "No public delete on blog images"
  ON blog_images FOR DELETE
  TO public
  USING (false);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_blog_posts_keywords ON blog_posts USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_blog_posts_fulltext ON blog_posts USING gin(to_tsvector('english', title || ' ' || excerpt || ' ' || content));

CREATE INDEX IF NOT EXISTS idx_blog_images_post_id ON blog_images(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_images_order ON blog_images(post_id, display_order);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_blog_view_count(post_slug text)
RETURNS void AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE slug = post_slug AND is_published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION increment_blog_view_count TO anon, authenticated;

-- Add comments for documentation
COMMENT ON TABLE blog_posts IS 'Blog posts with full SEO metadata and content';
COMMENT ON TABLE blog_images IS 'Images associated with blog posts, including credits and alt text';
COMMENT ON FUNCTION increment_blog_view_count IS 'Increment view count for a blog post by slug';