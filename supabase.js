import fetch from "node-fetch";

const SUPABASE_INGEST_URL = process.env.SUPABASE_INGEST_URL;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

if (!SUPABASE_INGEST_URL || !SCRAPER_SECRET_KEY) {
  throw new Error("Supabase env vars missing");
}

const BATCH_SIZE = 200;

/**
 * Deduplicate jobs by fingerprint
 */
function dedupeJobs(jobs) {
  const map = new Map();
  for (const job of jobs) {
    if (!job.fingerprint) continue;
    map.set(job.fingerprint, job);
  }
  return [...map.values()];
}

/**
 * Deduplicate inside a batch (CRITICAL)
 */
function dedupeBatch(batch) {
  const seen = new Set();
  return batch.filter(job => {
    if (seen.has(job.fingerprint)) return false;
    seen.add(job.fingerprint);
    return true;
  });
}

export async function sendJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("⚠️ No jobs to send");
    return;
  }

  console.log(`📦 Raw jobs received: ${jobs.length}`);

  // 🔒 GLOBAL DEDUPE
  const dedupedJobs = dedupeJobs(jobs);
  console.log(`🧹 After global dedupe: ${dedupedJobs.length}`);

  const totalBatches = Math.ceil(dedupedJobs.length / BATCH_SIZE);

  for (let i = 0; i < dedupedJobs.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

    // 🔒 BATCH DEDUPE (THIS FIXES YOUR ERROR)
    const rawBatch = dedupedJobs.slice(i, i + BATCH_SIZE);
    const batch = dedupeBatch(rawBatch);

    if (batch.length === 0) {
      console.warn(`⚠️ Batch ${batchIndex} empty after dedupe, skipping`);
      continue;
    }

    try {
      const res = await fetch(SUPABASE_INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-key": SCRAPER_SECRET_KEY
        },
        body: JSON.stringify({ jobs: batch })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(JSON.stringify(json));
      }

      console.log(
        `✅ Batch ${batchIndex}/${totalBatches} sent`,
        json
      );
    } catch (err) {
      console.error(
        `❌ Batch ${batchIndex}/${totalBatches} failed`,
        err.message
      );
    }
  }

  console.log("🎉 Job sending completed");
}
