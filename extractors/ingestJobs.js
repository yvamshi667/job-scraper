// extractors/ingestJobs.js
import { ingestJobs as send } from "../supabase.js";

export async function ingestJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("⚠️ No jobs to ingest");
    return;
  }

  console.log(`📤 Sending ${jobs.length} jobs to Supabase`);
  await send(jobs);
}
