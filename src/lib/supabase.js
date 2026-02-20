import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug (temporal)
console.log("URL:", supabaseUrl);
console.log("KEY:", supabaseKey ? supabaseKey.slice(0, 12) + "..." : supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Faltan variables .env: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
