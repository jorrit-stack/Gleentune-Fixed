import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

console.log('🔧 Testing database connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: List tables
    console.log('\n📋 Test 1: Checking available tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('radio_stations')
      .select('id')
      .limit(1);

    if (tablesError) {
      console.error('❌ Error accessing radio_stations:', tablesError.message);
    } else {
      console.log('✓ Successfully connected to radio_stations table');
    }

    // Test 2: Count stations
    console.log('\n📊 Test 2: Counting stations...');
    const { count, error: countError } = await supabase
      .from('radio_stations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting stations:', countError.message);
    } else {
      console.log(`✓ Found ${count} radio stations in database`);
    }

    // Test 3: Sample query
    console.log('\n🎵 Test 3: Fetching sample stations...');
    const { data: stations, error: stationsError } = await supabase
      .from('radio_stations')
      .select('id, station_name, city, country, band, frequency')
      .limit(5);

    if (stationsError) {
      console.error('❌ Error fetching stations:', stationsError.message);
    } else {
      console.log(`✓ Retrieved ${stations?.length || 0} sample stations:`);
      stations?.forEach(s => {
        console.log(`  • ${s.station_name} (${s.city}, ${s.country}) - ${s.band} ${s.frequency}`);
      });
    }

    console.log('\n✅ DATABASE CONNECTION TEST COMPLETE!');

  } catch (err) {
    console.error('\n❌ UNEXPECTED ERROR:', err);
    process.exit(1);
  }
}

testConnection();
