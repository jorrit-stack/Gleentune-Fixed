export const STANDARD_GENRES = [
  'News',
  'Talk',
  'Sports',
  'Pop',
  'Rock',
  'Classic Rock',
  'Alternative',
  'Indie',
  'Jazz',
  'Classical',
  'Blues',
  'Country',
  'Folk',
  'Electronic',
  'Dance',
  'Hip Hop',
  'R&B',
  'Latin',
  'Regional Mexican',
  'Salsa',
  'Reggae',
  'Reggaeton',
  'Religious',
  'Oldies',
  'Classic Hits',
  'Contemporary Pop',
  'Easy Listening',
  'World',
  'Bollywood',
  'K-Pop',
  'Educational',
  'Comedy',
  'Variety'
] as const;

export type StandardGenre = typeof STANDARD_GENRES[number];

export const GENRE_KEYWORDS: Record<StandardGenre, string[]> = {
  'News': [
    'news', 'noticias', 'nouvelles', 'nachrichten', 'notícias',
    'current affairs', 'actualidad', 'información', 'info',
    'headlines', 'breaking', 'bbc news', 'cnn', 'abc news', 'nbc news',
    'npr news', 'all news', 'news radio', 'news talk', 'newsradio'
  ],
  'Talk': [
    'talk', 'conversation', 'conversación', 'dialogue', 'debate',
    'interview', 'podcast', 'discussion', 'public radio', 'community radio',
    'talkback', 'phone in', 'call in', 'spoken word'
  ],
  'Sports': [
    'sports', 'deportes', 'sport', 'football', 'soccer', 'fútbol',
    'basketball', 'baseball', 'hockey', 'cricket', 'rugby',
    'athletics', 'espn', 'fox sports', 'sports talk', 'sports radio'
  ],
  'Pop': [
    'pop', 'top 40', 'top40', 'hit', 'hits', 'chart', 'charts',
    'contemporary hit', 'chr', 'mainstream', 'popular music',
    'pop music', 'today hits', 'current hits'
  ],
  'Rock': [
    'rock', 'rock music', 'hard rock', 'soft rock', 'modern rock',
    'rock roll', 'rock n roll', 'rock and roll', 'arena rock'
  ],
  'Classic Rock': [
    'classic rock', 'classic hits rock', 'rock classics', 'golden rock',
    '70s rock', '80s rock', '90s rock', 'retro rock'
  ],
  'Alternative': [
    'alternative', 'alt rock', 'indie rock', 'college rock',
    'modern alternative', 'alternative rock', 'alt', 'underground'
  ],
  'Indie': [
    'indie', 'independent', 'indie pop', 'indie folk', 'lo-fi', 'lofi'
  ],
  'Jazz': [
    'jazz', 'smooth jazz', 'contemporary jazz', 'jazz fusion',
    'bebop', 'swing', 'big band', 'jazz classics', 'jazz music'
  ],
  'Classical': [
    'classical', 'classical music', 'symphony', 'orchestra', 'orchestral',
    'opera', 'baroque', 'chamber music', 'clásica', 'classique',
    'klassik', 'concert', 'philharmonic'
  ],
  'Blues': [
    'blues', 'rhythm and blues', 'chicago blues', 'delta blues',
    'blues music', 'blues rock'
  ],
  'Country': [
    'country', 'country music', 'modern country', 'classic country',
    'country hits', 'new country', 'hot country', 'nash', 'nashville'
  ],
  'Folk': [
    'folk', 'folk music', 'folk rock', 'acoustic', 'americana',
    'bluegrass', 'celtic', 'traditional'
  ],
  'Electronic': [
    'electronic', 'edm', 'techno', 'trance', 'ambient', 'electronica',
    'electro', 'synth', 'synthwave', 'drum and bass', 'dubstep'
  ],
  'Dance': [
    'dance', 'dance music', 'club', 'club music', 'house music',
    'disco', 'eurodance', 'dance hits', 'party', 'party music'
  ],
  'Hip Hop': [
    'hip hop', 'hiphop', 'rap', 'urban', 'trap', 'hip-hop',
    'rap music', 'urban music', 'beats'
  ],
  'R&B': [
    'r&b', 'rnb', 'rhythm and blues', 'soul', 'motown',
    'neo soul', 'quiet storm', 'urban contemporary', 'soul music'
  ],
  'Latin': [
    'latin', 'latino', 'latina', 'spanish', 'español',
    'latin music', 'música latina', 'tropical', 'latin pop'
  ],
  'Regional Mexican': [
    'regional mexican', 'regional', 'mexicana', 'ranchera', 'mariachi',
    'banda', 'norteño', 'corridos', 'grupera', 'grupero', 'tejano',
    'duranguense', 'sierreño'
  ],
  'Salsa': [
    'salsa', 'salsa music', 'mambo', 'son', 'timba'
  ],
  'Reggae': [
    'reggae', 'roots reggae', 'dancehall', 'ska', 'rocksteady',
    'reggae music', 'jamaican', 'dub'
  ],
  'Reggaeton': [
    'reggaeton', 'reggaetón', 'urbano', 'dembow', 'perreo'
  ],
  'Religious': [
    'religious', 'religion', 'faith', 'spiritual', 'spirituality',
    'worship', 'praise', 'church', 'gospel', 'católica', 'catholic',
    'christian radio', 'ministry', 'prayer', 'christian', 'christian music',
    'contemporary christian', 'ccm', 'christian rock', 'christian hits',
    'gospel music', 'inspirational'
  ],
  'Oldies': [
    'oldies', 'oldie', 'golden oldies', 'classic oldies',
    '50s', '60s', 'fifties', 'sixties', 'retro', 'nostalgia'
  ],
  'Classic Hits': [
    'classic hits', 'classics', 'greatest hits', 'best of',
    '70s', '80s', '90s', 'seventies', 'eighties', 'nineties',
    'classic songs', 'timeless', 'recuerdos'
  ],
  'Contemporary Pop': [
    'adult contemporary', 'ac', 'lite', 'light', 'easy',
    'soft hits', 'soft rock', 'mellow', 'adulto contemporáneo',
    'soft adult contemporary', 'hot ac', 'contemporary pop'
  ],
  'Easy Listening': [
    'easy listening', 'beautiful music', 'relaxing', 'chill',
    'lounge', 'instrumental', 'background music', 'smooth'
  ],
  'World': [
    'world', 'world music', 'ethnic', 'international',
    'multicultural', 'global', 'ethnic music'
  ],
  'Bollywood': [
    'bollywood', 'hindi', 'indian', 'desi', 'filmi',
    'bollywood hits', 'hindi songs', 'indian music'
  ],
  'K-Pop': [
    'k-pop', 'kpop', 'korean', 'korean pop', 'k pop'
  ],
  'Educational': [
    'educational', 'education', 'learning', 'teaching',
    'school', 'university', 'college radio', 'academic',
    'lecture', 'instructional', 'student'
  ],
  'Comedy': [
    'comedy', 'humor', 'humour', 'funny', 'laugh',
    'stand up', 'standup', 'jokes', 'comic'
  ],
  'Variety': [
    'variety', 'mixed', 'various', 'everything', 'all genres',
    'general', 'entertainment', 'variado', 'mix'
  ]
};

