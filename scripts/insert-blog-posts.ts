import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Use service role key for admin operations (bypasses RLS)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!serviceRoleKey || serviceRoleKey === 'your-service-role-key-here') {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not configured in .env file');
  console.error('\nTo insert blog posts, you need the service role key:');
  console.error('1. Go to your Supabase project dashboard');
  console.error('2. Go to Settings > API');
  console.error('3. Copy the "service_role" key (NOT the anon key)');
  console.error('4. Add it to .env file as: SUPABASE_SERVICE_ROLE_KEY=your-actual-key');
  console.error('\nWARNING: Never expose service role key in frontend code!');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  serviceRoleKey!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface BlogPostData {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featured_image: string;
  featured_image_alt: string;
  featured_image_credit: string;
  featured_image_credit_url: string;
  meta_title: string;
  meta_description: string;
  keywords: string[];
  category: string;
  tags: string[];
  reading_time_minutes: number;
  is_published: boolean;
  published_at: string;
  images: Array<{
    image_url: string;
    alt_text: string;
    credit: string;
    credit_url: string;
    display_order: number;
    caption?: string;
  }>;
}

const blogPosts: BlogPostData[] = [
  {
    slug: 'history-of-radio-broadcasting',
    title: 'The Fascinating History of Radio Broadcasting: From Spark to Stream',
    excerpt: 'Radio broadcasting revolutionized human communication, entertainment, and information sharing. From the first wireless signals in 1895 to today\'s digital streams, discover how radio shaped our world and continues to evolve in the modern age.',
    meta_title: 'History of Radio Broadcasting: Complete Timeline from 1895 to Today | GleeTune',
    meta_description: 'Discover the complete history of radio broadcasting from Marconi\'s first wireless transmission to modern digital radio. Learn about key inventors, milestones, and how radio changed the world.',
    keywords: ['history of radio broadcasting', 'radio invention timeline', 'first radio broadcast', 'golden age of radio', 'AM FM radio history', 'shortwave radio history', 'Marconi wireless telegraph', 'Guglielmo Marconi', 'radio pioneers'],
    category: 'Radio History',
    tags: ['radio history', 'broadcasting', 'AM radio', 'FM radio', 'shortwave', 'radio pioneers', 'Marconi', 'golden age of radio'],
    reading_time_minutes: 12,
    is_published: true,
    published_at: new Date().toISOString(),
    featured_image: 'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg',
    featured_image_alt: 'Vintage antique radio receiver from the 1930s golden age of radio broadcasting',
    featured_image_credit: 'Pixabay',
    featured_image_credit_url: 'https://www.pexels.com/photo/1591447/',
    content: `Radio broadcasting revolutionized human communication, entertainment, and information sharing. This is the complete story of how radio shaped our world.

## Introduction: The Voice That Changed the World

Imagine a world where news traveled only as fast as a horse could ride, where entertainment meant gathering around a piano, and where distant loved ones could only reach you through handwritten letters. Then came radio—an invisible technology that would shrink the planet, bring the world into our living rooms, and forever change human communication.

The history of radio broadcasting is a story of brilliant inventors, bold experimenters, fierce competition, and remarkable perseverance. It's a tale that spans more than a century, touching every aspect of modern life from emergency services to space exploration, from music to journalism, from advertising to democracy itself.

In this comprehensive guide, we'll explore the complete history of radio broadcasting—from the earliest experiments with electromagnetic waves to the digital revolution reshaping radio today.

## The Dawn of Wireless: Early Experiments (1860s-1890s)

### James Clerk Maxwell's Theoretical Foundation

The story of radio begins not with wires and circuits, but with mathematical equations. In 1864, Scottish physicist James Clerk Maxwell proposed a revolutionary theory: electromagnetic waves should exist and travel at the speed of light. His equations predicted that electrical energy could propagate through space without wires—a concept that seemed almost magical at the time.

Maxwell's work was purely theoretical, based on mathematical elegance rather than experimental evidence. Tragically, he died in 1879 without seeing his theories proven. But his equations laid the foundation for everything that would follow.

### Heinrich Hertz Proves Maxwell Right

In 1887, German physicist Heinrich Hertz conducted experiments that would validate Maxwell's theories and earn his name immortalized in the unit of frequency (hertz). Hertz built a spark gap transmitter that generated electromagnetic waves and detected them across his laboratory using a simple wire loop with a gap—the first radio receiver.

When sparks jumped across the transmitter gap, smaller sparks appeared in the receiver gap across the room. Hertz had proven that electromagnetic waves existed and could travel through space.

## Marconi and the Birth of Radio (1895-1901)

### Guglielmo Marconi: The Father of Radio

In 1895, a young Italian inventor named Guglielmo Marconi succeeded in sending wireless signals over a distance of about 1.5 kilometers on his family's estate in Bologna. Unlike pure scientists, Marconi understood the commercial potential of wireless communication and devoted himself to improving the practical range and reliability of the technology.

When the Italian government showed little interest in his invention, Marconi moved to England in 1896. There, he filed the world's first patent for a wireless telegraphy system and founded the Wireless Telegraph and Signal Company.

### The Transatlantic Triumph

On December 12, 1901, Marconi achieved what many experts said was impossible. From a station in Poldhu, Cornwall, England, his team transmitted the Morse code letter "S" across the Atlantic Ocean. Marconi, stationed in St. John's, Newfoundland, heard the faint signal through his earphones—2,200 miles away.

This historic transmission proved that radio waves could follow the Earth's curve and opened the door to worldwide wireless communication.

## The Golden Age of Radio (1920s-1940s)

### The First Broadcasting Stations

Commercial radio broadcasting began in earnest in the 1920s. The first licensed commercial radio station, KDKA in Pittsburgh, Pennsylvania, made its debut on November 2, 1920, broadcasting the results of the Harding-Cox presidential election.

Within three years, over 600 radio stations were operating in the United States alone. Radio fever swept the nation. Families purchased radio receivers and gathered around them for entertainment, news, and music.

### Radio Networks Transform Entertainment

The formation of radio networks created the first mass media. NBC launched in 1926, CBS in 1927. These networks produced original programming—drama series, comedy shows, variety programs, and music broadcasts.

### Radio in World War II

During World War II, radio became an essential tool for propaganda, news, military communication, and resistance movements. Winston Churchill's speeches, Franklin D. Roosevelt's "Fireside Chats," showed radio's power to inspire and influence millions simultaneously.

## FM Radio and Technical Revolution (1930s-1950s)

### Edwin Armstrong's FM Invention

In 1933, American engineer Edwin Armstrong invented frequency modulation (FM), which offered superior sound quality, resistance to static, and stereo capability. Despite FM's technical superiority, its adoption faced fierce resistance from AM broadcasters.

## Television's Challenge and Radio's Adaptation (1950s-1970s)

The 1950s brought radio's greatest challenge: television. But radio adapted brilliantly through portable transistor radios, format specialization, personality-driven programming, and local focus.

## Digital Revolution and Modern Radio (1990s-Present)

### Satellite Radio and Internet Streaming

The 1990s and 2000s brought satellite radio services and internet radio. Podcasting emerged, allowing anyone to become a broadcaster. Modern radios integrate traditional broadcasting with streaming services.

### The Smart Speaker Era

Smart speakers integrated radio into home ecosystems, making radio consumption effortless through voice commands.

## Conclusion: Radio's Timeless Appeal

From Marconi's first wireless signals to modern podcast streaming, radio has continually reinvented itself. Both AM and FM continue evolving, working alongside internet streaming and satellite radio in an increasingly diverse audio landscape.

Radio's history teaches us that great technologies don't die—they evolve. And sometimes, the oldest technologies, refined and reimagined, remain the most essential.`,
    images: [
      {
        image_url: 'https://images.pexels.com/photos/256219/pexels-photo-256219.jpeg',
        alt_text: 'Vintage scientific equipment and electromagnetic wave experiments from early radio research',
        credit: 'Pixabay',
        credit_url: 'https://www.pexels.com/photo/256219/',
        display_order: 1
      },
      {
        image_url: 'https://images.pexels.com/photos/4320457/pexels-photo-4320457.jpeg',
        alt_text: 'Historic telegraph and early wireless communication equipment',
        credit: 'cottonbro studio',
        credit_url: 'https://www.pexels.com/photo/4320457/',
        display_order: 2
      },
      {
        image_url: 'https://images.pexels.com/photos/163008/pexels-photo-163008.jpeg',
        alt_text: 'Ocean waves representing Marconi\'s transatlantic radio transmission',
        credit: 'Pixabay',
        credit_url: 'https://www.pexels.com/photo/163008/',
        display_order: 3
      },
      {
        image_url: 'https://images.pexels.com/photos/164693/pexels-photo-164693.jpeg',
        alt_text: 'Passenger ship representing maritime radio communication era',
        credit: 'Matthew Barra',
        credit_url: 'https://www.pexels.com/photo/164693/',
        display_order: 4
      },
      {
        image_url: 'https://images.pexels.com/photos/221047/pexels-photo-221047.jpeg',
        alt_text: 'Family living room from golden age of radio',
        credit: 'Pixabay',
        credit_url: 'https://www.pexels.com/photo/221047/',
        display_order: 5
      },
      {
        image_url: 'https://images.pexels.com/photos/4200745/pexels-photo-4200745.jpeg',
        alt_text: 'Vintage microphone from broadcasting golden age',
        credit: 'Sound On',
        credit_url: 'https://www.pexels.com/photo/4200745/',
        display_order: 6
      },
      {
        image_url: 'https://images.pexels.com/photos/159376/turntable-top-music-audio-159376.jpeg',
        alt_text: 'Vintage turntable representing FM radio\'s audio quality',
        credit: 'Skitterphoto',
        credit_url: 'https://www.pexels.com/photo/159376/',
        display_order: 7
      },
      {
        image_url: 'https://images.pexels.com/photos/1204649/pexels-photo-1204649.jpeg',
        alt_text: 'Car radio showing mobile listening revolution',
        credit: 'Mike B',
        credit_url: 'https://www.pexels.com/photo/1204649/',
        display_order: 8
      }
    ]
  },
  {
    slug: 'how-shortwave-radio-works',
    title: 'How Shortwave Radio Works: Complete Guide to Long-Distance Broadcasting',
    excerpt: 'Shortwave radio can travel halfway around the world, bouncing off atmospheric layers to reach listeners thousands of miles away. Discover the fascinating science behind this remarkable technology that continues connecting the globe.',
    meta_title: 'How Shortwave Radio Works: Science, Technology & Propagation Explained | GleeTune',
    meta_description: 'Discover how shortwave radio travels thousands of miles bouncing off the ionosphere. Learn about frequencies, propagation, equipment, and why shortwave remains vital for international broadcasting.',
    keywords: ['how shortwave radio works', 'shortwave radio propagation', 'ionosphere radio waves', 'HF radio frequencies', 'international broadcasting', 'shortwave listening'],
    category: 'Technical Education',
    tags: ['shortwave radio', 'radio technology', 'ionosphere', 'radio propagation', 'HF radio', 'international broadcasting'],
    reading_time_minutes: 14,
    is_published: true,
    published_at: new Date().toISOString(),
    featured_image: 'https://images.pexels.com/photos/5052875/pexels-photo-5052875.jpeg',
    featured_image_alt: 'Earth from space showing global radio signal propagation',
    featured_image_credit: 'SpaceX',
    featured_image_credit_url: 'https://www.pexels.com/photo/5052875/',
    content: `Shortwave radio can travel thousands of miles by bouncing off the ionosphere. Learn the complete science behind this remarkable technology.

## Introduction: Radio Waves That Travel the World

Imagine turning a dial on your radio in New York and suddenly hearing a live broadcast from Tokyo, Moscow, or Johannesburg. This is the magic of shortwave radio, operating on principles of physics that enable global communication.

While your local FM station might reach 40-60 miles, shortwave radio regularly travels thousands of miles, sometimes circling the entire globe.

## Understanding the Electromagnetic Spectrum

Radio waves are electromagnetic radiation occupying the low-frequency end of the spectrum. The shortwave bands span 3-30 MHz, known as HF (High Frequency).

## The Ionosphere: Nature's Radio Mirror

The ionosphere is Earth's upper atmosphere layer, 50-600 kilometers above the surface, where solar radiation creates charged particles that reflect radio frequencies back to Earth.

### Ionospheric Layers

**D Layer:** Forms during daytime, absorbs lower frequencies
**E Layer:** Stronger during day, reflects medium and lower shortwave
**F Layer:** Primary reflecting layer for long-distance communication

## Shortwave Propagation

Sky wave propagation enables signals to bounce multiple times between ionosphere and Earth, covering thousands of miles per hop.

## Shortwave Frequency Bands

International broadcasters use specific bands from 2.3 MHz (120-meter band) to 26.1 MHz (11-meter band), with different characteristics for day and night.

## Equipment and Technology

Modern shortwave requires sophisticated transmitters (100-500 kW), directional antennas, and quality receivers with good selectivity and sensitivity.

## Practical Applications

Shortwave remains essential for international broadcasting, maritime communication, aviation, amateur radio, and emergency services worldwide.

## Conclusion

Despite modern alternatives, shortwave radio's unique ability to provide long-distance communication without infrastructure ensures its continued relevance in our connected world.`,
    images: [
      {
        image_url: 'https://images.pexels.com/photos/256426/pexels-photo-256426.jpeg',
        alt_text: 'Electromagnetic spectrum visualization',
        credit: 'Pixabay',
        credit_url: 'https://www.pexels.com/photo/256426/',
        display_order: 1
      },
      {
        image_url: 'https://images.pexels.com/photos/87651/earth-blue-planet-globe-planet-87651.jpeg',
        alt_text: 'Earth atmosphere with ionosphere layers',
        credit: 'Pixabay',
        credit_url: 'https://www.pexels.com/photo/87651/',
        display_order: 2
      },
      {
        image_url: 'https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg',
        alt_text: 'Radio antenna tower transmitting signals',
        credit: 'Kelly L',
        credit_url: 'https://www.pexels.com/photo/2387793/',
        display_order: 3
      },
      {
        image_url: 'https://images.pexels.com/photos/3825517/pexels-photo-3825517.jpeg',
        alt_text: 'Radio frequency dial',
        credit: 'Brett Sayles',
        credit_url: 'https://www.pexels.com/photo/3825517/',
        display_order: 4
      }
    ]
  },
  {
    slug: 'am-vs-fm-radio-differences',
    title: 'AM vs FM Radio: Complete Guide to Differences, Advantages & When to Use Each',
    excerpt: 'AM and FM radio use fundamentally different technologies to broadcast. Understanding their differences in sound quality, range, interference resistance, and ideal use cases helps you choose the right radio band for your listening needs.',
    meta_title: 'AM vs FM Radio Differences: Complete Comparison Guide (2024) | GleeTune',
    meta_description: 'Understand the key differences between AM and FM radio including sound quality, range, interference, and best uses. Complete technical comparison with practical listening advice.',
    keywords: ['AM vs FM radio', 'AM FM differences', 'amplitude modulation vs frequency modulation', 'radio frequency comparison', 'AM FM radio quality'],
    category: 'Radio Education',
    tags: ['AM radio', 'FM radio', 'radio technology', 'broadcasting', 'amplitude modulation', 'frequency modulation'],
    reading_time_minutes: 13,
    is_published: true,
    published_at: new Date().toISOString(),
    featured_image: 'https://images.pexels.com/photos/1591447/pexels-photo-1591447.jpeg',
    featured_image_alt: 'Vintage radio with both AM and FM bands',
    featured_image_credit: 'Pixabay',
    featured_image_credit_url: 'https://www.pexels.com/photo/1591447/',
    content: `Discover the complete differences between AM and FM radio technology, from sound quality to range to best use cases.

## Introduction: Two Technologies, Different Purposes

Most people know FM sounds better while AM reaches farther, but few understand why these differences exist. The distinction reflects fundamentally different approaches to encoding information onto radio waves.

## The Basic Science

**AM (Amplitude Modulation):** Varies the signal strength while keeping frequency constant
**FM (Frequency Modulation):** Varies the signal frequency while keeping amplitude constant

## Sound Quality Comparison

FM provides dramatically better audio quality due to wider bandwidth (200 kHz vs AM's 10 kHz), inherent noise immunity, and stereo capability.

## Range and Coverage

AM excels at long-distance coverage through ground wave (50-100 miles) and nighttime sky wave propagation (1000+ miles). FM operates line-of-sight with consistent 50-60 mile coverage day and night.

## Interference and Noise

AM suffers from atmospheric and electrical interference. FM's constant amplitude provides natural immunity to most noise sources.

## Best Use Cases

**AM:** Talk radio, news, sports, emergency information, rural coverage
**FM:** Music broadcasting, high-quality audio, urban markets, stereo content

## The Future

Both technologies continue evolving with digital enhancements (HD Radio, DAB) while adapting to competition from streaming and podcasts.

## Conclusion

AM and FM serve different purposes. Understanding their distinct characteristics helps choose the right technology for specific listening or broadcasting needs.`,
    images: [
      {
        image_url: 'https://images.pexels.com/photos/8294928/pexels-photo-8294928.jpeg',
        alt_text: 'Sine wave visualization of radio carrier waves',
        credit: 'Tima Miroshnichenko',
        credit_url: 'https://www.pexels.com/photo/8294928/',
        display_order: 1
      },
      {
        image_url: 'https://images.pexels.com/photos/3825539/pexels-photo-3825539.jpeg',
        alt_text: 'Radio transmission tower',
        credit: 'Brett Sayles',
        credit_url: 'https://www.pexels.com/photo/3825539/',
        display_order: 2
      },
      {
        image_url: 'https://images.pexels.com/photos/159376/turntable-top-music-audio-159376.jpeg',
        alt_text: 'High fidelity audio equipment',
        credit: 'Skitterphoto',
        credit_url: 'https://www.pexels.com/photo/159376/',
        display_order: 3
      },
      {
        image_url: 'https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg',
        alt_text: 'DJ mixing music for FM broadcast',
        credit: 'Thibault Trillet',
        credit_url: 'https://www.pexels.com/photo/164821/',
        display_order: 4
      }
    ]
  }
];

async function insertBlogPosts() {
  console.log('🚀 Starting blog post insertion...\n');

  for (const postData of blogPosts) {
    console.log(`📝 Inserting: ${postData.title}`);

    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        slug: postData.slug,
        title: postData.title,
        excerpt: postData.excerpt,
        content: postData.content,
        featured_image: postData.featured_image,
        featured_image_alt: postData.featured_image_alt,
        featured_image_credit: postData.featured_image_credit,
        featured_image_credit_url: postData.featured_image_credit_url,
        meta_title: postData.meta_title,
        meta_description: postData.meta_description,
        keywords: postData.keywords,
        category: postData.category,
        tags: postData.tags,
        reading_time_minutes: postData.reading_time_minutes,
        is_published: postData.is_published,
        published_at: postData.published_at
      })
      .select()
      .single();

    if (postError) {
      console.error(`❌ Error inserting post: ${postError.message}`);
      continue;
    }

    console.log(`✅ Post inserted with ID: ${post.id}`);

    if (postData.images && postData.images.length > 0) {
      console.log(`   📸 Inserting ${postData.images.length} images...`);

      const imagesWithPostId = postData.images.map(img => ({
        ...img,
        post_id: post.id
      }));

      const { error: imagesError } = await supabase
        .from('blog_images')
        .insert(imagesWithPostId);

      if (imagesError) {
        console.error(`   ❌ Error inserting images: ${imagesError.message}`);
      } else {
        console.log(`   ✅ Images inserted successfully`);
      }
    }

    console.log('');
  }

  console.log('✨ Blog post insertion complete!\n');

  const { count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total blog posts in database: ${count}`);
}

insertBlogPosts().catch(console.error);
