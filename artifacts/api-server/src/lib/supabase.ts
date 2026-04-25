import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (url && key) {
  client = createClient(url, key);
} else {
  logger.warn("SUPABASE_URL or SUPABASE_ANON_KEY not set — Supabase disabled");
}

export const supabase = client;
