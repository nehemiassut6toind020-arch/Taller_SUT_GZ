// js/supabaseClient.js

const SUPABASE_URL = 'https://ddngylnipjjynxcueccs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KryH6rLOaNIUO-Cv6WCYeg_yLzdpFCm';

// Cambiamos 'supabase' por 'supabaseClient' para evitar colisión de nombres
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);