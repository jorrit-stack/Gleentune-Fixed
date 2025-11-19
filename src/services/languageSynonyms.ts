export interface LanguageSynonym {
  canonical: string;
  displayName: string;
  synonyms: string[];
}

export const LANGUAGE_SYNONYMS: LanguageSynonym[] = [
  {
    canonical: 'bengali',
    displayName: 'Bangla / Bengali',
    synonyms: ['bangla', 'bengali', 'বাংলা', 'ben', 'bn']
  },
  {
    canonical: 'odia',
    displayName: 'Odia / Oriya',
    synonyms: ['odia', 'oriya', 'ଓଡ଼ିଆ', 'ori', 'or']
  },
  {
    canonical: 'german',
    displayName: 'Deutsch / German',
    synonyms: ['deutsch', 'german', 'ger', 'de']
  },
  {
    canonical: 'french',
    displayName: 'Français / French',
    synonyms: ['français', 'french', 'fra', 'fr', 'francaise', 'francés', 'franch']
  },
  {
    canonical: 'spanish',
    displayName: 'Español / Spanish',
    synonyms: ['español', 'spanish', 'castellano', 'spa', 'es', 'espana', 'españa', 'espanish', 'españo', 'espaňol']
  },
  {
    canonical: 'japanese',
    displayName: 'Nihongo / Japanese',
    synonyms: ['nihongo', 'japanese', '日本語', 'jpn', 'ja', 'japones']
  },
  {
    canonical: 'korean',
    displayName: 'Hangugeo / Korean',
    synonyms: ['hangugeo', 'hangul', 'korean', '한국어', 'kor', 'ko']
  },
  {
    canonical: 'chinese',
    displayName: 'Zhongwen / Chinese',
    synonyms: ['zhongwen', 'hanyu', 'putonghua', 'chinese', 'mandarin', 'cantonese', 'yueyu', '中国', 'zho', 'zh', 'china']
  },
  {
    canonical: 'persian',
    displayName: 'Farsi / Persian',
    synonyms: ['farsi', 'fārsi', 'persian', 'فارسی', 'per', 'fa']
  },
  {
    canonical: 'hebrew',
    displayName: 'Ivrit / Hebrew',
    synonyms: ['ivrit', 'hebrew', 'עברית', 'heb', 'he']
  },
  {
    canonical: 'portuguese',
    displayName: 'Português / Portuguese',
    synonyms: ['português', 'portuguese', 'por', 'pt', 'port', 'portu', 'portugués', 'portugues do brasil', 'portugues do braasil', 'brazilian portuguese', 'brasileiro', 'brasil']
  },
  {
    canonical: 'italian',
    displayName: 'Italiano / Italian',
    synonyms: ['italiano', 'italian', 'ita', 'it']
  },
  {
    canonical: 'russian',
    displayName: 'Русский / Russian',
    synonyms: ['русский', 'russian', 'rossia', 'rus', 'ru', 'язык: русский', 'язык: russia', 'язык: ру']
  },
  {
    canonical: 'arabic',
    displayName: 'العربية / Arabic',
    synonyms: ['العربية', 'عربي', 'arabic', 'arabi', 'ara', 'ar']
  },
  {
    canonical: 'hindi',
    displayName: 'Hindi / हिन्दी',
    synonyms: ['hindi', 'हिन्दी', 'hindu', 'hin', 'hi', 'english hindi']
  },
  {
    canonical: 'marathi',
    displayName: 'Marathi / मराठी',
    synonyms: ['marathi', 'मराठी', 'mar', 'mr']
  },
  {
    canonical: 'kannada',
    displayName: 'Kannada / Canarese',
    synonyms: ['kannada', 'canarese', 'ಕನ್ನಡ', 'kan', 'kn']
  },
  {
    canonical: 'tamil',
    displayName: 'Tamil / தமிழ்',
    synonyms: ['tamil', 'தமிழ்', 'tam', 'ta']
  },
  {
    canonical: 'telugu',
    displayName: 'Telugu / తెలుగు',
    synonyms: ['telugu', 'తెలుగు', 'tel', 'te']
  },
  {
    canonical: 'malayalam',
    displayName: 'Malayalam / മലയാളം',
    synonyms: ['malayalam', 'മലയാളം', 'mal', 'ml']
  },
  {
    canonical: 'punjabi',
    displayName: 'Punjabi / Panjabi',
    synonyms: ['punjabi', 'panjabi', 'punjab', 'ਪੰਜਾਬੀ', 'pan', 'pa', 'urdu/punjabi/seraiki']
  },
  {
    canonical: 'gujarati',
    displayName: 'Gujarati / ગુજરાતી',
    synonyms: ['gujarati', 'gujrati', 'ગુજરાતી', 'guj', 'gu']
  },
  {
    canonical: 'assamese',
    displayName: 'Assamese / Asamiya',
    synonyms: ['assamese', 'asamiya', 'অসমীয়া', 'asm', 'as']
  },
  {
    canonical: 'konkani',
    displayName: 'Konkani',
    synonyms: ['konkani']
  },
  {
    canonical: 'sindhi',
    displayName: 'Sindhi',
    synonyms: ['sindhi']
  },
  {
    canonical: 'urdu',
    displayName: 'Urdu / اردو',
    synonyms: ['urdu', 'اردو', 'urd', 'ur']
  },
  {
    canonical: 'maithili',
    displayName: 'Maithili',
    synonyms: ['maithili']
  },
  {
    canonical: 'manipuri',
    displayName: 'Manipuri / Meiteilon',
    synonyms: ['manipuri', 'meitei', 'meiteilon']
  },
  {
    canonical: 'nepali',
    displayName: 'Nepali / नेपाली',
    synonyms: ['nepali', 'नेपाली', 'nep', 'ne']
  },
  {
    canonical: 'indonesian',
    displayName: 'Bahasa Indonesia',
    synonyms: ['bahasa indonesia', 'indonesian', 'ind', 'id']
  },
  {
    canonical: 'malay',
    displayName: 'Bahasa Melayu',
    synonyms: ['bahasa melayu', 'malay', 'msa', 'ms']
  },
  {
    canonical: 'vietnamese',
    displayName: 'Tiếng Việt',
    synonyms: ['tiếng việt', 'vietnamese', 'vie', 'vi', '月南']
  },
  {
    canonical: 'tagalog',
    displayName: 'Filipino / Tagalog',
    synonyms: ['filipino', 'tagalog', 'tgl', 'tl', 'various filipino languages']
  },
  {
    canonical: 'thai',
    displayName: 'Thai / ภาษาไทย',
    synonyms: ['thai', 'ภาษาไทย', 'phasa thai', 'tha', 'th']
  },
  {
    canonical: 'khmer',
    displayName: 'Khmer / Cambodian',
    synonyms: ['khmer', 'cambodian', 'ភាសាខ្មែរ']
  },
  {
    canonical: 'burmese',
    displayName: 'Burmese / Myanmar',
    synonyms: ['burmese', 'myanmar', 'မြန်မာဘာသာ']
  },
  {
    canonical: 'dutch',
    displayName: 'Nederlands / Dutch',
    synonyms: ['nederlands', 'dutch', 'vlaams', 'flemish', 'flammish', 'nld', 'nl']
  },
  {
    canonical: 'finnish',
    displayName: 'Suomi / Finnish',
    synonyms: ['suomi', 'finnish', 'finish', 'fin', 'fi', 'finland', 'keski-suomi']
  },
  {
    canonical: 'swedish',
    displayName: 'Svenska / Swedish',
    synonyms: ['svenska', 'swedish', 'swe', 'sv']
  },
  {
    canonical: 'norwegian',
    displayName: 'Norsk / Norwegian',
    synonyms: ['norsk', 'norwegian', 'nor', 'no']
  },
  {
    canonical: 'danish',
    displayName: 'Dansk / Danish',
    synonyms: ['dansk', 'danish', 'dan', 'da', 'dansk/oldnordisk']
  },
  {
    canonical: 'greek',
    displayName: 'Ελληνικά / Greek',
    synonyms: ['ελληνικά', 'elliniká', 'greek', 'ancient greek', 'gre', 'el']
  },
  {
    canonical: 'polish',
    displayName: 'Polski / Polish',
    synonyms: ['polski', 'polish', 'pol', 'pl']
  },
  {
    canonical: 'ukrainian',
    displayName: 'Українська / Ukrainian',
    synonyms: ['українська', 'ukrayinsʹka', 'ukrainian', 'ukranian', 'ukr', 'uk', 'ua', 'украина']
  },
  {
    canonical: 'turkish',
    displayName: 'Türkçe / Turkish',
    synonyms: ['türkçe', 'turkish', 'türkisch', 'turkt', 'tur', 'tr']
  },
  {
    canonical: 'swahili',
    displayName: 'Kiswahili / Swahili',
    synonyms: ['kiswahili', 'swahili', 'swa', 'sw', 'kinyarwanda & kiswahili']
  },
  {
    canonical: 'amharic',
    displayName: 'Amharic / አማርኛ',
    synonyms: ['amharic', 'አማርኛ', 'amh', 'am']
  },
  {
    canonical: 'english',
    displayName: 'English',
    synonyms: ['english', 'american english', 'british english', 'english uk', 'engilsh', 'englsih', 'englsh', 'egnlish', 'englisg', 'eng', 'en', 'caribbean english', 'australian']
  },
  {
    canonical: 'afrikaans',
    displayName: 'Afrikaans',
    synonyms: ['afrikaans', 'afr', 'af', 'english/sotho/afrikaans']
  },
  {
    canonical: 'albanian',
    displayName: 'Shqip / Albanian',
    synonyms: ['shqip', 'albanian', 'sqi', 'sq', 'shqip macedonia']
  },
  {
    canonical: 'armenian',
    displayName: 'Հայերեն / Armenian',
    synonyms: ['հայերեն', 'hayeren', 'armenian']
  },
  {
    canonical: 'georgian',
    displayName: 'ქართული / Georgian',
    synonyms: ['ქართული', 'kartuli', 'georgian']
  },
  {
    canonical: 'romanian',
    displayName: 'Româna / Romanian',
    synonyms: ['româna', 'română', 'românä', 'romanian', 'romania', 'ron', 'ro']
  },
  {
    canonical: 'slovak',
    displayName: 'Slovenčina / Slovak',
    synonyms: ['slovenčina', 'slovak', 'slk', 'sk']
  },
  {
    canonical: 'slovenian',
    displayName: 'Slovenščina / Slovenian',
    synonyms: ['slovenščina', 'slovenian', 'slovenski', 'slowenisch', 'slv', 'sl']
  },
  {
    canonical: 'czech',
    displayName: 'Čeština / Czech',
    synonyms: ['čeština', 'česky', 'czech', 'ces', 'cs']
  },
  {
    canonical: 'hungarian',
    displayName: 'Magyar / Hungarian',
    synonyms: ['magyar', 'hungarian', 'hun', 'hu']
  },
  {
    canonical: 'basque',
    displayName: 'Euskara / Basque',
    synonyms: ['euskara', 'euskera', 'basque', 'eus', 'eu']
  },
  {
    canonical: 'catalan',
    displayName: 'Català / Catalan',
    synonyms: ['català', 'catalan', 'cat', 'ca']
  },
  {
    canonical: 'galician',
    displayName: 'Galego / Galician',
    synonyms: ['galego', 'galician', 'gallego', 'galaic–portuguese']
  },
  {
    canonical: 'belarusian',
    displayName: 'Беларуская / Belarusian',
    synonyms: ['беларуская', 'belarusian']
  },
  {
    canonical: 'bulgarian',
    displayName: 'Български / Bulgarian',
    synonyms: ['български', 'bulgarian', 'bulgaria', 'bul', 'bg']
  },
  {
    canonical: 'serbian',
    displayName: 'Српски / Serbian',
    synonyms: ['српски', 'serbian', 'srp', 'sr']
  },
  {
    canonical: 'croatian',
    displayName: 'Hrvatski / Croatian',
    synonyms: ['hrvatski', 'croatian', 'croatia', 'hrv', 'hr']
  },
  {
    canonical: 'bosnian',
    displayName: 'Bosnian',
    synonyms: ['bosnian']
  },
  {
    canonical: 'somali',
    displayName: 'Soomaali / Somali',
    synonyms: ['soomaali', 'somali', 'som', 'so']
  },
  {
    canonical: 'hausa',
    displayName: 'Hausa',
    synonyms: ['hausa', 'hau', 'ha']
  },
  {
    canonical: 'yoruba',
    displayName: 'Yorùbá / Yoruba',
    synonyms: ['yorùbá', 'yoruba', 'yor', 'yo']
  },
  {
    canonical: 'zulu',
    displayName: 'IsiZulu / Zulu',
    synonyms: ['isizulu', 'zulu', 'zul', 'zu']
  }
];

const synonymMap = new Map<string, LanguageSynonym>();
LANGUAGE_SYNONYMS.forEach(lang => {
  synonymMap.set(lang.canonical, lang);
  synonymMap.set(lang.displayName.toLowerCase(), lang);
  lang.synonyms.forEach(syn => {
    synonymMap.set(syn.toLowerCase(), lang);
  });
});

export function getCanonicalLanguage(language: string): LanguageSynonym | null {
  const normalized = language.toLowerCase().trim();

  const direct = synonymMap.get(normalized);
  if (direct) return direct;

  if (normalized.includes('/')) {
    const parts = normalized.split('/').map(p => p.trim());
    for (const part of parts) {
      const match = synonymMap.get(part);
      if (match) return match;
    }
  }

  return null;
}

export function getAllSynonymsForLanguage(language: string): string[] {
  const canonical = getCanonicalLanguage(language);
  return canonical ? canonical.synonyms : [language.toLowerCase().trim()];
}

export function getDisplayName(language: string): string {
  const canonical = getCanonicalLanguage(language);
  return canonical ? canonical.displayName : language.charAt(0).toUpperCase() + language.slice(1);
}
