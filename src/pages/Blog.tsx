import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { blogService } from '../services/blogService';
import { BlogPost } from '../types/blog';
import { Calendar, Clock, Tag, ChevronRight, ChevronLeft, X } from 'lucide-react';
import SEO from '../components/SEO';

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get('tag');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const postsPerPage = 12;

  useEffect(() => {
    loadPosts();
  }, [page, selectedTag]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * postsPerPage;
      const result = await blogService.getAllPosts(postsPerPage, offset);

      let filteredPosts = result.posts;
      let filteredTotal = result.total;

      if (selectedTag) {
        filteredPosts = result.posts.filter(post =>
          post.tags && post.tags.includes(selectedTag)
        );
        filteredTotal = filteredPosts.length;
      }

      setPosts(filteredPosts);
      setTotal(filteredTotal);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTagFilter = () => {
    setSearchParams({});
    setPage(1);
  };

  const totalPages = Math.ceil(total / postsPerPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <SEO
        title="Radio Blog - Learn About AM, FM & Shortwave Broadcasting | GleeTune"
        description="Explore in-depth articles about radio broadcasting, shortwave technology, AM/FM differences, radio history, and more. Expert insights and educational content from GleeTune."
        keywords="radio blog, radio broadcasting, shortwave radio, AM FM radio, radio technology, radio history"
        canonicalUrl="https://gleetune.com/blog"
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Radio Broadcasting Blog
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Discover the fascinating world of radio technology, history, and broadcasting from experts
            </p>
            {selectedTag && (
              <div className="mt-6 flex justify-center">
                <div className="inline-flex items-center gap-3 px-5 py-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 font-medium">
                    Filtering by: <span className="text-white">{selectedTag}</span>
                  </span>
                  <button
                    onClick={clearTagFilter}
                    className="p-1 hover:bg-blue-500/30 rounded transition-colors"
                    aria-label="Clear filter"
                  >
                    <X className="w-4 h-4 text-blue-400" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-800 rounded-xl h-96 animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-slate-400 py-20">
              <p className="text-xl">No blog posts available yet. Check back soon!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="group bg-slate-800/60 rounded-xl overflow-hidden hover:bg-slate-700/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border border-slate-700/50"
                  >
                    {post.featured_image && (
                      <div className="relative h-48 overflow-hidden bg-slate-900">
                        <img
                          src={post.featured_image}
                          alt={post.featured_image_alt || post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30">
                          {post.category}
                        </span>
                        <span className="text-slate-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.reading_time_minutes} min read
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-slate-400 text-sm mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(post.published_at)}
                        </span>
                        <span className="text-blue-400 group-hover:text-blue-300 flex items-center gap-1">
                          Read more
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                      {post.tags && post.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {post.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded flex items-center gap-1"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-slate-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