export const ADULT_KEYWORDS = [
  'adult', 'xxx', 'sexy', 'erotic', 'explicit', 'nsfw',
  'mature', '18+', '21+', 'x-rated', 'porn', 'hot fm'
];

export function detectGenre(station: {
  name: string;
  tags?: string[];
  content_type?: string | null;
  genre?: string | null;
}): StandardGenre | null {
  const searchText = [
    station.name,
    station.content_type || '',
    station.genre || '',
    ...(station.tags || [])
  ]
    .join(' ')
    .toLowerCase();

  // Check for adult content - EXCLUDE these stations
  for (const keyword of ADULT_KEYWORDS) {
    if (searchText.includes(keyword.toLowerCase())) {
      return null; // Exclude adult content stations
    }
  }

  const genreScores: Partial<Record<StandardGenre, number>> = {};

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS) as [StandardGenre, string[]][]) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      if (regex.test(searchText)) {
        score += keyword.length;
      }
    }
    if (score > 0) {
      genreScores[genre] = score;
    }
  }

  if (Object.keys(genreScores).length === 0) {
    return null;
  }

  const bestGenre = Object.entries(genreScores).reduce((a, b) =>
    (b[1] > a[1]) ? b : a
  )[0] as StandardGenre;

  return bestGenre;
}
