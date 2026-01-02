// extractors/supabase.js

const COMPANIES_URL =
  `${process.env.SUPABASE_URL}/functions/v1/get-companies`;

const INGEST_URL = process.env.SUPABASE_INGEST_URL;
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

function requireEnv() {
  const missing = [];
  if (!COMPANIES_URL) missing.push("SUPABASE_URL");
  if (!INGEST_URL) missing.push("SUPABASE_INGEST_URL");
  if (!SCRAPER_KEY) missing.push("SCRAPER_SECRET_KEY");

  if (missing.length) {
    console.error("❌ Missing required env vars:", missing.join(", "));
    process.exit(1);
  }
}

export async function getCompanies() {
  requireEnv();

  const res = await fetch(COMPANIES_URL, {
    headers: {
      "x-scraper-key": SCRAPER_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch companies: ${res.status}`);
  }

  const json = await res.json();
  return json.companies || [];
}

export async function sendJobs(jobs) {
  if (!jobs.length) return;

  await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": SCRAPER_KEY,
    },
    body: JSON.stringify({ jobs }),
  });
}
