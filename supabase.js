// supabase.js
import fetch from "node-fetch";

/**
 * Environment variables (GitHub Actions / local)
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
 * Fetch active companies
 */
export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "⚠️ Supabase env vars missing (SUPABASE_URL / SUPABASE_ANON_KEY). Returning empty companies."
    );
    return [];
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?active=eq.true`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    console.error("❌ Failed to fetch companies:", await res.text());
    return [];
  }

  return await res.json();
}

/**
 * Send jobs to ingest-jobs Edge Function (batched)
 */
export async function sendJobs(jobs = []) {
  if (!INGEST_ENDPOINT || !SCRAPER_SECRET_KEY) {
    console.warn(
      "⚠️ Missing INGEST_ENDPOINT or SCRAPER_SECRET_KEY. Skipping sendJobs."
    );
    return;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ No jobs to send.");
    return;
  }

  console.log(`🚀 Sending ${jobs.length} jobs in batches of 200`);

  const BATCH_SIZE = 200;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

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
        console.error(
          `❌ Batch ${i / BATCH_SIZE + 1} failed:`,
          await res.text()
        );
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
