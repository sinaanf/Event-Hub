import { supabase } from "./supabase";
import { logger } from "./logger";

const MIGRATION_SQL = `
-- Run this in your Supabase SQL editor if tables do not exist:

CREATE TABLE IF NOT EXISTS pipeline_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_linkedin TEXT,
  session_title TEXT,
  fit_reason TEXT,
  why_now TEXT,
  sponsorship_angle TEXT,
  generated_email TEXT,
  generated_subject TEXT,
  event_name TEXT,
  event_location TEXT,
  stage TEXT DEFAULT 'Identified',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sinoo_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_name TEXT,
  event_sector TEXT,
  icp TEXT,
  sponsorship_packages TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function runMigrations(): Promise<void> {
  if (!supabase) {
    logger.warn("Supabase not configured — skipping migration check");
    return;
  }

  const checks = [
    supabase.from("pipeline_prospects").select("id").limit(1),
    supabase.from("sinoo_profile").select("id").limit(1),
  ];

  const results = await Promise.all(checks);
  function isMissingTable(r: (typeof results)[number]) {
    if (!r.error) return false;
    const code = (r.error as { code?: string }).code;
    const msg = r.error.message.toLowerCase();
    return (
      code === "PGRST205" ||
      code === "42P01" ||
      msg.includes("does not exist") ||
      msg.includes("could not find the table")
    );
  }

  const missing = results.some(isMissingTable);

  if (missing) {
    logger.error(
      "Supabase tables not found. Please run the following SQL in your Supabase SQL editor:\n" +
        MIGRATION_SQL,
    );
  } else {
    const realErrors = results.filter((r) => r.error && !isMissingTable(r));
    if (realErrors.length) {
      realErrors.forEach((r) =>
        logger.warn({ error: r.error }, "Supabase table check warning"),
      );
    } else {
      logger.info("Supabase tables verified successfully");
    }
  }
}
