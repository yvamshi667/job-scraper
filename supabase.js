import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const INGEST_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

const BATCH_SIZE = 200;

/**
 * Fetch active companies from Supabase
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
    console.error("❌ Failed to fetch companies:", text);
    return [];
  }

  return res.json();
}

/**
 * Send jobs to Supabase Edge Function in safe batches
 */
export async function sendJobs(jobs) {
  if (!INGEST_ENDPOINT || !SCRAPER_SECRET_KEY) {
    console.warn(
      "⚠️ Missing INGEST endpoint or SCRAPER_SECRET_KEY. Skipping sendJobs."
    );
    return;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("ℹ️ No jobs to send.");
    return;
  }

  // 🔥 Deduplicate BEFORE sending (prevents ON CONFLICT error)
  const uniqueJobsMap = new Map();
  for (const job of jobs) {
    if (job.fingerprint) {
      uniqueJobsMap.set(job.fingerprint, job);
    }
  }

  const uniqueJobs = Array.from(uniqueJobsMap.values());

  console.log(
    `🚀 Sending ${uniqueJobs.length} jobs in batches of ${BATCH_SIZE}`
  );

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
        return;
      }

      console.log(
        `✅ Sent batch ${i / BATCH_SIZE + 1} (${batch.length} jobs)`
      );
    } catch (err) {
      console.error("❌ Error sending batch:", err);
      return;
    }
  }

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
}
