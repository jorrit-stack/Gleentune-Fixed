import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl || '(missing)');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'present' : '(missing)');
  throw new Error('Missing Supabase environment variables. Please check your .env file has VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

// Create client with service_role key for admin operations
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
