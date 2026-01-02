// supabase.js
import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

// Lovable ingest function
const SUPABASE_INGEST_URL = `${SUPABASE_URL}/functions/v1/ingest-jobs`;

/**
 * Fetch active companies from Supabase
 */
export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("⚠️ Supabase creds missing — returning empty companies list");
    return [];
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?active=eq.true`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    console.error("❌ Failed to fetch companies:", await res.text());
    return [];
  }

  return res.json();
}

/**
 * Send jobs to Lovable ingest function in batches
 */
export async function sendJobs(jobs) {
  if (!SUPABASE_INGEST_URL || !SCRAPER_SECRET_KEY) {
    console.warn("⚠️ WEBHOOK or SECRET missing — skipping ingestion");
    return;
  }

  const BATCH_SIZE = 200;
  console.log(`📦 Sending ${jobs.length} jobs in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(SUPABASE_INGEST_URL, {
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
      } else {
        console.log(`✅ Batch ${i / BATCH_SIZE + 1} ingested`);
      }
    } catch (err) {
      console.error("❌ Network error:", err.message);
    }
  }
}
