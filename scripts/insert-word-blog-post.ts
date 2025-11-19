import { supabase } from './lib/supabase-node.js';

async function insertBlogPost() {
  const storageUrl = (process.env.VITE_SUPABASE_URL || 'https://lokoaovrcslqlazxedhx.supabase.co').replace(/\/$/, '');

  const blogPost = {
    title: "The Magic of Shortwave Radio: Connecting Cultures Across Continents",
    slug: "magic-of-shortwave-radio-connecting-cultures",
    excerpt: "Discover how shortwave radio continues to bridge vast distances, bringing voices from remote corners of the world directly into our homes, fostering cultural exchange and understanding in our digital age.",
    author: "Radio Wave Editorial Team",
    published_at: new Date().toISOString(),
    is_published: true,
    category: "Technology & Culture",
    tags: ["shortwave", "international-radio", "culture", "technology", "how-to"],
    featured_image: `${storageUrl}/storage/v1/object/public/blog-images/shortwave-hero.jpg`,
    featured_image_alt: "Vintage shortwave radio with global map background",
    featured_image_credit: "Unsplash",
    featured_image_credit_url: "https://unsplash.com",
    meta_title: "The Magic of Shortwave Radio: How It Connects Cultures Worldwide",
    meta_description: "Explore the fascinating world of shortwave radio and discover how this timeless technology continues to connect people across continents, sharing news, music, and culture from around the globe.",
    keywords: ["shortwave radio", "international broadcasting", "radio waves", "global communication", "cultural exchange", "BBC World Service", "radio listening", "ionosphere propagation"],
    reading_time_minutes: 8,
    content: `
<div class="blog-post-content">
  <img src="${storageUrl}/storage/v1/object/public/blog-images/shortwave-hero.jpg" alt="Vintage shortwave radio with global map" class="hero-image" />

  <p class="lead">In an era dominated by instant messaging and social media, there exists a timeless technology that continues to captivate enthusiasts and bridge continents: shortwave radio. This remarkable medium transcends borders, cultures, and languages, bringing distant voices directly into our homes with a clarity that defies the thousands of miles traveled.</p>

  <h2>A Window to the World</h2>

  <p>Shortwave radio operates on frequencies between 1.6 and 30 MHz, allowing radio waves to bounce off the ionosphere and travel incredible distances. Unlike local FM or AM stations, shortwave broadcasts can reach across oceans and continents, making it possible to listen to a station broadcasting from Beijing while sitting in your living room in Buenos Aires.</p>

  <img src="${storageUrl}/storage/v1/object/public/blog-images/radio-waves-ionosphere.jpg" alt="Radio waves bouncing off the ionosphere" class="content-image" />
  <p class="image-caption">Radio waves reflect off the ionosphere, enabling global communication</p>

  <h2>The Cultural Connection</h2>

  <p>What makes shortwave radio truly special is its role as a cultural ambassador. International broadcasters like BBC World Service, Deutsche Welle, Radio France Internationale, and Voice of America have been sharing news, music, and cultural programs for decades. These services offer perspectives often unavailable through local media, providing listeners with a more nuanced understanding of global events.</p>

  <blockquote>
    <p>"Shortwave radio is more than just technology; it's a bridge between cultures, a teacher of languages, and a window into the lives of people thousands of miles away."</p>
    <cite>— Dr. Adrian Peterson, Radio Historian</cite>
  </blockquote>

  <h2>The Technical Marvel</h2>

  <p>The science behind shortwave propagation is fascinating. During the day, higher frequencies (above 15 MHz) work best as the ionosphere is more ionized by solar radiation. At night, lower frequencies (below 10 MHz) become more reliable as the ionosphere's characteristics change. This dynamic nature means that shortwave listening is never boring—conditions change hour by hour, season by season.</p>

  <div class="info-box">
    <h3>Best Times to Listen</h3>
    <ul>
      <li><strong>Morning (6-9 AM):</strong> Catch breakfast shows from Europe and Africa</li>
      <li><strong>Evening (7-10 PM):</strong> Prime time for Asian and Australian broadcasts</li>
      <li><strong>Late Night (11 PM-2 AM):</strong> Perfect for distant South American stations</li>
    </ul>
  </div>

  <h2>Getting Started with Shortwave</h2>

  <img src="${storageUrl}/storage/v1/object/public/blog-images/modern-shortwave-receiver.jpg" alt="Modern shortwave receiver with digital display" class="content-image" />
  <p class="image-caption">Modern shortwave receivers combine vintage appeal with digital precision</p>

  <p>Starting your shortwave journey doesn't require a massive investment. Quality portable receivers are available for under $100, and many offer features like:</p>

  <ul>
    <li>Digital frequency display for precise tuning</li>
    <li>Memory presets to save your favorite stations</li>
    <li>SSB (Single Side Band) capability for amateur radio</li>
    <li>External antenna connections for improved reception</li>
  </ul>

  <h2>The Community Spirit</h2>

  <p>One of the most rewarding aspects of shortwave listening is the global community. Listeners exchange reception reports, share tips about propagation conditions, and participate in contests to see who can log the most distant stations. Many broadcasters still send QSL cards—colorful postcards confirming reception—to listeners who send in detailed reports.</p>

  <h2>More Than Nostalgia</h2>

  <p>While some might view shortwave radio as a relic of the past, it remains vitally relevant. In regions where internet access is limited or censored, shortwave provides uncensored access to information. During natural disasters when local infrastructure fails, shortwave continues to function, providing crucial emergency communications.</p>

  <img src="${storageUrl}/storage/v1/object/public/blog-images/shortwave-emergency.jpg" alt="Emergency shortwave communication during disaster" class="content-image" />
  <p class="image-caption">Shortwave radio serves as a lifeline during emergencies</p>

  <h2>The Digital Revolution Meets Radio Waves</h2>

  <p>Today's shortwave experience has been enhanced by digital technology. Software-defined radios (SDRs) allow enthusiasts to tune into shortwave frequencies using their computers, and many stations now simulcast their shortwave broadcasts online. Websites and apps provide real-time information about which stations are broadcasting and on what frequencies.</p>

  <div class="pro-tip">
    <h3>Pro Tip</h3>
    <p>Use online tools like <a href="http://www.short-wave.info/" target="_blank" rel="noopener">short-wave.info</a> to find out what's currently broadcasting in your area. Combine this with traditional radio hunting for the best experience!</p>
  </div>

  <h2>Join the Global Conversation</h2>

  <p>Whether you're interested in international news, learning new languages, discovering music from different cultures, or simply experiencing the thrill of pulling distant signals from the airwaves, shortwave radio offers something unique. It's a hobby that combines technology, geography, culture, and a touch of magic.</p>

  <p>In our hyper-connected yet often isolated digital world, there's something profoundly human about tuning a dial and hearing a voice from halfway around the planet. Shortwave radio reminds us that despite our differences, we all share the same airwaves—and that connection is more powerful than any border or ocean.</p>

  <img src="${storageUrl}/storage/v1/object/public/blog-images/listener-at-night.jpg" alt="Person listening to shortwave radio at night" class="content-image" />
  <p class="image-caption">The magic of shortwave: connecting with the world, one frequency at a time</p>

  <hr />

  <p class="final-note"><em>Have you tried shortwave listening? What was your most memorable catch? Share your experiences in the comments below, and let's celebrate this wonderful medium together!</em></p>
</div>
    `.trim()
  };

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(blogPost)
    .select()
    .single();

  if (error) {
    console.error('Error inserting blog post:', error);
    return;
  }

  console.log('✅ Blog post inserted successfully!');
  console.log('📝 Title:', data.title);
  console.log('🔗 Slug:', data.slug);
  console.log('📅 Published:', new Date(data.published_date).toLocaleDateString());
  console.log('\n📸 Image paths to upload to Supabase Storage:');
  console.log('   - shortwave-hero.jpg (hero image, 1200x600px recommended)');
  console.log('   - radio-waves-ionosphere.jpg (diagram/illustration)');
  console.log('   - modern-shortwave-receiver.jpg (product photo)');
  console.log('   - shortwave-emergency.jpg (emergency communication)');
  console.log('   - listener-at-night.jpg (atmospheric photo)');
  console.log('\n💡 Upload these images to: Supabase Dashboard > Storage > blog-images');
  console.log(`📍 Access at: ${storageUrl}/storage/v1/object/public/blog-images/[filename]`);
}

insertBlogPost();
