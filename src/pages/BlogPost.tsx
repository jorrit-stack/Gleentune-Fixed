import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogService } from '../services/blogService';
import { BlogPost as BlogPostType } from '../types/blog';
import { Calendar, Clock, Tag, ArrowLeft, ExternalLink, Share2, Facebook, Linkedin, Link as LinkIcon, Check, MessageCircle, Send } from 'lucide-react';
import SEO from '../components/SEO';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const loadPost = async (postSlug: string) => {
    setIsLoading(true);
    try {
      const postData = await blogService.getPostBySlug(postSlug);
      if (postData) {
        setPost(postData);
        await blogService.incrementViewCount(postSlug);

        const related = await blogService.getRelatedPosts(postSlug, postData.category, 3);
        setRelatedPosts(related);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shareUrl = `https://gleetune.com/blog/${slug}`;
  const shareTitle = post?.title || '';

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);

    const urls: Record<string, string> = {
      x: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-100 rounded-xl h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Post Not Found</h1>
          <p className="text-slate-600 mb-8">The blog post you're looking for doesn't exist.</p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const renderContent = (content: string) => {
    let cleanedContent = content;

    // Remove the first H1 title if it exists (since we render it separately from post.title)
    cleanedContent = cleanedContent.replace(/^#\s+.*?\n\n/, '');

    // Remove the first image if it matches the featured image (to avoid duplication)
    if (post.featured_image) {
      const firstImageRegex = /^!\[.*?\]\(.*?\)\n\*.*?\*\n\n/;
      cleanedContent = cleanedContent.replace(firstImageRegex, '');
    }

    const sections = cleanedContent.split(/(?=\n## )/);
    return sections.map((section, idx) => {
      const lines = section.split('\n');
      const elements = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) {
          i++;
          continue;
        }

        if (line.startsWith('# ')) {
          elements.push(<h1 key={`h1-${idx}-${i}`} className="text-4xl font-bold text-slate-900 mb-6 mt-8">{line.replace(/^# /, '')}</h1>);
        } else if (line.startsWith('## ')) {
          elements.push(<h2 key={`h2-${idx}-${i}`} className="text-3xl font-bold text-slate-900 mb-6 mt-12 pb-3 border-b-2 border-blue-200">{line.replace(/^## /, '')}</h2>);
        } else if (line.startsWith('### ')) {
          elements.push(<h3 key={`h3-${idx}-${i}`} className="text-2xl font-semibold text-blue-700 mb-4 mt-10">{line.replace(/^### /, '')}</h3>);
        } else if (line.match(/^!\[.*?\]\((.*?)\)$/)) {
          const match = line.match(/^!\[(.*?)\]\((.*?)\)$/);
          if (match) {
            const [, alt, src] = match;
            let credit = '';
            if (i + 1 < lines.length && lines[i + 1].startsWith('*') && lines[i + 1].endsWith('*')) {
              credit = lines[i + 1].replace(/^\*/, '').replace(/\*$/, '');
              i++;
            }
            elements.push(
              <figure key={`img-${idx}-${i}`} className="my-8 rounded-xl overflow-hidden bg-slate-50 shadow-lg border border-slate-200">
                <img src={src} alt={alt} className="w-full h-auto object-contain max-h-[400px] bg-slate-50" loading="lazy" />
                {credit && (
                  <figcaption className="px-4 py-3 text-xs text-slate-600 bg-slate-100 border-t border-slate-200">
                    {credit}
                  </figcaption>
                )}
              </figure>
            );
          }
        } else if (line.startsWith('**') && line.endsWith('**')) {
          elements.push(<p key={`bold-${idx}-${i}`} className="text-lg font-semibold text-blue-700 my-5 bg-blue-50 border-l-4 border-blue-500 pl-4 py-2">{line.replace(/^\*\*/, '').replace(/\*\*$/, '')}</p>);
        } else if (line.startsWith('*"') && line.endsWith('"*')) {
          elements.push(<blockquote key={`quote-${idx}-${i}`} className="italic text-xl text-slate-700 border-l-4 border-blue-500 pl-6 my-8 py-2 bg-slate-50">{line.replace(/^\*"/, '').replace(/"\*$/, '')}</blockquote>);
        } else if (line.startsWith('- ')) {
          const listItems = [];
          while (i < lines.length && lines[i].startsWith('- ')) {
            listItems.push(lines[i].replace(/^- /, ''));
            i++;
          }
          elements.push(
            <ul key={`list-${idx}-${i}`} className="space-y-3 my-6 bg-slate-50 rounded-lg p-6 border border-slate-200">
              {listItems.map((item, itemIdx) => (
                <li key={itemIdx} className="text-slate-700 leading-relaxed flex text-lg">
                  <span className="text-blue-600 mr-3 text-2xl leading-none">•</span>
                  <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>') }} />
                </li>
              ))}
            </ul>
          );
          continue;
        } else if (line.trim()) {
          elements.push(
            <p key={`p-${idx}-${i}`} className="text-lg text-slate-700 leading-relaxed my-2">
              {line.replace(/…/g, '… ')}
            </p>
          );
        }
        i++;
      }

      return <div key={`section-${idx}`}>{elements}</div>;
    });
  };

  return (
    <>
      <SEO
        title={post.meta_title}
        description={post.meta_description}
        keywords={post.keywords.join(', ')}
        canonicalUrl={`https://gleetune.com/blog/${post.slug}`}
        type="article"
        image={post.featured_image}
      />
      <div className="min-h-screen bg-white py-12 px-4">
        <article className="max-w-5xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          <header className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 flex-wrap mb-6 text-sm text-slate-600">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-full border border-blue-200">
                {post.category}
              </span>
              <span className="font-medium">By {post.author}</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {post.reading_time_minutes} min read
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(post.published_at)}
              </span>
              {post.view_count > 0 && (
                <span>{post.view_count.toLocaleString()} views</span>
              )}
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              {post.title}
            </h1>

            <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-8">
              {post.excerpt}
            </p>

            <div className="pt-6 border-t border-slate-200">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="text-slate-600 font-medium flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share:
                </span>
                <button
                  onClick={() => handleShare('x')}
                  className="p-2.5 bg-black hover:bg-gray-800 text-white rounded-lg transition-all hover:scale-110 shadow-md"
                  aria-label="Share on X (Twitter)"
                  title="Share on X"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-2.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg transition-all hover:scale-110 shadow-md"
                  aria-label="Share on Facebook"
                  title="Share on Facebook"
                >
                  <Facebook className="w-4 h-4" fill="currentColor" />
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="p-2.5 bg-[#0A66C2] hover:bg-[#094d92] text-white rounded-lg transition-all hover:scale-110 shadow-md"
                  aria-label="Share on LinkedIn"
                  title="Share on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" fill="currentColor" />
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="p-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg transition-all hover:scale-110 shadow-md"
                  aria-label="Share on WhatsApp"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" fill="currentColor" />
                </button>
                <button
                  onClick={() => handleShare('reddit')}
                  className="p-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white rounded-lg transition-all hover:scale-110 shadow-md"
                  aria-label="Share on Reddit"
                  title="Share on Reddit"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleShare('telegram')}
                  className="p-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg transition-all hover:scale-110 shadow-md"
                  aria-label="Share on Telegram"
                  title="Share on Telegram"
                >
                  <Send className="w-4 h-4" fill="currentColor" />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="p-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all hover:scale-110 shadow-md"
                  aria-label="Copy link"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </header>

          {post.featured_image && (
            <figure className="relative rounded-2xl overflow-hidden mb-12 shadow-2xl">
              <img
                src={post.featured_image}
                alt={post.featured_image_alt || post.title}
                className="w-full max-h-[450px] object-contain bg-slate-50"
              />
              {post.featured_image_credit && (
                <figcaption className="px-4 py-2 text-xs text-slate-600 bg-slate-100 border-t border-slate-200 text-center">
                  {post.featured_image_credit_url ? (
                    <a
                      href={post.featured_image_credit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      {post.featured_image_credit}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    post.featured_image_credit
                  )}
                </figcaption>
              )}
            </figure>
          )}

          <div className="max-w-4xl mx-auto">
            {renderContent(post.content)}
          </div>

          {post.images && post.images.length > 0 && (
            <div className="space-y-8 mb-12">
              {post.images
                .sort((a, b) => a.display_order - b.display_order)
                .map((image) => (
                  <figure key={image.id} className="rounded-xl overflow-hidden bg-slate-900">
                    <img
                      src={image.image_url}
                      alt={image.alt_text}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                    {(image.caption || image.credit) && (
                      <figcaption className="p-4 text-sm text-slate-400">
                        {image.caption && <p className="mb-2">{image.caption}</p>}
                        {image.credit && (
                          <p className="text-xs text-slate-500">
                            Image credit:{' '}
                            <a
                              href={image.credit_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                            >
                              {image.credit}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </p>
                        )}
                      </figcaption>
                    )}
                  </figure>
                ))}
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="max-w-4xl mx-auto mb-12 mt-16">
              <div className="border-t border-slate-200 pt-8">
                <h3 className="text-slate-700 text-sm font-semibold mb-4 uppercase tracking-wide">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <Link
                      key={index}
                      to={`/blog?tag=${encodeURIComponent(tag)}`}
                      className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg flex items-center gap-2 hover:bg-blue-100 hover:text-blue-700 transition-colors border border-slate-200 hover:border-blue-300"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {relatedPosts.length > 0 && (
            <div className="border-t border-slate-200 pt-12 mt-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    to={`/blog/${relatedPost.slug}`}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    {relatedPost.featured_image && (
                      <div className="relative h-48 overflow-hidden bg-slate-50">
                        <img
                          src={relatedPost.featured_image}
                          alt={relatedPost.featured_image_alt || relatedPost.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-slate-900 font-semibold mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors text-lg">
                        {relatedPost.title}
                      </h3>
                      <p className="text-slate-600 text-sm line-clamp-3">
                        {relatedPost.excerpt}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </>
  );
}
