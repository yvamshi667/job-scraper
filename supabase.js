import fetch from "node-fetch";

/**
 * ENV
 */
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const WEBHOOK_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

/**
 * FETCH ACTIVE COMPANIES
 */
export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "⚠️ Supabase env vars missing. Returning empty companies list."
    );
    return [];
  }

  const url = `${SUPABASE_URL}/rest/v1/companies?active=eq.true`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch companies: ${text}`);
  }

  return res.json();
}

/**
 * SEND JOBS TO SUPABASE (DEDUPED + BATCHED)
 */
export async function sendJobs(jobs) {
  if (!WEBHOOK_URL || !SCRAPER_SECRET_KEY) {
    console.warn("⚠️ Missing webhook or secret key. Skipping send.");
    return;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("ℹ️ No jobs to send.");
    return;
  }

  /**
   * 🔑 GLOBAL DEDUPLICATION BY external_id
   */
  const uniqueJobsMap = new Map();

  for (const job of jobs) {
    if (!job.external_id) continue;
    uniqueJobsMap.set(job.external_id, job);
  }

  const uniqueJobs = Array.from(uniqueJobsMap.values());

  console.log(
    `🧹 Deduplicated jobs: ${jobs.length} → ${uniqueJobs.length}`
  );

  const BATCH_SIZE = 200;

  for (let i = 0; i < uniqueJobs.length; i += BATCH_SIZE) {
    const batch = uniqueJobs.slice(i, i + BATCH_SIZE);

    /**
     * 🔑 SAFETY: Ensure no duplicates inside batch
     */
    const batchMap = new Map();
    for (const job of batch) {
      batchMap.set(job.external_id, job);
    }

    const cleanBatch = Array.from(batchMap.values());

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": SCRAPER_SECRET_KEY,
      },
      body: JSON.stringify({ jobs: cleanBatch }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Failed batch ${i / BATCH_SIZE + 1}:`, err);
      return;
    }

    console.log(
      `✅ Sent batch ${i / BATCH_SIZE + 1} (${cleanBatch.length} jobs)`
    );
  }

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
}
