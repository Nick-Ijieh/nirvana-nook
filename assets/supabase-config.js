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
const SUPABASE_URL = "https://ueyyzshhqizcgnzleigg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleXl6c2hocWl6Y2duemxlaWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NjI3MzcsImV4cCI6MjEwMDAzODczN30.9Vk_DAjjqdqRyHKA-68fwzjQhZomijARiqyqfKWz5Jo";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
