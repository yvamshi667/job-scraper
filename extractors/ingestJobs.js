// extractors/ingestJobs.js
import { ingestJobs as sendToSupabase } from "../supabase.js";

/**
 * Wrapper so scraper stays clean
 */
export async function ingestJobs(jobs) {
  await sendToSupabase(jobs);
}
