// extractors/ingestJobs.js
import { supabase } from "../supabase.js";

export async function ingestJobs(jobs) {
  if (!jobs || jobs.length === 0) {
    console.log("⚠️ No jobs to ingest");
    return;
  }

  console.log(`📥 Ingesting ${jobs.length} jobs into Supabase...`);

  const { error } = await supabase
    .from("jobs")
    .upsert(jobs, {
      onConflict: "url",
      ignoreDuplicates: false,
    });

  if (error) {
    console.error("❌ Supabase insert failed:", error.message);
  } else {
    console.log("✅ Jobs ingested successfully");
  }
}
