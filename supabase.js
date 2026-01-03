// supabase.js
// Uses ONLY SUPABASE_FUNCTIONS_BASE_URL + SCRAPER_SECRET_KEY
// Node 20 has native fetch

const BASE_URL = process.env.SUPABASE_FUNCTIONS_BASE_URL;
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

function assertEnv() {
  const missing = [];
  if (!BASE_URL) missing.push("SUPABASE_FUNCTIONS_BASE_URL");
  if (!SCRAPER_KEY) missing.push("SCRAPER_SECRET_KEY");

  if (missing.length) {
    throw new Error(`❌ Missing required env vars: ${missing.join(", ")}`);
  }
}

const COMPANIES_URL = `${BASE_URL}/get-companies`;
const INGEST_URL = `${BASE_URL}/ingest-jobs`;

export async function getCompanies() {
  assertEnv();

  const res = await fetch(COMPANIES_URL, {
    headers: {
      "x-scraper-key": SCRAPER_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch companies (${res.status}): ${text}`);
  }

  const data = await res.json();
  return Array.isArray(data.companies) ? data.companies : [];
}

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
