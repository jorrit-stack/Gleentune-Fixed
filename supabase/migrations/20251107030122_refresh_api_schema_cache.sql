/*
  # Refresh API Schema Cache
  
  This migration forces Supabase to reload its REST API schema cache
  by sending a notification that triggers the cache refresh.
*/

NOTIFY pgrst, 'reload schema';
