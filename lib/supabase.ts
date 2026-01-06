
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hzdrvfwxwihkjrfeegzl.supabase.co';
const supabaseAnonKey = 'sb_publishable_G1QchDCBLlfNt-AMpX7XpA_ZRS70SDp';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
