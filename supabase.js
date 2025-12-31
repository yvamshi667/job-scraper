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
      "⚠️ Supabase env vars missing (SUPABASE_URL / SUPABASE_ANON_KEY). Returning empty companies list."
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
 * SEND JOBS TO SUPABASE (BATCHED – FIXES WORKER_LIMIT)
 */
export async function sendJobs(jobs) {
  if (!WEBHOOK_URL || !SCRAPER_SECRET_KEY) {
    console.warn(
      "⚠️ Missing WEBHOOK_URL or SCRAPER_SECRET_KEY. Skipping job ingestion."
    );
    return;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("ℹ️ No jobs to send.");
    return;
  }

  const BATCH_SIZE = 200;

  console.log(`🚀 Sending ${jobs.length} jobs in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": SCRAPER_SECRET_KEY,
      },
      body: JSON.stringify({ jobs: batch }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `❌ Failed batch ${i / BATCH_SIZE + 1}:`,
        errText
      );
      return;
    }

    console.log(
      `✅ Sent batch ${i / BATCH_SIZE + 1} (${batch.length} jobs)`
    );
  }

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
}
