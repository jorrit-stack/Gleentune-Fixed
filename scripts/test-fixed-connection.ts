import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConnection() {
  console.log('Testing connection to:', process.env.VITE_SUPABASE_URL);

  const { data, error } = await supabase
    .from('radio_stations')
    .select('count', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }

  console.log('✅ Connection successful!');
  console.log('Total stations:', data);
}

testConnection();
