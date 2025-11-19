export interface CuratedStream {
  stationName: string;
  frequency?: number;
  city?: string;
  streamUrl: string;
  source: string;
  verified: boolean;
}

export const curatedStreams: CuratedStream[] = [
  {
    stationName: "Radio Indigo",
    frequency: 91.9,
    city: "Bangalore",
    streamUrl: "https://a2.asurahosting.com/hls/office_radio/live.m3u8",
    source: "onlineradiofm.in",
    verified: true
  },
  {
    stationName: "Radio Indigo",
    frequency: 91.9,
    city: "Goa",
    streamUrl: "https://a2.asurahosting.com/hls/office_radio/live.m3u8",
    source: "onlineradiofm.in",
    verified: true
  },
  {
    stationName: "Radio City",
    frequency: 91.1,
    city: "Bangalore",
    streamUrl: "https://prclive4.listenon.in/",
    source: "official",
    verified: true
  },
  {
    stationName: "Red FM",
    frequency: 93.5,
    city: "Bangalore",
    streamUrl: "https://stream-175.zeno.fm/q97eczydqrhvv",
    source: "radiobrowser",
    verified: true
  },
  {
    stationName: "Radio Mirchi",
    frequency: 98.3,
    city: "Bangalore",
    streamUrl: "https://14983.live.streamtheworld.com/RADIO_SUNO_MELODY_S06.mp3",
    source: "radiobrowser",
    verified: true
  },
  {
    stationName: "Fever FM",
    frequency: 104,
    city: "Bangalore",
    streamUrl: "https://stream-148.zeno.fm/sp2xj4w3mqruv",
    source: "zeno.fm",
    verified: true
  },
  {
    stationName: "AIR Bangalore",
    frequency: 612,
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio026/playlist.m3u8",
    source: "air.pc",
    verified: true
  },
  {
    stationName: "Vividh Bharati Bangalore",
    frequency: 102.9,
    city: "Bangalore",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio024/playlist.m3u8",
    source: "air.pc",
    verified: true
  },
  {
    stationName: "Radio Mirchi",
    frequency: 98.3,
    city: "Mumbai",
    streamUrl: "https://mirchiplaylive.akamaized.net/hls/live/2036929-b/MUM/MIRCHI_Auto.m3u8",
    source: "official",
    verified: true
  },
  {
    stationName: "Radio Mirchi",
    frequency: 98.3,
    city: "Delhi",
    streamUrl: "https://mirchiplaylive.akamaized.net/hls/live/2036929-b/DEL/MIRCHI_Auto.m3u8",
    source: "official",
    verified: true
  },
  {
    stationName: "Radio City",
    frequency: 91.1,
    city: "Mumbai",
    streamUrl: "https://prclive1.listenon.in/",
    source: "official",
    verified: true
  },
  {
    stationName: "Radio City",
    frequency: 91.1,
    city: "Delhi",
    streamUrl: "https://prclive2.listenon.in/",
    source: "official",
    verified: true
  },
  {
    stationName: "BIG FM",
    frequency: 92.7,
    city: "Mumbai",
    streamUrl: "https://stream-162.zeno.fm/6c8gnf4wv4zuv",
    source: "zeno.fm",
    verified: true
  },
  {
    stationName: "BIG FM",
    frequency: 92.7,
    city: "Delhi",
    streamUrl: "https://stream-162.zeno.fm/0yfhqzrm4qruv",
    source: "zeno.fm",
    verified: true
  },
  {
    stationName: "Red FM",
    frequency: 93.5,
    city: "Mumbai",
    streamUrl: "https://stream-144.zeno.fm/zqpf6k8q8chvv",
    source: "zeno.fm",
    verified: true
  },
  {
    stationName: "Red FM",
    frequency: 93.5,
    city: "Delhi",
    streamUrl: "https://stream-144.zeno.fm/3fxd5k8q8chvv",
    source: "zeno.fm",
    verified: true
  },
  {
    stationName: "AIR Delhi",
    frequency: 90.4,
    city: "Delhi",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "FM Gold Delhi",
    frequency: 100.1,
    city: "Delhi",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio007/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "AIR FM Rainbow Delhi",
    frequency: 102.6,
    city: "Delhi",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio177/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "Gyan Vani Delhi",
    frequency: 105.6,
    city: "Delhi",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio182/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "Vividh Bharati Delhi",
    frequency: 106.4,
    city: "Delhi",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio005/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "Gyan Vani Mumbai",
    frequency: 105.6,
    city: "Mumbai",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio180/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "Radio Gyan Vani Bangalore",
    frequency: 105.6,
    city: "Bangalore",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio181/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "FM Gold Chennai",
    frequency: 100.1,
    city: "Chennai",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio009/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "Vividh Bharati Chennai",
    frequency: 100.5,
    city: "Chennai",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio008/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "Gyan Vani Chennai",
    frequency: 104.2,
    city: "Chennai",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio183/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "Vividh Bharati Kolkata",
    frequency: 101.8,
    city: "Kolkata",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio006/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  },
  {
    stationName: "Radio Gyan Vani Kolkata",
    frequency: 105.4,
    city: "Kolkata",
    streamUrl: "https://air.pc.cdn.bitgravity.com/air/live/pbaudio179/playlist.m3u8",
    source: "air.pc (Prasar Bharati - Public Domain)",
    verified: true
  }
];

export function findCuratedStream(stationName: string, city?: string, frequency?: number): CuratedStream | null {
  const normalizedName = stationName.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedCity = city?.toLowerCase().replace(/\s+/g, ' ').trim();

  console.log(`[CURATED] Searching: "${stationName}", city: "${city}", freq: ${frequency}`);

  for (const stream of curatedStreams) {
    const streamNameMatch = stream.stationName.toLowerCase().includes(normalizedName) ||
                           normalizedName.includes(stream.stationName.toLowerCase());

    if (!streamNameMatch) continue;

    console.log(`[CURATED] Potential match: ${stream.stationName} (${stream.city}, ${stream.frequency}MHz)`);

    if (city && stream.city) {
      const cityMatch = normalizedCity === stream.city.toLowerCase().replace(/\s+/g, ' ').trim();
      console.log(`[CURATED] City check: "${normalizedCity}" vs "${stream.city.toLowerCase()}" = ${cityMatch}`);
      if (cityMatch) {
        console.log(`[CURATED] ✓ Match found!`);
        return stream;
      }
    }

    if (frequency && stream.frequency) {
      const diff = Math.abs(stream.frequency - frequency);
      console.log(`[CURATED] Frequency check: ${frequency} vs ${stream.frequency}, diff: ${diff}`);
      if (diff < 0.2) {
        console.log(`[CURATED] ✓ Match found!`);
        return stream;
      }
    }

    if (!stream.city && !stream.frequency) {
      console.log(`[CURATED] ✓ Generic match found!`);
      return stream;
    }
  }

  console.log(`[CURATED] ✗ No match found`);
  return null;
}
