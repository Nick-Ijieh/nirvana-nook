/**
 * Supabase project credentials.
 *
 * Replace the two placeholder values below with your own, from
 * Supabase Dashboard -> Project Settings -> Data API (for the URL)
 * and -> API Keys (for the anon public key).
 *
 * It is safe for these to be visible in your website's code — the
 * anon key only allows the specific, limited actions we set up
 * (checking availability, submitting a booking). Never put your
 * "service_role" key here or anywhere in your website's files.
 */
const SUPABASE_URL = "YOUR_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "YOUR_ANON_PUBLIC_KEY_HERE";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
