import { createClient } from '@supabase/supabase-js';
import { config } from './config';

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);
