import { supabase } from '../lib/supabase';
import type { RadioStation } from '../types/radio';

export interface Language {
  name: string;
  stationCount: number;
}

export async function getAvailableLanguages(): Promise<Language[]> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('language')
      .not('language', 'is', null)
      .neq('language', '');

    if (error) throw error;

    const languageCounts = new Map<string, number>();

    data.forEach((row) => {
      if (!row.language) return;

      const languages = row.language
        .split(',')
        .map((lang: string) => lang.trim().toLowerCase())
        .filter((lang: string) => lang && !lang.match(/^\d+\s+(additional|other)\s+languages?$/i));

      languages.forEach((lang: string) => {
        const normalized = normalizeLanguage(lang);
        if (normalized) {
          languageCounts.set(normalized, (languageCounts.get(normalized) || 0) + 1);
        }
      });
    });

    const languages: Language[] = Array.from(languageCounts.entries())
      .map(([name, stationCount]) => ({ name, stationCount }))
      .sort((a, b) => {
        if (b.stationCount !== a.stationCount) {
          return b.stationCount - a.stationCount;
        }
        return a.name.localeCompare(b.name);
      });

    return languages;
  } catch (error) {
    console.error('Error fetching languages:', error);
    return [];
  }
}

export async function getStationsByLanguage(language: string, limit: number = 100): Promise<RadioStation[]> {
  try {
    const normalizedLanguage = normalizeLanguage(language);

    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .not('language', 'is', null)
      .neq('language', '')
      .not('stream_url', 'is', null)
      .neq('stream_url', '')
      .order('name')
      .limit(1000);

    if (error) throw error;

    const filtered = data.filter((station) => {
      if (!station.language) return false;
      const languages = station.language
        .split(',')
        .map((lang: string) => normalizeLanguage(lang.trim()))
        .filter(Boolean);
      return languages.includes(normalizedLanguage);
    });

    return filtered.slice(0, limit).map(mapToRadioStation);
  } catch (error) {
    console.error('Error fetching stations by language:', error);
    return [];
  }
}

