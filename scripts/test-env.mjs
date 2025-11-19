import 'dotenv/config';

console.log('URL:', process.env.VITE_SUPABASE_URL);
console.log('Service key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Service key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
