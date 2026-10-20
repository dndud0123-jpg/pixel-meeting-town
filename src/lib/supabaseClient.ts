import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Fallback demo credentials or user-provided keys via localStorage or import.meta.env
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const storageUrl = typeof window !== 'undefined' ? localStorage.getItem('pkmn_sb_url') : null;
  const storageKey = typeof window !== 'undefined' ? localStorage.getItem('pkmn_sb_key') : null;

  const url = storageUrl || envUrl || 'https://demo-placeholder.supabase.co';
  const anonKey = storageKey || envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demo-placeholder-key';

  const isConfigured = Boolean((storageUrl && storageKey) || (envUrl && envKey));

  return { url, anonKey, isConfigured };
};

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const getSupabaseClient = (): { client: SupabaseClient; isConfigured: boolean } => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!cachedClient || lastUsedUrl !== url || lastUsedKey !== anonKey) {
    cachedClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
  }

  return { client: cachedClient, isConfigured };
};

export const saveCustomSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pkmn_sb_url', url.trim());
    localStorage.setItem('pkmn_sb_key', key.trim());
    cachedClient = null; // reset cached client
  }
};
