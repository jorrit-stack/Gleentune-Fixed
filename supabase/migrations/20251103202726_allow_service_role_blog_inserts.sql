/*
  # Allow Service Role to Insert Blog Posts

  1. Changes
    - Add policy to allow service_role to insert blog posts
    - Service role bypasses RLS by default, but we make it explicit
    
  2. Security
    - Only affects backend scripts using service_role key
    - Public access remains read-only for published posts
*/

-- Add policy to allow service role full access (for admin scripts)
CREATE POLICY "Service role has full access to blog posts"
  ON blog_posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
