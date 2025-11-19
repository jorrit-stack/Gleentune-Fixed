import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

async function testRadioRefresh() {
  console.log('🧪 Testing Radio Weekly Refresh Edge Function...\n');

  const url = `${SUPABASE_URL}/functions/v1/radio-weekly-refresh`;

  console.log(`📡 Calling: ${url}\n`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    console.log('📊 Response:\n');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Sync completed successfully!');
      console.log('\n📈 Summary:');
      for (const [region, stats] of Object.entries(data.results)) {
        console.log(`  ${region}: ${stats.synced} synced (${stats.inserted} new, ${stats.updated} updated, ${stats.errors} errors)`);
      }
    } else {
      console.error('\n❌ Sync failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
    process.exit(1);
  }
}

testRadioRefresh();
