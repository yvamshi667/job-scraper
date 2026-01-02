// supabase.js

const INGEST_URL = process.env.SUPABASE_INGEST_URL;
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

// derive companies endpoint from ingest endpoint
const COMPANIES_URL = INGEST_URL.replace(
  "/ingest-jobs",
  "/get-companies"
);

export async function getCompanies() {
  const res = await fetch(COMPANIES_URL, {
    method: "GET",
    headers: {
      "x-scraper-key": SCRAPER_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`❌ Failed to fetch companies: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.companies ?? [];
}

export async function sendJobs(jobs) {
  if (!jobs.length) return;

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": SCRAPER_KEY,
    },
    body: JSON.stringify({ jobs }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`❌ Job ingest failed: ${text}`);
  }
}
