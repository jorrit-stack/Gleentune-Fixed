import { enrichStationWithStream } from '../src/services/streamMatcher';

async function testCuratedMatching() {
  console.log('🧪 Testing 3-Tier Stream Matching System\n');
  console.log('Priority: 1. Curated DB → 2. Radio Browser API → 3. None\n');

  const testStations = [
    {
      id: 'test1',
      name: 'Radio Indigo Bangalore',
      country: 'India',
      country_code: 'IN',
      city: 'Bangalore',
      frequency: 91900,
      band_type: 'FM' as const,
      stream_url: 'https://placeholder-stream.example.com',
      tags: [],
      bitrate: 128,
      codec: 'MP3',
      language: 'english',
      created_at: new Date().toISOString(),
      last_check_ok: false
    },
    {
      id: 'test2',
      name: 'BIG FM Bangalore',
      country: 'India',
      country_code: 'IN',
      city: 'Bangalore',
      frequency: 92700,
      band_type: 'FM' as const,
      stream_url: 'https://placeholder-stream.example.com',
      tags: [],
      bitrate: 128,
      codec: 'MP3',
      language: 'hindi',
      created_at: new Date().toISOString(),
      last_check_ok: false
    },
    {
      id: 'test3',
      name: 'Radio Mirchi Delhi',
      country: 'India',
      country_code: 'IN',
      city: 'Delhi',
      frequency: 98300,
      band_type: 'FM' as const,
      stream_url: 'https://placeholder-stream.example.com',
      tags: [],
      bitrate: 128,
      codec: 'MP3',
      language: 'hindi',
      created_at: new Date().toISOString(),
      last_check_ok: false
    }
  ];

  console.log('Testing stations:\n');

  for (const station of testStations) {
    console.log(`📻 ${station.name} (${station.frequency / 1000} MHz)`);
    console.log(`   City: ${station.city}`);
    console.log(`   Before: ❌ No stream`);

    const enriched = await enrichStationWithStream(station);

    if (enriched.stream_url !== station.stream_url && !enriched.stream_url.includes('placeholder')) {
      console.log(`   After:  ✅ ${enriched.stream_url.substring(0, 70)}...`);
      console.log(`   Source: ${enriched.stream_url.includes('asurahosting') ? '🎯 CURATED DB' : '🌐 Radio Browser API'}\n`);
    } else {
      console.log(`   After:  ❌ No match found\n`);
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

testCuratedMatching().catch(console.error);
