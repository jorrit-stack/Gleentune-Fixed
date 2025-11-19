import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!serviceRoleKey || serviceRoleKey === 'your-service-role-key-here') {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not configured in .env file');
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

async function insertUserBlogPost() {
  console.log('🚀 Inserting "The Fascinating History of Radio Broadcasting: From Spark to Stream"...\n');

  const content = `<div class="blog-content">

<h2>The Invisible Symphony</h2>

<p>Imagine this: it's the late 19th century. The world runs on letters, telegrams, and human messengers. There's no phone in every pocket, no screen lighting up your face. Yet, in a quiet lab, a faint crackle in the air begins a revolution… one that would soon fill every home, car, and even pocket with voices, news, and music carried by nothing but waves in the air.</p>

<p>This is the story of radio broadcasting - a tale that begins with sparks, travels through wars, dances with music, and still thrives today in podcasts and digital streams.</p>

<h2>Chapter 1: The Birth of the Spark - Early Pioneers</h2>

<p>Before "radio" was even a word, inventors were tinkering with a mysterious force: electromagnetic waves.</p>

<h3>The Theory: James Clerk Maxwell (1860s)</h3>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/9/9e/James_Clerk_Maxwell_profile.jpg" alt="James Clerk Maxwell profile photograph" />
  <figcaption>James Clerk Maxwell. Credit: Unidentified photographer. Smithsonian Institution from United States, Public domain, via Wikimedia Commons</figcaption>
</figure>

<p>Maxwell predicted the existence of electromagnetic waves, the invisible foundation for all wireless communication. His equations described how electric and magnetic fields dance together, creating ripples that can travel endlessly through space.</p>

<p>Long before anyone could see or detect such waves, he imagined a universe where light itself was just another form of electromagnetism… a breathtaking unification of physics.</p>

<p>He didn't build radios, but he laid the mathematical bricks for others to walk on… a theoretical map that would one day guide Hertz, Bose, and Marconi in turning invisible forces into human connection.</p>

<h3>The Proof: Heinrich Hertz (1886)</h3>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/f/f6/B%C3%BCste_von_Heinrich_Hertz_in_Karlsruhe.jpg" alt="Bust statue of Heinrich Hertz in Karlsruhe" />
  <figcaption>Bust of Heinrich Hertz. Credit: Klaus-Dieter Keller, Public domain, via Wikimedia Commons</figcaption>
</figure>

<p>Hertz proved Maxwell right. He built an apparatus that generated and detected these invisible waves. The "spark-gap transmitter" sent out radio waves, and a metal loop nearby picked them up, crackling with little sparks of its own. That was the first wireless signal ever received.</p>

<p>In that quiet lab, he had just opened a new chapter in physics - waves leaping through the air, unseen yet real. But Hertz wasn't thinking of communication; for him, it was simply a brilliant physics experiment. He once admitted he couldn't imagine any practical use for it. Little did he know, those tiny sparks would one day power the world's greatest connections.</p>

<h3>The Scientist and Architect of Wireless Communication: J C Bose (1890s)</h3>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/5/56/J.C.Bose.JPG" alt="Portrait photograph of J.C. Bose" />
  <figcaption>J.C. Bose. Credit: The Birth Centenary Committee, printed by P.C. Ray, Public domain, via Wikimedia Commons</figcaption>
</figure>

<p>At the turn of the century, a quiet genius J. C. Bose from Calcutta, India, whose pioneering experiments reshaped our understanding of wireless communication.</p>

<p>As early as 1895, Bose demonstrated the transmission of electromagnetic waves across a hall in Calcutta using millimeter waves, a feat that laid the foundation for modern wireless and microwave technology.</p>

<p>He went far beyond mere demonstration. Bose developed semiconductor detectors, waveguides, and advanced microwave components… inventions that would not reappear in mainstream electronics for several decades.</p>

<p>Driven not by profit but by the pursuit of knowledge, Bose refused to patent his discoveries, believing that scientific progress should belong to humanity, not to markets. Among his many innovations was the mercury coherer with telephone detector, a remarkably sensitive receiver that played a vital role in detecting radio signals and later influenced the evolution of wireless communication.</p>

<p>His groundbreaking research would soon pave the way for the long-distance radio technologies that followed, proving that Bose's quiet laboratory in Calcutta had already echoed with the first true whispers of wireless communication.</p>

<p><strong>Fun Fact:</strong> In 1896, Bose's apparatus could transmit signals through walls - the same principle that underlies your Wi-Fi today.</p>

<h3>The Messenger: Guglielmo Marconi (1895–1901)</h3>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/2/24/Marconi_inside_Cabot_Tower_St_John%27s_1901.jpg" alt="Marconi inside Cabot Tower in St. John's receiving first transatlantic signal" />
  <figcaption>Marconi inside Cabot Tower St John's 1901. Credit: James Vey (1852?-1922), Public domain, via Wikimedia Commons</figcaption>
</figure>

<p>While the scientific groundwork for wireless communication had already been explored by earlier pioneers, Guglielmo Marconi brought those ideas to the world stage.</p>

<p>In 1895, he successfully transmitted signals over a kilometer, demonstrating the practical potential of radio waves.</p>

<p>By 1901, he achieved a historic feat… transmitting the Morse code letter "S" across the Atlantic Ocean, from England to Newfoundland.</p>

<p>That three-dot signal was more than a triumph of science; it marked the first global proof of wireless communication, bridging continents through invisible waves.</p>

<p>Thus began the age of radio!</p>

<h2>Chapter 2: From Morse to Music - The Rise of Broadcast Radio</h2>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/2/28/CKUA_Broadcast_booth.jpg" alt="Early radio broadcast booth with equipment and operators" />
  <figcaption>CKUA Broadcast booth. Credit: University of Alberta Archives, Public domain, via Wikimedia Commons</figcaption>
</figure>

<p>At first, radio was like WhatsApp… but only for Morse code messages between ships and stations. Then came the idea of transmitting sound.</p>

<h3>Reginald Fessenden: The First Voice (1906)</h3>

<p>On Christmas Eve 1906, Fessenden made history. He read passages from the Bible and played a violin solo over the airwaves.</p>

<p>Imagine sailors at sea, accustomed only to the rhythmic dots and dashes of Morse code, suddenly hearing music and a human voice. That night, radio was reborn from code to conversation.</p>

<h3>Lee de Forest and the Audion Tube</h3>

<p>Lee de Forest invented the vacuum tube amplifier (Audion) in 1906, making it possible to amplify weak radio signals.</p>

<p>Without him, your radio would've whispered instead of sang.</p>

<h2>Chapter 3: The Golden Age of Radio (1920s–1940s)</h2>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/8/85/Marconi_Type_106_crystal_radio_receiver.jpg" alt="Marconi Type 106 crystal radio receiver" />
  <figcaption>Marconi Type 106 crystal radio receiver. Credit: Elmer Eustice Bucher, Public domain, via Wikimedia Commons</figcaption>
</figure>

<p>Now picture the 1920s: jazz in the air, roaring automobiles, and living rooms glowing with wooden radio sets.</p>

<h3>1920: KDKA, Pittsburgh - The First Commercial Broadcast</h3>

<p>KDKA went on air on November 2, 1920, announcing the U.S. presidential election results.</p>

<p>It wasn't just news… it was magic. People heard history unfold live.</p>

<p>Soon, stations multiplied. Families gathered around their radios every evening, like ritual news at 7, drama at 8, music at 9.</p>

<blockquote>"It's time for The Shadow... and don't touch that dial!"</blockquote>

<h3>Music Meets the Microphone</h3>

<p>Big bands and crooners dominated the airwaves. Jazz, swing, and early rock found their way from clubs into millions of homes.</p>

<p>For the first time, music became mass media.</p>

<h3>Radio News and War</h3>

<p>During World War II, radio became humanity's lifeline.</p>

<p>Winston Churchill's speeches, Roosevelt's "fireside chats," and war correspondents reporting from the frontlines turned radio into both a comfort and a weapon.</p>

<p>Propaganda also found its way "Tokyo Rose" and "Lord Haw-Haw" became infamous voices during the war.</p>

<p>Radio proved that words could move armies.</p>

<h2>Chapter 4: AM vs FM - The Battle of the Bands</h2>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d4/Older_AMFM_radio.jpg" alt="Vintage AM/FM radio receiver" />
  <figcaption>Older AM/FM radio. Credit: Dsw4, Public domain, via Wikimedia Commons</figcaption>
</figure>

<p>As radio matured, two main technologies emerged AM (Amplitude Modulation) and FM (Frequency Modulation).</p>

<h3>AM Radio: The Classic Workhorse</h3>

<p>AM was first. It modulates the amplitude (strength) of the signal. It can travel long distances, even bounce off the ionosphere at night.</p>

<p>That's why AM stations could be heard hundreds of kilometers away… but with static and noise.</p>

<h3>FM Radio: The Game Changer</h3>

<p>In the 1930s, Edwin Armstrong invented FM. It varied the frequency instead of amplitude, giving clearer, static-free sound - perfect for music.</p>

<p>But commercial adoption was slow. AM ruled the airwaves for decades. FM rose in the 1960s and 70s when rock 'n' roll demanded better sound quality.</p>

<p><strong>Did you know?</strong> The term "Hi-Fi" (High Fidelity) became a selling point during FM's rise.</p>

<h2>Chapter 5: Shortwave and the Global Voice</h2>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/aa/Shortwave_Radio.jpg" alt="Shortwave radio receiver with frequency dial" />
  <figcaption>Shortwave Radio. Credit: Junglecat at English Wikipedia, Public domain, via Wikimedia Commons</figcaption>
</figure>

<p>As the world grew smaller, radio waves reached farther.</p>

<h3>Shortwave Radio (SW)</h3>

<p>Shortwave operates between 3 and 30 MHz. Its unique trait? It bounces off the ionosphere, letting signals travel across continents.</p>

<p>That's how BBC, Voice of America, and Radio Moscow reached listeners behind political borders and Iron Curtains.</p>

<p>For decades, shortwave was the internet of the pre-internet era - free, global, and uncensored.</p>

<blockquote>"This is London… calling the world."</blockquote>

<p>Even today, shortwave remains vital for remote regions, ships, and during disasters when everything else fails.</p>

<h2>Chapter 6: The Television Invasion and Radio's Reinvention</h2>

<p>When television appeared in the 1950s, many predicted radio's death.</p>

<p>But radio didn't die… it evolved.</p>

<h3>Car Radios: The New Frontier</h3>

<p>As cars became central to modern life, radio moved into dashboards. AM/FM became your travel companion… weather, news, and top hits on the go.</p>

<h3>The Portable Revolution</h3>

<p>Then came the transistor radio… small, battery-powered, and affordable.</p>

<p>Teenagers could carry music wherever they went.</p>

<p>This was radio's second golden age - personal, portable, and rebellious.</p>

<h2>Chapter 7: The FM Boom, Talk Shows, and Niche Formats</h2>

<p>The 1970s-1990s saw FM dominate. Stations specialized - Top 40 hits, talk shows, sports, classical, news.</p>

<p>Hosts became celebrities. "Drive-time" and "morning shows" became household terms.</p>

<p>Meanwhile, AM found a new role - news, talk, and politics.</p>

<blockquote>"Good morning, America. You're listening to the Rush Limbaugh Show!"</blockquote>

<p>Radio had reinvented itself again - as a space for voices and opinions.</p>

<h2>Chapter 8: From Antennas to Algorithms - The Digital Shift</h2>

<p>As the 21st century dawned, the internet brought both threat and opportunity.</p>

<h3>Internet Radio and Streaming</h3>

<p>Streaming platforms like Pandora, Spotify, and Apple Music blurred the line between radio and playlist.</p>

<p>Anyone could create a station, no transmitter needed.</p>

<p>Live radio moved online - global reach, zero static.</p>

<h3>Podcasts: The New Radio</h3>

<p>Podcasts revived radio's storytelling soul. True crime, interviews, audiobooks - on demand, everywhere.</p>

<p>What once needed antennas and towers now fits in a smartphone app.</p>

<h3>Smart Speakers and Voice AI</h3>

<p>Today, you can just say, "Alexa, play BBC World Service," and your voice becomes the new dial knob.</p>

<p>Radio has gone from spark to stream, yet its essence remains unchanged: human voices traveling invisibly across space, connecting minds and hearts.</p>

<h2>Chapter 9: Why Radio Still Matters</h2>

<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Very_old_radio_%282793641534%29.jpg" alt="Very old vintage radio receiver" />
  <figcaption>Very old radio. Credit: Markus Kniebes from Bochum, Germany, CC0, via Wikimedia Commons</figcaption>
</figure>

<p>In an age of social media noise and algorithmic chaos, radio remains human.</p>

<ul>
  <li><strong>It's accessible</strong> - anyone with a cheap receiver can listen.</li>
  <li><strong>It's intimate</strong> - a voice that talks to you, not at you.</li>
  <li><strong>It's resilient</strong> - works when networks fail.</li>
  <li><strong>It's local and global at once</strong> - your city's traffic and the world's headlines, both on the same dial.</li>
</ul>

<p>Even the latest digital standards DAB (Digital Audio Broadcasting) and HD Radio are just evolutions of the same timeless promise:</p>

<blockquote>"To connect people through the air."</blockquote>

<h2>The Eternal Wave</h2>

<p>From Maxwell's invisible equations that first imagined electromagnetic waves, to Hertz's sparks that proved them real…</p>

<p>From J.C. Bose's silent transmissions in Calcutta, to Marconi's triumphant dots crossing the Atlantic, to Armstrong's crystal-clear FM tones, and now to your Spotify playlist… radio has never stopped evolving.</p>

<p>It's more than a technology.</p>

<p>It's a mirror of humanity's eternal desire… to speak, to listen, to connect.</p>

<p>And somewhere, even now, as you read this,</p>

<p>a faint wave travels silently through the air…</p>

<p>carrying someone's story to someone else's heart.</p>

</div>`;

  const postData = {
    slug: 'fascinating-history-radio-broadcasting-spark-to-stream',
    title: 'The Fascinating History of Radio Broadcasting: From Spark to Stream',
    excerpt: 'Imagine the late 19th century: no phones, no screens, just letters and telegrams. Then a faint crackle in a quiet lab begins a revolution that fills homes with voices, news, and music carried by invisible waves. This is the complete story of radio broadcasting.',
    content: content,
    featured_image: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Pictorial_diagram_of_spark_radio_transmitter_1922.jpg',
    featured_image_alt: 'Pictorial diagram of spark radio transmitter from 1922',
    featured_image_credit: 'Austin C. Lescarboura, Public domain, via Wikimedia Commons',
    featured_image_credit_url: 'https://commons.wikimedia.org/wiki/File:Pictorial_diagram_of_spark_radio_transmitter_1922.jpg',
    meta_title: 'The Fascinating History of Radio Broadcasting: From Spark to Stream | GleeTune',
    meta_description: 'Discover the complete history of radio from Maxwell\'s equations to modern streaming. Learn about pioneers like Hertz, Bose, and Marconi who turned invisible waves into human connection.',
    keywords: [
      'history of radio broadcasting',
      'radio invention',
      'James Clerk Maxwell',
      'Heinrich Hertz',
      'J C Bose',
      'Guglielmo Marconi',
      'AM vs FM radio',
      'shortwave radio',
      'golden age of radio',
      'radio technology evolution'
    ],
    category: 'Radio History',
    tags: [
      'radio history',
      'broadcasting',
      'electromagnetic waves',
      'wireless communication',
      'AM radio',
      'FM radio',
      'shortwave',
      'radio pioneers',
      'technology history'
    ],
    reading_time_minutes: 18,
    is_published: true,
    published_at: new Date().toISOString()
  };

  const { data: post, error: postError } = await supabase
    .from('blog_posts')
    .insert(postData)
    .select()
    .single();

  if (postError) {
    console.error(`❌ Error inserting post: ${postError.message}`);
    return;
  }

  console.log(`✅ Blog post inserted successfully with ID: ${post.id}`);
  console.log(`📝 Title: ${post.title}`);
  console.log(`🔗 Slug: ${post.slug}`);
  console.log(`📖 Reading time: ${post.reading_time_minutes} minutes`);
  console.log(`\n✨ Your blog post is now live!\n`);
}

insertUserBlogPost().catch(console.error);
