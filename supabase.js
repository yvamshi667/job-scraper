// extractors/supabase.js
import fetch from "node-fetch";

const {
  SUPABASE_URL,
  SUPABASE_INGEST_URL,
  SUPABASE_COMPANIES_URL,
  SCRAPER_SECRET_KEY,
} = process.env;

// Hard validation (clear + final)
const missing = [];
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_INGEST_URL) missing.push("SUPABASE_INGEST_URL");
if (!SUPABASE_COMPANIES_URL) missing.push("SUPABASE_COMPANIES_URL");
if (!SCRAPER_SECRET_KEY) missing.push("SCRAPER_SECRET_KEY");

if (missing.length > 0) {
  console.error("❌ Missing required env vars:", missing.join(", "));
  process.exit(1);
}

/**
 * Fetch active companies from Lovable Edge Function
 */
export async function getCompanies() {
  const res = await fetch(SUPABASE_COMPANIES_URL, {
    headers: {
      "x-scraper-key": SCRAPER_SECRET_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch companies (${res.status})`);
  }

  const data = await res.json();
  return data.companies || [];
}

/**
 * Send jobs to ingest-jobs Edge Function (batched)
 */
export async function sendJobs(jobs) {
  if (!jobs || jobs.length === 0) {
    console.log("⚠️ No jobs to send");
    return;
  }

  const BATCH_SIZE = 200;
  let sent = 0;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    const res = await fetch(SUPABASE_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": SCRAPER_SECRET_KEY,
      },
      body: JSON.stringify({ jobs: batch }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`❌ Batch failed (${res.status}):`, txt);
      continue;
    }

    sent += batch.length;
    console.log(`✅ Sent batch of ${batch.length}`);
  }

  console.log(`🎉 TOTAL jobs sent: ${sent}`);
}
