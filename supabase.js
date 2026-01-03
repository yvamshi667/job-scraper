// supabase.js
// Used ONLY by GitHub scraper
// Node 20+ uses native fetch

const COMPANIES_URL = process.env.SUPABASE_COMPANIES_URL;
const INGEST_URL = process.env.SUPABASE_INGEST_URL;
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

function assertEnv() {
  const missing = [];
  if (!COMPANIES_URL) missing.push("SUPABASE_COMPANIES_URL");
  if (!INGEST_URL) missing.push("SUPABASE_INGEST_URL");
  if (!SCRAPER_KEY) missing.push("SCRAPER_SECRET_KEY");

  if (missing.length) {
    throw new Error(`❌ Missing required env vars: ${missing.join(", ")}`);
  }
}

/**
 * Fetch active companies from Lovable edge function
 */
export async function getCompanies() {
  assertEnv();

  const res = await fetch(COMPANIES_URL, {
    headers: {
      "x-scraper-key": SCRAPER_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch companies (${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data.companies) ? data.companies : [];
}

/**
 * Send jobs in batches to ingest-jobs
 */
export async function sendJobs(jobs, batchSize = 200) {
  assertEnv();

  if (!jobs.length) {
    console.log("⚠️ No jobs to send");
    return;
  }

  console.log(`📤 Sending ${jobs.length} jobs in batches of ${batchSize}`);

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": SCRAPER_KEY,
      },
      body: JSON.stringify({ jobs: batch }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Batch failed (${res.status}):`, text);
    } else {
      console.log(`✅ Batch ${i / batchSize + 1} sent (${batch.length})`);
    }
  }
}
