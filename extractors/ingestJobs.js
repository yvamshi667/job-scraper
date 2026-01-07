import supabase from "../supabase.js";

export async function ingestJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("⚠️ No jobs to ingest");
    return;
  }

  console.log(`📥 Ingesting ${jobs.length} jobs...`);

  const { error } = await supabase
    .from("jobs")
    .upsert(jobs, {
      onConflict: "url",
    });

  if (error) {
    console.error("❌ Supabase ingest failed:", error.message);
    throw error;
  }

  console.log("✅ Jobs ingested successfully");
}
