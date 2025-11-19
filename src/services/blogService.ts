import { supabase } from '../lib/supabase';
import { BlogPost, BlogImage } from '../types/blog';

export const blogService = {
  async getAllPosts(limit = 12, offset = 0): Promise<{ posts: BlogPost[]; total: number }> {
    const [postsResult, countResult] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
    ]);

    if (postsResult.error) throw postsResult.error;

    return {
      posts: postsResult.data || [],
      total: countResult.count || 0
    };
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        images:blog_images(*)
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error) {
      console.error('Error fetching blog post:', error);
      return null;
    }

    return data;
  },

  async getPostsByCategory(category: string, limit = 12): Promise<BlogPost[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('category', category)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching posts by category:', error);
      return [];
    }

    return data || [];
  },

  async getPostsByTag(tag: string, limit = 12): Promise<BlogPost[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .contains('tags', [tag])
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching posts by tag:', error);
      return [];
    }

    return data || [];
  },

  async getRelatedPosts(currentSlug: string, category: string, limit = 3): Promise<BlogPost[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('category', category)
      .eq('is_published', true)
      .neq('slug', currentSlug)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching related posts:', error);
      return [];
    }

    return data || [];
  },

  async incrementViewCount(slug: string): Promise<void> {
    try {
      await supabase.rpc('increment_blog_view_count', { post_slug: slug });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  },

  async searchPosts(query: string, limit = 12): Promise<BlogPost[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching posts:', error);
      return [];
    }

    return data || [];
  }
};