function normalizeLanguage(lang: string): string {
  const cleaned = lang.toLowerCase().trim();

  const languageMap: Record<string, string> = {
    'eng': 'english',
    'en': 'english',
    'american english': 'english',
    'british english': 'english',
    'uk english': 'english',
    'us english': 'english',
    'spa': 'spanish',
    'es': 'spanish',
    'español': 'spanish',
    'castellano': 'spanish',
    'fra': 'french',
    'fr': 'french',
    'français': 'french',
    'ger': 'german',
    'de': 'german',
    'deutsch': 'german',
    'ita': 'italian',
    'it': 'italian',
    'italiano': 'italian',
    'por': 'portuguese',
    'pt': 'portuguese',
    'português': 'portuguese',
    'rus': 'russian',
    'ru': 'russian',
    'русский': 'russian',
    'ara': 'arabic',
    'ar': 'arabic',
    'العربية': 'arabic',
    'zho': 'chinese',
    'zh': 'chinese',
    'mandarin': 'chinese',
    'cantonese': 'chinese',
    'jpn': 'japanese',
    'ja': 'japanese',
    '日本語': 'japanese',
    'kor': 'korean',
    'ko': 'korean',
    '한국어': 'korean',
    'hin': 'hindi',
    'hi': 'hindi',
    'हिन्दी': 'hindi',
    'ben': 'bengali',
    'bn': 'bengali',
    'বাংলা': 'bengali',
    'tel': 'telugu',
    'te': 'telugu',
    'తెలుగు': 'telugu',
    'tam': 'tamil',
    'ta': 'tamil',
    'தமிழ்': 'tamil',
    'mar': 'marathi',
    'mr': 'marathi',
    'मराठी': 'marathi',
    'urd': 'urdu',
    'ur': 'urdu',
    'اردو': 'urdu',
    'guj': 'gujarati',
    'gu': 'gujarati',
    'ગુજરાતી': 'gujarati',
    'kan': 'kannada',
    'kn': 'kannada',
    'ಕನ್ನಡ': 'kannada',
    'mal': 'malayalam',
    'ml': 'malayalam',
    'മലയാളം': 'malayalam',
    'pan': 'punjabi',
    'pa': 'punjabi',
    'ਪੰਜਾਬੀ': 'punjabi',
    'ori': 'odia',
    'or': 'odia',
    'ଓଡ଼ିଆ': 'odia',
    'asm': 'assamese',
    'as': 'assamese',
    'অসমীয়া': 'assamese',
    'nep': 'nepali',
    'ne': 'nepali',
    'नेपाली': 'nepali',
    'sin': 'sinhala',
    'si': 'sinhala',
    'සිංහල': 'sinhala',
    'tha': 'thai',
    'th': 'thai',
    'ไทย': 'thai',
    'vie': 'vietnamese',
    'vi': 'vietnamese',
    'tiếng việt': 'vietnamese',
    'ind': 'indonesian',
    'id': 'indonesian',
    'bahasa indonesia': 'indonesian',
    'msa': 'malay',
    'ms': 'malay',
    'bahasa melayu': 'malay',
    'tgl': 'tagalog',
    'tl': 'tagalog',
    'filipino': 'tagalog',
    'swa': 'swahili',
    'sw': 'swahili',
    'kiswahili': 'swahili',
    'tur': 'turkish',
    'tr': 'turkish',
    'türkçe': 'turkish',
    'pol': 'polish',
    'pl': 'polish',
    'polski': 'polish',
    'ukr': 'ukrainian',
    'uk': 'ukrainian',
    'українська': 'ukrainian',
    'nld': 'dutch',
    'nl': 'dutch',
    'nederlands': 'dutch',
    'swe': 'swedish',
    'sv': 'swedish',
    'svenska': 'swedish',
    'nor': 'norwegian',
    'no': 'norwegian',
    'norsk': 'norwegian',
    'dan': 'danish',
    'da': 'danish',
    'dansk': 'danish',
    'fin': 'finnish',
    'fi': 'finnish',
    'suomi': 'finnish',
    'gre': 'greek',
    'el': 'greek',
    'ελληνικά': 'greek',
    'heb': 'hebrew',
    'he': 'hebrew',
    'עברית': 'hebrew',
    'per': 'persian',
    'fa': 'persian',
    'farsi': 'persian',
    'فارسی': 'persian',
    'aze': 'azerbaijani',
    'az': 'azerbaijani',
    'azer': 'azerbaijani',
    'azr': 'azerbaijani',
    'amh': 'amharic',
    'am': 'amharic',
    'አማርኛ': 'amharic',
    'afr': 'afrikaans',
    'af': 'afrikaans',
    'sqi': 'albanian',
    'sq': 'albanian',
    'shqip': 'albanian',
    'eus': 'basque',
    'eu': 'basque',
    'euskara': 'basque',
    'cat': 'catalan',
    'ca': 'catalan',
    'català': 'catalan',
    'ces': 'czech',
    'cs': 'czech',
    'čeština': 'czech',
    'hun': 'hungarian',
    'hu': 'hungarian',
    'magyar': 'hungarian',
    'ron': 'romanian',
    'ro': 'romanian',
    'română': 'romanian',
    'srp': 'serbian',
    'sr': 'serbian',
    'српски': 'serbian',
    'hrv': 'croatian',
    'hr': 'croatian',
    'hrvatski': 'croatian',
    'bul': 'bulgarian',
    'bg': 'bulgarian',
    'български': 'bulgarian',
    'slk': 'slovak',
    'sk': 'slovak',
    'slovenčina': 'slovak',
    'slv': 'slovenian',
    'sl': 'slovenian',
    'slovenščina': 'slovenian',
    'lit': 'lithuanian',
    'lt': 'lithuanian',
    'lietuvių': 'lithuanian',
    'lav': 'latvian',
    'lv': 'latvian',
    'latviešu': 'latvian',
    'est': 'estonian',
    'et': 'estonian',
    'eesti': 'estonian',
    'som': 'somali',
    'so': 'somali',
    'soomaali': 'somali',
    'hau': 'hausa',
    'ha': 'hausa',
    'yor': 'yoruba',
    'yo': 'yoruba',
    'ibo': 'igbo',
    'ig': 'igbo',
    'zul': 'zulu',
    'zu': 'zulu',
    'xho': 'xhosa',
    'xh': 'xhosa',
  };

  return languageMap[cleaned] || cleaned;
}

function mapToRadioStation(dbStation: any): RadioStation {
  return {
    id: dbStation.station_id,
    name: dbStation.name || dbStation.station_name || 'Unknown Station',
    frequency: dbStation.frequency_khz ? parseFloat(dbStation.frequency_khz) : 0,
    band: dbStation.band_type || 'FM',
    city: dbStation.city_name || '',
    country: dbStation.country_name || '',
    streamUrl: dbStation.stream_url || '',
    homepage: dbStation.homepage || dbStation.source_url || '',
    logo: dbStation.logo_url || '',
    codec: dbStation.codec || 'MP3',
    bitrate: dbStation.bitrate || 128,
    language: dbStation.language || '',
    owner: dbStation.owner || '',
    network: dbStation.network || '',
    source_url: dbStation.source_url || '',
    licenseTier: dbStation.license_tier || 'unknown'
  };
}
