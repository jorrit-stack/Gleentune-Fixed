import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  canonicalUrl?: string;
  type?: 'website' | 'article';
}

export default function SEO({ title, description, keywords, image, canonicalUrl, type = 'website' }: SEOProps) {
  useEffect(() => {
    document.title = title;

    const updateOrCreate = (selector: string, attribute: string, value: string, isProperty = false) => {
      let element = document.querySelector(selector);
      if (element) {
        element.setAttribute(isProperty ? 'property' : attribute === 'content' ? 'content' : 'name', value);
      } else {
        const meta = document.createElement(selector.includes('[rel=') ? 'link' : 'meta');
        if (isProperty) {
          meta.setAttribute('property', selector.match(/\["(.+?)"\]/)?.[1] || '');
        } else if (selector.includes('[rel=')) {
          (meta as HTMLLinkElement).rel = selector.match(/\["(.+?)"\]/)?.[1] || '';
          (meta as HTMLLinkElement).href = value;
        } else {
          meta.setAttribute('name', selector.match(/\["(.+?)"\]/)?.[1] || '');
          meta.setAttribute('content', value);
        }
        document.head.appendChild(meta);
      }
    };

    updateOrCreate('meta[name="description"]', 'name', description);
    if (keywords) updateOrCreate('meta[name="keywords"]', 'name', keywords);

    updateOrCreate('meta[property="og:type"]', 'property', type, true);
    updateOrCreate('meta[property="og:title"]', 'property', title, true);
    updateOrCreate('meta[property="og:description"]', 'property', description, true);
    updateOrCreate('meta[property="og:site_name"]', 'property', 'GleeTune', true);

    if (image) {
      updateOrCreate('meta[property="og:image"]', 'property', image, true);
      updateOrCreate('meta[property="og:image:width"]', 'property', '1200', true);
      updateOrCreate('meta[property="og:image:height"]', 'property', '630', true);
      updateOrCreate('meta[name="twitter:image"]', 'name', image);
    }

    updateOrCreate('meta[name="twitter:card"]', 'name', 'summary_large_image');
    updateOrCreate('meta[name="twitter:title"]', 'name', title);
    updateOrCreate('meta[name="twitter:description"]', 'name', description);

    if (type === 'article') {
      updateOrCreate('meta[property="article:publisher"]', 'property', 'GleeTune', true);
    }

    if (canonicalUrl) {
      updateOrCreate('link[rel="canonical"]', 'rel', canonicalUrl);
      updateOrCreate('meta[property="og:url"]', 'property', canonicalUrl, true);
    }
  }, [title, description, keywords, image, canonicalUrl, type]);

  return null;
}
