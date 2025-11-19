const countries = [
  { code: 'IN', name: 'India' },
  { code: 'KR', name: 'South Korea' },
  { code: 'AU', name: 'Australia' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'US', name: 'United States' },
  { code: 'RU', name: 'Russia' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
];

async function checkCountry(countryCode: string, countryName: string) {
  try {
    const response = await fetch(
      `https://de1.api.radio-browser.info/json/stations/search?countrycode=${countryCode}&has_geo_info=true&limit=5000`
    );

    if (!response.ok) {
      console.log(`${countryName} (${countryCode}): API error`);
      return;
    }

    const data = await response.json();

    const fmCount = data.filter((s: any) => {
      const combined = `${s.name} ${s.tags}`.toLowerCase();
      return combined.includes('fm') || (s.name.match(/\d{2,3}\.\d/) !== null);
    }).length;

    const amCount = data.filter((s: any) => {
      const combined = `${s.name} ${s.tags}`.toLowerCase();
      return combined.includes('am') || combined.includes('khz');
    }).length;

    console.log(`${countryName.padEnd(20)} (${countryCode}): ${data.length.toString().padStart(4)} total | ${fmCount.toString().padStart(4)} FM | ${amCount.toString().padStart(4)} AM`);
  } catch (error) {
    console.log(`${countryName} (${countryCode}): Error - ${error}`);
  }
}

async function main() {
  console.log('\n=== RadioBrowser Station Availability by Country ===\n');
  console.log('(Stations with geographic coordinates only)\n');

  for (const country of countries) {
    await checkCountry(country.code, country.name);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

main();
