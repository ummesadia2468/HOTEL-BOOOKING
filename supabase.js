// Supabase client setup.
// Paste your values from Supabase > Project Settings > API.
// Use ONLY the anon/public key here. NEVER put the service_role key in frontend code.
const SUPABASE_URL = "https://xghnpusgraadnqdzgxxo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaG5wdXNncmFhZG5xZHpneHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1Mzk0NDEsImV4cCI6MjEwNzExNTQ0MX0.WdOM3Jzwk0oGia-dZ_Gp5-sGS2hsJHCt1UNUlft1vA0";

// "supabase" comes from the CDN script loaded in index.html.
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
