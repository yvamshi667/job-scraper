import fetch from "node-fetch";

/**
 * ENV VARS (from GitHub Actions secrets)
 */
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

/**
 * Edge Function endpoint
 */
const INGEST_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

/**
 * Fetch active companies from Supabase
 */
export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "⚠️ Supabase env vars missing (SUPABASE_URL / SUPABASE_ANON_KEY). Returning empty companies list."
    );
    return [];
  }

  const url = `${SUPABASE_URL}/rest/v1/companies?active=eq.true`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch companies: ${text}`);
  }

  return await res.json();
}

/**
 * Send jobs to Supabase Edge Function (batched + deduped)
 */
export async function sendJobs(jobs = []) {
  if (!INGEST_ENDPOINT || !SCRAPER_SECRET_KEY) {
    console.warn(
      "⚠️ Missing INGEST_ENDPOINT or SCRAPER_SECRET_KEY. Skipping job ingestion."
    );
    return;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ No jobs to send.");
    return;
  }

  /**
   * Deduplicate by fingerprint (critical fix)
   */
  const uniqueMap = new Map();
  for (const job of jobs) {
    if (!job?.fingerprint) continue;
    uniqueMap.set(job.fingerprint, job);
  }

  const uniqueJobs = Array.from(uniqueMap.values());

  console.log(
    `🧹 Deduplicated jobs: ${jobs.length} → ${uniqueJobs.length}`
  );

  const BATCH_SIZE = 200;
  console.log(`🚀 Sending ${uniqueJobs.length} jobs in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < uniqueJobs.length; i += BATCH_SIZE) {
    const batch = uniqueJobs.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(INGEST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-key": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify({ jobs: batch }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed:`, text);
        break;
      }

      console.log(
        `✅ Batch ${i / BATCH_SIZE + 1} sent (${batch.length} jobs)`
      );
    } catch (err) {
      console.error(`❌ Error sending batch ${i / BATCH_SIZE + 1}:`, err);
      break;
    }
  }

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
}
