import { supabase } from "../supabase.js";

const BATCH_SIZE = 200;

export async function ingestJobs(jobs) {
  if (!jobs.length) return;

  // 🔥 Deduplicate by job_url
  const unique = new Map();
  for (const job of jobs) {
    unique.set(job.job_url, job);
  }

  const dedupedJobs = [...unique.values()];

  for (let i = 0; i < dedupedJobs.length; i += BATCH_SIZE) {
    const batch = dedupedJobs.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from("jobs")
      .insert(batch, {
        onConflict: "job_url",
        ignoreDuplicates: true
      });

    if (error) {
      console.error("❌ Job ingest failed:", error.message);
    }
  }
}
